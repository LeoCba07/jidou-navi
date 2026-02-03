// Add Machine screen
import { useState, useEffect } from 'react';
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
import { useTranslation } from 'react-i18next';
import { supabase } from '../src/lib/supabase';
import { Sentry } from '../src/lib/sentry';
import { useAuthStore } from '../src/store/authStore';
import { useUIStore } from '../src/store/uiStore';
import { checkAndAwardBadges } from '../src/lib/badges';
import { addXP, XP_VALUES } from '../src/lib/xp';
import { useAppModal } from '../src/hooks/useAppModal';
import { tryRequestAppReview } from '../src/lib/review';
import { extractGpsFromExif, GpsCoordinates } from '../src/lib/exif';
import { LocationVerificationModal } from '../src/components/LocationVerificationModal';

// Image quality setting for compression (0.5 = ~50% quality, good balance)
const IMAGE_QUALITY = 0.5;

// Category definitions with translation keys
const CATEGORIES = [
  { id: 'drinks', translationKey: 'categories.drinks' },
  { id: 'food', translationKey: 'categories.food' },
  { id: 'gachapon', translationKey: 'categories.gachapon' },
  { id: 'weird', translationKey: 'categories.weird' },
  { id: 'retro', translationKey: 'categories.retro' },
];

export default function AddMachineScreen() {
  const { t } = useTranslation();
  const { user, profile } = useAuthStore();
  const showBadgePopup = useUIStore((state) => state.showBadgePopup);
  const { showError, showSuccess, showConfirm } = useAppModal();
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoSize, setPhotoSize] = useState<number | null>(null);
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

  // Maximum length for directions hint
  const DIRECTIONS_HINT_MAX_LENGTH = 200;

  // Get current location on mount
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        setLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
      }
    })();
  }, []);

  function handleRemovePhoto() {
    showConfirm(
      t('addMachine.removePhotoConfirm.title'),
      t('addMachine.removePhotoConfirm.message'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.remove'),
          style: 'destructive',
          onPress: () => {
            setPhoto(null);
            setPhotoSize(null);
            setExifLocation(null);
            setShowLocationVerification(false);
            setLocationSource('gps');
          },
        },
      ]
    );
  }

  async function pickImage(useCamera: boolean) {
    const permission = useCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      showError(t('common.error'), t('addMachine.permissionNeeded'));
      return;
    }

    setCompressing(true);
    // Reset EXIF state for new selection
    setExifLocation(null);
    setShowLocationVerification(false);
    if (!isManualLocation) {
      setLocationSource('gps');
    }

    try {
      // For gallery images, first select without editing to preserve EXIF
      // Then we'll apply editing after checking EXIF
      if (!useCamera) {
        // Step 1: Select image without editing to read EXIF
        const preEditResult = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          quality: 1, // Full quality to preserve EXIF
          allowsEditing: false,
        });

        if (preEditResult.canceled || !preEditResult.assets[0]) {
          setCompressing(false);
          return;
        }

        const originalUri = preEditResult.assets[0].uri;

        // Step 2: Try to extract GPS from EXIF
        const gpsData = await extractGpsFromExif(originalUri);

        if (gpsData) {
          // Store EXIF location and show verification modal
          setExifLocation(gpsData);
          setShowLocationVerification(true);
        }

        // Step 3: Now apply editing with compression
        const editResult = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          quality: IMAGE_QUALITY,
          allowsEditing: true,
          aspect: [4, 3],
        });

        if (!editResult.canceled && editResult.assets[0]) {
          const asset = editResult.assets[0];
          setPhoto(asset.uri);

          // Get file size
          const response = await fetch(asset.uri);
          const blob = await response.blob();
          setPhotoSize(blob.size);
        } else {
          // User cancelled editing, reset EXIF state
          setExifLocation(null);
          setShowLocationVerification(false);
        }
      } else {
        // Camera: no EXIF GPS typically available on iOS
        const result = await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          quality: IMAGE_QUALITY,
          allowsEditing: true,
          aspect: [4, 3],
        });

        if (!result.canceled && result.assets[0]) {
          const asset = result.assets[0];
          setPhoto(asset.uri);

          // Get file size
          const response = await fetch(asset.uri);
          const blob = await response.blob();
          setPhotoSize(blob.size);
        }
      }
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
    if (!photo) {
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
      if (isNaN(lat) || isNaN(lng) || !isFinite(lat) || !isFinite(lng)) {
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
      // Upload photo to Supabase Storage
      const fileName = `machine_${Date.now()}.jpg`;

      // Create form data for React Native
      const formData = new FormData();
      formData.append('file', {
        uri: photo,
        name: fileName,
        type: 'image/jpeg',
      } as any);

      const { error: uploadError } = await supabase.storage
        .from('machine-photos')
        .upload(fileName, formData, { contentType: 'multipart/form-data' });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('machine-photos')
        .getPublicUrl(fileName);

      // Insert machine record (status = pending for admin review)
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

      if (insertError) throw insertError;

      // Insert photo record
      const { error: photoError } = await supabase.from('machine_photos').insert({
        machine_id: machine.id,
        photo_url: urlData.publicUrl,
        is_primary: true,
        status: 'active',
        uploaded_by: user?.id,
      });

      if (photoError) console.error('Photo insert error:', photoError);

      // Insert selected categories
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

      if (newBadges.length > 0) {
        // Show success alert, then badge popup, then navigate back
        showSuccess(t('common.success'), t('addMachine.successPending'), () => {
          showBadgePopup(newBadges, () => {
            tryRequestAppReview();
            router.back();
          });
        }, 'OK', XP_VALUES.ADD_MACHINE);
      } else {
        // No badges - just show success and go back
        showSuccess(t('common.success'), t('addMachine.successPending'), () => {
          tryRequestAppReview();
          router.back();
        }, 'OK', XP_VALUES.ADD_MACHINE);
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
              <ActivityIndicator size="large" color="#FF4B4B" />
              <Text style={styles.compressingText}>{t('addMachine.processingImage')}</Text>
            </View>
          ) : photo ? (
            <Pressable onPress={handleRemovePhoto}>
              <Image source={{ uri: photo }} style={styles.photo} />
              <Text style={styles.photoHint}>
                {t('addMachine.tapToRemove')}{photoSize ? ` • ${(photoSize / 1024).toFixed(0)}KB` : ''}
              </Text>
            </Pressable>
          ) : (
            <View style={styles.photoButtons}>
              <Pressable style={styles.photoButton} onPress={() => pickImage(true)}>
                <Text style={styles.photoButtonText}>{t('addMachine.takePhoto')}</Text>
              </Pressable>
              <Pressable style={styles.photoButton} onPress={() => pickImage(false)}>
                <Text style={styles.photoButtonText}>{t('addMachine.chooseFromGallery')}</Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* Name */}
        <View style={styles.field}>
          <Text style={styles.label}>{t('addMachine.name')}</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder={t('addMachine.namePlaceholder')}
            placeholderTextColor="#999"
          />
        </View>

        {/* Categories */}
        <View style={styles.field}>
          <Text style={styles.label}>{t('addMachine.categories')}</Text>
          <View style={styles.categories}>
            {CATEGORIES.map((cat) => (
              <Pressable
                key={cat.id}
                style={[
                  styles.categoryChip,
                  selectedCategories.includes(cat.id) && styles.categoryChipSelected,
                ]}
                onPress={() => toggleCategory(cat.id)}
              >
                <Text
                  style={[
                    styles.categoryText,
                    selectedCategories.includes(cat.id) && styles.categoryTextSelected,
                  ]}
                >
                  {t(cat.translationKey)}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Description */}
        <View style={styles.field}>
          <Text style={styles.label}>{t('addMachine.description')}</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder={t('addMachine.descriptionPlaceholder')}
            placeholderTextColor="#999"
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Directions Hint */}
        <View style={styles.field}>
          <Text style={styles.label}>{t('addMachine.directionsHint')}</Text>
          <TextInput
            style={styles.input}
            value={directionsHint}
            onChangeText={(text) => setDirectionsHint(text.slice(0, DIRECTIONS_HINT_MAX_LENGTH))}
            placeholder={t('addMachine.directionsHintPlaceholder')}
            placeholderTextColor="#999"
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
                  trackColor={{ false: '#767577', true: '#FF4B4B' }}
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
    backgroundColor: '#FDF3E7',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#FDF3E7',
    borderBottomWidth: 1,
    borderBottomColor: '#E8DDD1',
  },
  backButton: {
    width: 100,
  },
  backText: {
    fontSize: 12,
    fontFamily: 'Silkscreen',
    color: '#FF4B4B',
  },
  title: {
    fontSize: 18,
    fontFamily: 'DotGothic16',
    color: '#333',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  photoSection: {
    marginBottom: 24,
  },
  photo: {
    width: '100%',
    height: 200,
    borderRadius: 12,
  },
  photoHint: {
    textAlign: 'center',
    fontFamily: 'Inter',
    color: '#999',
    marginTop: 8,
    fontSize: 13,
  },
  photoButtons: {
    gap: 12,
  },
  compressingContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
  },
  compressingText: {
    marginTop: 12,
    fontSize: 14,
    fontFamily: 'Inter',
    color: '#666',
  },
  photoButton: {
    backgroundColor: '#f0f0f0',
    paddingVertical: 16,
    borderRadius: 2,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(0, 0, 0, 0.15)',
    shadowColor: '#000',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 0,
    elevation: 2,
  },
  photoButtonText: {
    fontSize: 15,
    fontFamily: 'Silkscreen',
    color: '#333',
  },
  field: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    fontFamily: 'Inter',
    color: '#333',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  categories: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 2,
    backgroundColor: '#f0f0f0',
    borderWidth: 2,
    borderColor: 'rgba(0, 0, 0, 0.15)',
  },
  categoryChipSelected: {
    backgroundColor: '#FF4B4B',
    borderColor: '#CC3C3C',
  },
  categoryText: {
    fontSize: 14,
    fontFamily: 'Silkscreen',
    color: '#333',
  },
  categoryTextSelected: {
    color: 'white',
  },
  locationInfo: {
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 24,
  },
  locationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  manualToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  manualLabel: {
    fontSize: 12,
    fontFamily: 'Silkscreen',
    color: '#FF4B4B',
  },
  manualInputs: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  halfInput: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 10,
    fontFamily: 'Inter',
    color: '#666',
    marginBottom: 4,
  },
  locationLabel: {
    fontSize: 12,
    fontFamily: 'Inter',
    color: '#999',
  },
  locationText: {
    fontSize: 14,
    fontFamily: 'Inter',
    color: '#666',
  },
  locationSourceText: {
    fontSize: 11,
    fontFamily: 'Inter',
    color: '#3C91E6',
    marginTop: 4,
  },
  charCount: {
    fontSize: 11,
    fontFamily: 'Inter',
    color: '#999',
    textAlign: 'right',
    marginTop: 4,
  },
  submitButton: {
    backgroundColor: '#FF4B4B',
    paddingVertical: 16,
    borderRadius: 2,
    alignItems: 'center',
    marginBottom: 70,
    borderWidth: 3,
    borderColor: '#CC3C3C',
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 0,
    elevation: 4,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitText: {
    fontSize: 15,
    color: 'white',
    fontFamily: 'Silkscreen',
  },
});
