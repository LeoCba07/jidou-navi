// Add Machine screen
import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  TextInput,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import * as FileSystem from 'expo-file-system';
import { useTranslation } from 'react-i18next';
import { supabase } from '../src/lib/supabase';
import { Sentry } from '../src/lib/sentry';
import { useAuthStore } from '../src/store/authStore';
import { useUIStore } from '../src/store/uiStore';
import { checkAndAwardBadges } from '../src/lib/badges';
import { addXP, XP_VALUES } from '../src/lib/xp';
import { uploadPhoto } from '../src/lib/storage';
import { processImage, IMAGE_LIMITS } from '../src/lib/images';
import { useAppModal } from '../src/hooks/useAppModal';
import { useToast } from '../src/hooks/useToast';
import { tryRequestAppReview } from '../src/lib/review';
import { extractGpsFromExif, GpsCoordinates } from '../src/lib/exif';
import { LocationVerificationModal } from '../src/components/LocationVerificationModal';
import { COLORS, SHADOWS, FONTS, SPACING, BORDER_RADIUS, CATEGORY_COLORS, FONT_SIZES, ICON_SIZES } from '../src/theme/constants';

const CATEGORY_ICONS: Record<string, any> = {
  eats: require('../assets/pixel-cat-eats.png'),
  gachapon: require('../assets/pixel-cat-gachapon.png'),
  weird: require('../assets/pixel-cat-weird.png'),
  retro: require('../assets/pixel-cat-retro.png'),
  'local-gems': require('../assets/pixel-cat-local-gems.png'),
};

// Category definitions with translation keys and colors (matching CategoryFilterBar)
const CATEGORIES = [
  { id: 'eats', translationKey: 'categories.eats', color: CATEGORY_COLORS.eats },
  { id: 'gachapon', translationKey: 'categories.gachapon', color: CATEGORY_COLORS.gachapon },
  { id: 'weird', translationKey: 'categories.weird', color: CATEGORY_COLORS.weird },
  { id: 'retro', translationKey: 'categories.retro', color: CATEGORY_COLORS.retro },
  { id: 'local-gems', translationKey: 'categories.localGems', color: CATEGORY_COLORS['local-gems'] },
];

// Maximum lengths for form fields
const NAME_MAX_LENGTH = 70;
const DESCRIPTION_MAX_LENGTH = 250;
const DIRECTIONS_HINT_MAX_LENGTH = 200;
const MAX_PHOTOS = 2;

interface PhotoData {
  uri: string;
  size: number;
  exifLocation?: GpsCoordinates;
}

