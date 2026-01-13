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
  Alert,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { supabase } from '../src/lib/supabase';
import { useAuthStore } from '../src/store/authStore';
import { useUIStore } from '../src/store/uiStore';
import { checkAndAwardBadges } from '../src/lib/badges';

// Image quality setting for compression (0.5 = ~50% quality, good balance)
const IMAGE_QUALITY = 0.5;

const CATEGORIES = [
  { id: 'drinks', label: 'Drinks' },
  { id: 'food', label: 'Food' },
  { id: 'gachapon', label: 'Gachapon' },
  { id: 'weird', label: 'Weird' },
  { id: 'retro', label: 'Retro' },
];

export default function AddMachineScreen() {
  const { user } = useAuthStore();
  const showBadgePopup = useUIStore((state) => state.showBadgePopup);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoSize, setPhotoSize] = useState<number | null>(null);
  const [compressing, setCompressing] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

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

  async function pickImage(useCamera: boolean) {
    const permission = useCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert('Permission needed', 'Please grant camera/gallery access.');
      return;
    }

    setCompressing(true);

    try {
      const result = useCamera
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            quality: IMAGE_QUALITY,
            allowsEditing: true,
            aspect: [4, 3],
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            quality: IMAGE_QUALITY,
            allowsEditing: true,
            aspect: [4, 3],
          });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setPhoto(asset.uri);

        // Get file size (fetch blob to measure)
        const response = await fetch(asset.uri);
        const blob = await response.blob();
        setPhotoSize(blob.size);
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Error', 'Failed to process image. Please try again.');
    } finally {
      setCompressing(false);
    }
  }

  function toggleCategory(id: string) {
    setSelectedCategories((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  }

  async function handleSubmit() {
    if (!photo) {
      Alert.alert('Photo required', 'Please take or select a photo.');
      return;
    }
    if (!name.trim()) {
      Alert.alert('Name required', 'Please enter a name for the machine.');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Description required', 'Please add a description.');
      return;
    }
    if (!location) {
      Alert.alert('Location required', 'Please wait for GPS location or enable location services.');
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

      // Insert machine record
      const { data: machine, error: insertError } = await supabase.from('machines').insert({
        name: name,
        description: description,
        latitude: location?.latitude,
        longitude: location?.longitude,
        location: `POINT(${location?.longitude} ${location?.latitude})`,
        status: 'active',
        contributor_id: user?.id,
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

      // Check for badge unlocks (contributor badges)
      const newBadges = await checkAndAwardBadges(machine.id);

      if (newBadges.length > 0) {
        // Show success alert, then badge popup, then navigate back
        Alert.alert('Success', 'Machine added!', [
          {
            text: 'OK',
            onPress: () => {
              showBadgePopup(newBadges, () => router.back());
            },
          },
        ]);
      } else {
        // No badges - just show success and go back
        Alert.alert('Success', 'Machine added!', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      }
    } catch (error: any) {
      console.error('Submit error:', error);
      Alert.alert('Error', error?.message || 'Failed to add machine. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>Cancel</Text>
        </Pressable>
        <Text style={styles.title}>Add Machine</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView style={styles.content}>
        {/* Photo */}
        <View style={styles.photoSection}>
          {compressing ? (
            <View style={styles.compressingContainer}>
              <ActivityIndicator size="large" color="#FF4B4B" />
              <Text style={styles.compressingText}>Processing image...</Text>
            </View>
          ) : photo ? (
            <Pressable onPress={() => { setPhoto(null); setPhotoSize(null); }}>
              <Image source={{ uri: photo }} style={styles.photo} />
              <Text style={styles.photoHint}>
                Tap to remove{photoSize ? ` • ${(photoSize / 1024).toFixed(0)}KB` : ''}
              </Text>
            </Pressable>
          ) : (
            <View style={styles.photoButtons}>
              <Pressable style={styles.photoButton} onPress={() => pickImage(true)}>
                <Text style={styles.photoButtonText}>Take Photo</Text>
              </Pressable>
              <Pressable style={styles.photoButton} onPress={() => pickImage(false)}>
                <Text style={styles.photoButtonText}>Choose from Gallery</Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* Name */}
        <View style={styles.field}>
          <Text style={styles.label}>Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="e.g., Banana Juice Machine"
            placeholderTextColor="#999"
          />
        </View>

        {/* Categories */}
        <View style={styles.field}>
          <Text style={styles.label}>Categories</Text>
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
                  {cat.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Description */}
        <View style={styles.field}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="What makes this machine special?"
            placeholderTextColor="#999"
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Location info */}
        <View style={styles.locationInfo}>
          <Text style={styles.locationLabel}>Location</Text>
          <Text style={styles.locationText}>
            {location ? `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}` : 'Getting location...'}
          </Text>
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
            <Text style={styles.submitText}>Add Machine</Text>
          )}
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    width: 60,
  },
  backText: {
    fontSize: 16,
    color: '#FF4B4B',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
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
    color: '#666',
  },
  photoButton: {
    backgroundColor: '#f0f0f0',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  photoButtonText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  field: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
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
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  categoryChipSelected: {
    backgroundColor: '#FF4B4B',
  },
  categoryText: {
    fontSize: 14,
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
  locationLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  locationText: {
    fontSize: 14,
    color: '#666',
  },
  submitButton: {
    backgroundColor: '#FF4B4B',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 70,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '600',
  },
});
