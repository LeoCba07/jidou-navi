// Add Machine screen
import { useState } from 'react';
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
import { useLocalSearchParams, router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../src/lib/supabase';

const CATEGORIES = [
  { id: 'drinks', label: 'Drinks' },
  { id: 'food', label: 'Food' },
  { id: 'gachapon', label: 'Gachapon' },
  { id: 'weird', label: 'Weird' },
  { id: 'retro', label: 'Retro' },
];

export default function AddMachineScreen() {
  const params = useLocalSearchParams<{ latitude: string; longitude: string }>();
  const [photo, setPhoto] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  async function pickImage(useCamera: boolean) {
    const permission = useCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert('Permission needed', 'Please grant camera/gallery access.');
      return;
    }

    const result = useCamera
      ? await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          quality: 0.7,
          allowsEditing: true,
          aspect: [4, 3],
        })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          quality: 0.7,
          allowsEditing: true,
          aspect: [4, 3],
        });

    if (!result.canceled && result.assets[0]) {
      setPhoto(result.assets[0].uri);
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

    setSubmitting(true);

    try {
      // Upload photo to Supabase Storage
      const fileName = `machine_${Date.now()}.jpg`;
      const response = await fetch(photo);
      const blob = await response.blob();

      const { error: uploadError } = await supabase.storage
        .from('machine-photos')
        .upload(fileName, blob, { contentType: 'image/jpeg' });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('machine-photos')
        .getPublicUrl(fileName);

      // Insert machine record
      const { error: insertError } = await supabase.from('machines').insert({
        name: name || null,
        description: description || null,
        latitude: parseFloat(params.latitude),
        longitude: parseFloat(params.longitude),
        categories: selectedCategories,
        primary_photo_url: urlData.publicUrl,
        status: 'active',
      });

      if (insertError) throw insertError;

      Alert.alert('Success', 'Machine added!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      console.error('Submit error:', error);
      Alert.alert('Error', 'Failed to add machine. Please try again.');
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
          {photo ? (
            <Pressable onPress={() => setPhoto(null)}>
              <Image source={{ uri: photo }} style={styles.photo} />
              <Text style={styles.photoHint}>Tap to remove</Text>
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
          <Text style={styles.label}>Name (optional)</Text>
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
          <Text style={styles.label}>Description (optional)</Text>
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
            {params.latitude}, {params.longitude}
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
    marginBottom: 40,
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