export default function AddMachineScreen() {
  const { t } = useTranslation();
  const { user, profile } = useAuthStore();
  const showBadgePopup = useUIStore((state) => state.showBadgePopup);
  const { showError, showSuccess, showConfirm, showInfo } = useAppModal();
  const toast = useToast();
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [photos, setPhotos] = useState<PhotoData[]>([]);
  const [compressing, setCompressing] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [isManualLocation, setIsManualLocation] = useState(false);
  const [manualLat, setManualLat] = useState('');
  const [manualLng, setManualLng] = useState('');
  const [directionsHint, setDirectionsHint] = useState('');
  const [exifLocation, setExifLocation] = useState<GpsCoordinates | null>(null);
  const [showLocationVerification, setShowLocationVerification] = useState(false);
  const [locationSource, setLocationSource] = useState<'gps' | 'exif'>('gps');

  const isDev = profile?.role === 'admin';

  // Get current location on mount
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({});
          setLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
        }
      } catch (error) {
        console.warn('Error getting initial location:', error);
      }
    })();
  }, []);

  function handleRemovePhoto(index: number) {
    showConfirm(
      t('addMachine.removePhotoConfirm.title'),
      t('addMachine.removePhotoConfirm.message'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.remove'),
          style: 'destructive',
          onPress: async () => {
            const newPhotos = [...photos];
            const removedPhoto = newPhotos.splice(index, 1)[0];
            setPhotos(newPhotos);

            // If we removed the photo that provided the EXIF location, and we are not in manual mode
            if (removedPhoto.exifLocation && locationSource === 'exif') {
              const otherExifPhoto = newPhotos.find(p => p.exifLocation);
              
              if (otherExifPhoto && otherExifPhoto.exifLocation) {
                // Use location from another photo
                setLocation(otherExifPhoto.exifLocation);
                setExifLocation(otherExifPhoto.exifLocation);
              } else {
                // No more EXIF photos: fall back to GPS
                setExifLocation(null);
                setLocationSource('gps');
                
                if (!isManualLocation) {
                  try {
                    const pos = await Location.getCurrentPositionAsync({
                      accuracy: Location.Accuracy.Balanced,
                    });
                    setLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
                  } catch (error) {
                    console.warn('Failed to refresh GPS after photo removal:', error);
                    setLocation(null);
                  }
                } else {
                  setLocation(null);
                }
              }
            }

            if (newPhotos.length === 0) {
              setExifLocation(null);
              setShowLocationVerification(false);
              if (!isManualLocation) {
                setLocationSource('gps');
                // Refresh GPS to be sure
                try {
                  const pos = await Location.getCurrentPositionAsync({});
                  setLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
                } catch (e) {}
              }
            }
          },
        },
      ]
    );
  }

  async function pickImage(useCamera: boolean) {
    if (photos.length >= MAX_PHOTOS) {
      showInfo(t('modal.info'), t('addMachine.maxPhotosReached', { count: MAX_PHOTOS }));
      return;
    }

    const permission = useCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      showError(t('common.error'), t('addMachine.permissionNeeded'));
      return;
    }

    try {
      const result = useCamera 
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            quality: 1, // Get high quality for processing
            allowsEditing: true,
            aspect: [4, 3],
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            quality: 1, // Full quality for EXIF preservation and processing
            allowsMultipleSelection: true,
            selectionLimit: MAX_PHOTOS - photos.length,
            exif: true,
          });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      setCompressing(true);

      const newPhotos: PhotoData[] = [];

      for (const asset of result.assets) {
        // Try to extract GPS from EXIF before processing (processing strips EXIF)
        const gpsData = await extractGpsFromExif(asset.uri);
        
        // Process image (resize and compress)
        const processedUri = await processImage(asset.uri);

        // Get file size of processed image
        let size = 0;
        try {
          const fileInfo = await FileSystem.getInfoAsync(processedUri);
          if (fileInfo.exists) {
            size = fileInfo.size;
          }
        } catch (e) {
          console.warn('Failed to get file size via FileSystem:', e);
        }

        // Logic for EXIF: only ask/use for the first valid GPS found if we don't have one
        if (gpsData && !isManualLocation && locationSource === 'gps') {
          setExifLocation(gpsData);
          setShowLocationVerification(true);
        }

        newPhotos.push({ uri: processedUri, size, exifLocation: gpsData || undefined });
      }

      // If no EXIF was found in any of the new photos and it's the first set of photos
      if (photos.length === 0 && !newPhotos.some(p => p.exifLocation)) {
        if (location) {
          showInfo(t('modal.info'), t('addMachine.noExifDataFallback'));
        } else {
          showInfo(t('modal.info'), t('addMachine.noExifDataNoLocation'));
        }
      }

      setPhotos(prev => [...prev, ...newPhotos].slice(0, MAX_PHOTOS));

    } catch (error) {
      console.error('Image picker error:', error);
      Sentry.captureException(error, { tags: { context: 'add_machine_picker' } });
      showError(t('common.error'), t('addMachine.imageError'));
    } finally {
      setCompressing(false);
    }
  }

  function handleLocationVerificationConfirm() {
    // User confirmed EXIF location
    if (exifLocation) {
      setLocation(exifLocation);
      setLocationSource('exif');
    }
    setShowLocationVerification(false);
  }

  function handleLocationVerificationReject() {
    // User rejected EXIF location, keep current GPS location
    setExifLocation(null);
    setLocationSource('gps');
    setShowLocationVerification(false);
  }

  function toggleCategory(id: string) {
    setSelectedCategories((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  }

  async function handleSubmit() {
    if (photos.length === 0) {
      showError(t('common.error'), t('addMachine.validation.photoRequired'));
      return;
    }
    if (!name.trim()) {
      showError(t('common.error'), t('addMachine.validation.nameRequired'));
      return;
    }
    if (!description.trim()) {
      showError(t('common.error'), t('addMachine.validation.descriptionRequired'));
      return;
    }

    let finalLat = location?.latitude;
    let finalLng = location?.longitude;

    if (isManualLocation) {
      const lat = parseFloat(manualLat);
      const lng = parseFloat(manualLng);
      
      // Basic number check (must be finite numbers)
      if (isNaN(lat) || !isFinite(lat) || isNaN(lng) || !isFinite(lng)) {
        showError(t('common.error'), t('addMachine.validation.invalidCoordinates'));
        return;
      }

      // Bounds check: Lat -90 to 90, Lng -180 to 180
      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        showError(t('common.error'), t('addMachine.validation.invalidCoordinates'));
        return;
      }

      finalLat = lat;
      finalLng = lng;
    }

    if (!finalLat || !finalLng) {
      showError(t('common.error'), t('addMachine.validation.locationRequired'));
      return;
    }

    setSubmitting(true);

    try {
      // 1. Upload all photos first
      const photoUploadPromises = photos.map(async (photoData, index) => {
        if (!user) throw new Error('User not authenticated');

        const fileName = `machine_${index}_${Date.now()}.jpg`;
        
        const publicUrl = await uploadPhoto(
          user.id,
          null, // No machine ID yet
          { uri: photoData.uri, type: 'image/jpeg', name: fileName, size: photoData.size }
        );

        return {
          photo_url: publicUrl,
          is_primary: index === 0,
          status: 'active' as const,
          uploaded_by: user.id,
        };
      });

      const uploadedPhotosData = await Promise.all(photoUploadPromises);

      // 2. Insert machine record
      const { data: machine, error: insertError } = await supabase.from('machines').insert({
        name: name,
        description: description,
        latitude: finalLat,
        longitude: finalLng,
        location: `POINT(${finalLng} ${finalLat})`,
        status: 'pending',
        contributor_id: user?.id,
        directions_hint: directionsHint.trim() || null,
      }).select('id').single();

      if (insertError) {
        // Optional: Cleanup uploaded photos if machine insert fails
        // For now, we'll just throw and let the user retry
        throw insertError;
      }

      // 3. Link photos to the machine
      const photoRecords = uploadedPhotosData.map(p => ({
        ...p,
        machine_id: machine.id,
      }));

      const { error: photosError } = await supabase.from('machine_photos').insert(photoRecords);
      if (photosError) throw photosError;

      // 4. Insert selected categories
      if (selectedCategories.length > 0) {
        // Fetch category IDs from slugs
        const { data: categoryData, error: categoryFetchError } = await supabase
          .from('categories')
          .select('id, slug')
          .in('slug', selectedCategories);

        if (!categoryFetchError && categoryData && categoryData.length > 0) {
          // Insert into junction table
          const categoryInserts = categoryData.map((cat) => ({
            machine_id: machine.id,
            category_id: cat.id,
          }));

          const { error: categoriesError } = await supabase
            .from('machine_categories')
            .insert(categoryInserts);

          if (categoriesError) console.error('Categories insert error:', categoriesError);
        } else if (categoryFetchError) {
          console.error('Failed to fetch categories:', categoryFetchError);
        }
      }

      // Small delay to allow DB triggers (profile contribution counts) to complete
      await new Promise(resolve => setTimeout(resolve, 500));

      // Add XP
      const xpResult = await addXP(XP_VALUES.ADD_MACHINE, 'add_machine');
      if (!xpResult.success) {
        console.warn('Failed to award XP for add_machine:', xpResult.error);
      }

      // Check for badge unlocks (contributor badges)
      const newBadges = await checkAndAwardBadges(machine.id);

      let addSuccessMsg = t('addMachine.successPending');
      if (xpResult.success && xpResult.leveledUp) {
        addSuccessMsg = `${t('profile.levelUp', { level: xpResult.newLevel })}\n\n${addSuccessMsg}`;
      }

      if (newBadges.length > 0) {
        // Show success alert, then badge popup, then navigate back
        showSuccess(t('common.success'), addSuccessMsg, () => {
          showBadgePopup(newBadges, () => {
            tryRequestAppReview();
            router.back();
          });
        }, 'OK', XP_VALUES.ADD_MACHINE);
      } else {
        // No badges - use toast and go back
        toast.showSuccess(addSuccessMsg);
        tryRequestAppReview();
        router.back();
      }
    } catch (error: any) {
      console.error('Submit error:', error);
      Sentry.captureException(error, { tags: { context: 'add_machine_submit' } });
      showError(t('common.error'), error?.message || t('addMachine.submitError'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText} numberOfLines={1}>{t('addMachine.cancel')}</Text>
        </Pressable>
        <Text style={styles.title}>{t('addMachine.title')}</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView style={styles.content}>
        {/* Photo */}
        <View style={styles.photoSection}>
          {compressing ? (
            <View style={styles.compressingContainer}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.compressingText}>{t('addMachine.processingImage')}</Text>
            </View>
          ) : (
            <>
              {photos.map((p, index) => (
                <View key={index} style={{ marginBottom: index < photos.length - 1 ? 16 : 0 }}>
                  <Pressable onPress={() => handleRemovePhoto(index)}>
                    <Image source={{ uri: p.uri }} style={styles.photo} />
                    <Text style={styles.photoHint}>
                      {t('addMachine.tapToRemove')}
                      {index === 0 && photos.length > 1 ? ` (${t('addMachine.primary')})` : ''}
                    </Text>
                  </Pressable>
                </View>
              ))}

              {photos.length < MAX_PHOTOS && (
                <View style={[styles.photoButtons, photos.length > 0 && { marginTop: 16 }]}>
                  <Pressable style={styles.photoButton} onPress={() => pickImage(true)}>
                    <Text style={styles.photoButtonText}>
                      {photos.length > 0 ? t('addMachine.takeAnotherPhoto') : t('addMachine.takePhoto')}
                    </Text>
                  </Pressable>
                  <Pressable style={styles.photoButton} onPress={() => pickImage(false)}>
                    <Text style={styles.photoButtonText}>
                      {photos.length > 0 ? t('addMachine.chooseAnotherFromGallery') : t('addMachine.chooseFromGallery')}
                    </Text>
                  </Pressable>
                </View>
              )}
            </>
          )}
        </View>

        {/* Name */}
        <View style={styles.field}>
          <Text style={styles.label}>{t('addMachine.name')}</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={(text) => setName(text.slice(0, NAME_MAX_LENGTH))}
            placeholder={t('addMachine.namePlaceholder')}
            placeholderTextColor={COLORS.textLight}
            maxLength={NAME_MAX_LENGTH}
          />
          <Text style={styles.charCount}>{name.length}/{NAME_MAX_LENGTH}</Text>
        </View>

        {/* Categories */}
        <View style={styles.field}>
          <Text style={styles.label}>{t('addMachine.categories')}</Text>
          <View style={styles.categories}>
            {CATEGORIES.map((cat) => {
              const isSelected = selectedCategories.includes(cat.id);
              return (
                <Pressable
                  key={cat.id}
                  style={[
                    styles.categoryChip,
                    isSelected && { backgroundColor: cat.color, borderColor: cat.color },
                  ]}
                  onPress={() => toggleCategory(cat.id)}
                >
                  {CATEGORY_ICONS[cat.id] && <Image source={CATEGORY_ICONS[cat.id]} style={styles.categoryIcon} />}
                  <Text
                    style={[
                      styles.categoryText,
                      isSelected && styles.categoryTextSelected,
                    ]}
                  >
                    {t(cat.translationKey)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Description */}
        <View style={styles.field}>
          <Text style={styles.label}>{t('addMachine.description')}</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={(text) => setDescription(text.slice(0, DESCRIPTION_MAX_LENGTH))}
            placeholder={t('addMachine.descriptionPlaceholder')}
            placeholderTextColor={COLORS.textLight}
            multiline
            numberOfLines={3}
            maxLength={DESCRIPTION_MAX_LENGTH}
          />
          <Text style={styles.charCount}>{description.length}/{DESCRIPTION_MAX_LENGTH}</Text>
        </View>

        {/* Directions Hint */}
        <View style={styles.field}>
          <Text style={styles.label}>{t('addMachine.directionsHint')}</Text>
          <TextInput
            style={styles.input}
            value={directionsHint}
            onChangeText={(text) => setDirectionsHint(text.slice(0, DIRECTIONS_HINT_MAX_LENGTH))}
            placeholder={t('addMachine.directionsHintPlaceholder')}
            placeholderTextColor={COLORS.textLight}
            maxLength={DIRECTIONS_HINT_MAX_LENGTH}
          />
          <Text style={styles.charCount}>
            {directionsHint.length}/{DIRECTIONS_HINT_MAX_LENGTH}
          </Text>
        </View>

        {/* Location info */}
        <View style={styles.locationInfo}>
          <View style={styles.locationHeader}>
            <Text style={styles.locationLabel}>{t('addMachine.location')}</Text>
            {isDev && (
              <View style={styles.manualToggle}>
                <Text style={styles.manualLabel}>{t('addMachine.devMode')}</Text>
                <Switch
                  value={isManualLocation}
                  onValueChange={(val) => {
                    setIsManualLocation(val);
                    if (val && location) {
                      setManualLat(location.latitude.toString());
                      setManualLng(location.longitude.toString());
                    }
                  }}
                  trackColor={{ false: COLORS.textMuted, true: COLORS.primary }}
                  accessibilityLabel={t('addMachine.toggleDevMode')}
                />
              </View>
            )}
          </View>
          
          {isManualLocation ? (
            <View style={styles.manualInputs}>
              <View style={styles.halfInput}>
                <Text style={styles.inputLabel}>{t('addMachine.latitude')}</Text>
                <TextInput
                  style={styles.input}
                  value={manualLat}
                  onChangeText={setManualLat}
                  keyboardType="numbers-and-punctuation"
                  placeholder="e.g. 35.6895"
                  accessibilityLabel={t('addMachine.latitude')}
                />
              </View>
              <View style={styles.halfInput}>
                <Text style={styles.inputLabel}>{t('addMachine.longitude')}</Text>
                <TextInput
                  style={styles.input}
                  value={manualLng}
                  onChangeText={setManualLng}
                  keyboardType="numbers-and-punctuation"
                  placeholder="e.g. 139.6917"
                  accessibilityLabel={t('addMachine.longitude')}
                />
              </View>
            </View>
          ) : (
            <View>
              <Text style={styles.locationText}>
                {location ? `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}` : t('addMachine.gettingLocation')}
              </Text>
              {location && locationSource === 'exif' && (
                <Text style={styles.locationSourceText}>{t('addMachine.locationFromPhoto')}</Text>
              )}
            </View>
          )}
        </View>

        {/* Submit */}
        <Pressable
          style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.submitText}>{t('addMachine.addMachine')}</Text>
          )}
        </Pressable>
      </ScrollView>

      {/* Location Verification Modal */}
      {exifLocation && (
        <LocationVerificationModal
          visible={showLocationVerification}
          latitude={exifLocation.latitude}
          longitude={exifLocation.longitude}
          onConfirm={handleLocationVerificationConfirm}
          onReject={handleLocationVerificationReject}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.backgroundDark,
  },
  backButton: {
    width: 100,
  },
  backText: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.button,
    color: COLORS.primary,
  },
  title: {
    fontSize: FONT_SIZES.xl,
    fontFamily: FONTS.title,
    color: COLORS.text,
  },
  content: {
    flex: 1,
    padding: SPACING.lg,
  },
  photoSection: {
    marginBottom: SPACING.xxl,
  },
  photo: {
    width: '100%',
    height: 200,
    borderRadius: BORDER_RADIUS.lg,
  },
  photoHint: {
    textAlign: 'center',
    fontFamily: FONTS.body,
    color: COLORS.textLight,
    marginTop: SPACING.sm,
    fontSize: FONT_SIZES.sm,
  },
  photoButtons: {
    gap: SPACING.md,
  },
  compressingContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
  },
  compressingText: {
    marginTop: SPACING.md,
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.body,
    color: COLORS.textMuted,
  },
  photoButton: {
    backgroundColor: COLORS.surface,
    paddingVertical: SPACING.lg,
    borderRadius: BORDER_RADIUS.pixel,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.borderLight,
    ...SHADOWS.pixel,
  },
  photoButtonText: {
    fontSize: FONT_SIZES.lg,
    fontFamily: FONTS.button,
    color: COLORS.text,
  },
  field: {
    marginBottom: SPACING.xl,
  },
  label: {
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.bodySemiBold,
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.backgroundDark,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    fontSize: FONT_SIZES.lg,
    fontFamily: FONTS.body,
    color: COLORS.text,
    backgroundColor: COLORS.surface,
    ...SHADOWS.soft,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  categories: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.pixel,
    backgroundColor: COLORS.surface,
    borderWidth: 2,
    borderColor: COLORS.borderLight,
  },
  categoryIcon: {
    width: ICON_SIZES.xs,
    height: ICON_SIZES.xs,
  },
  categoryText: {
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.button,
    color: COLORS.text,
  },
  categoryTextSelected: {
    color: 'white',
  },
  locationInfo: {
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.xxl,
  },
  locationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  manualToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  manualLabel: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.button,
    color: COLORS.primary,
  },
  manualInputs: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.sm,
  },
  halfInput: {
    flex: 1,
  },
  inputLabel: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.body,
    color: COLORS.textMuted,
    marginBottom: SPACING.xs,
  },
  locationLabel: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.body,
    color: COLORS.textLight,
  },
  locationText: {
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.body,
    color: COLORS.textMuted,
  },
  locationSourceText: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.body,
    color: COLORS.secondary,
    marginTop: SPACING.xs,
  },
  charCount: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.body,
    color: COLORS.textLight,
    textAlign: 'right',
    marginTop: SPACING.xs,
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.lg,
    borderRadius: BORDER_RADIUS.pixel,
    alignItems: 'center',
    marginBottom: 70,
    borderWidth: 3,
    borderColor: COLORS.primaryDark,
    ...SHADOWS.pixelLarge,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitText: {
    fontSize: FONT_SIZES.lg,
    color: 'white',
    fontFamily: FONTS.button,
  },
});
