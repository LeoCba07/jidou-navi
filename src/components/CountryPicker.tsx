// Country picker modal component
import { useRef, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
  Animated,
  Dimensions,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { countries, Country } from '../lib/countries';

const { width, height } = Dimensions.get('window');

interface CountryPickerProps {
  visible: boolean;
  selectedCountry: string | null;
  onSelect: (country: Country) => void;
  onClose: () => void;
}

export default function CountryPicker({
  visible,
  selectedCountry,
  onSelect,
  onClose,
}: CountryPickerProps) {
  const { t } = useTranslation();

  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      scaleAnim.setValue(0);
      opacityAnim.setValue(0);

      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  function handleClose() {
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 0.8,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  }

  function handleSelect(country: Country) {
    onSelect(country);
    handleClose();
  }

  if (!visible) return null;

  return (
    <Modal transparent visible animationType="none" onRequestClose={handleClose}>
      <Pressable style={styles.overlay} onPress={handleClose}>
        <Animated.View
          style={[
            styles.container,
            {
              opacity: opacityAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <Pressable style={styles.content}>
            <Text style={styles.title}>{t('auth.selectCountry')}</Text>

            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
              <View style={styles.countryList}>
                {countries.map((country) => {
                  const isSelected = selectedCountry === country.code;
                  return (
                    <Pressable
                      key={country.code}
                      style={[styles.countryItem, isSelected && styles.countryItemSelected]}
                      onPress={() => handleSelect(country)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: isSelected }}
                    >
                      <View style={styles.countryInfo}>
                        <Text style={styles.countryFlag}>{country.flag}</Text>
                        <Text
                          style={[styles.countryName, isSelected && styles.countryNameSelected]}
                        >
                          {country.name}
                        </Text>
                      </View>
                      {isSelected && (
                        <Ionicons name="checkmark-circle" size={24} color="#FF4B4B" />
                      )}
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>

            <Pressable style={styles.cancelButton} onPress={handleClose}>
              <Text style={styles.cancelText}>{t('common.cancel')}</Text>
            </Pressable>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    width: width - 48,
    maxWidth: 340,
    maxHeight: height * 0.7,
    backgroundColor: '#fff',
    borderRadius: 4,
    padding: 24,
    borderWidth: 4,
    borderColor: '#FF4B4B',
    shadowColor: '#000',
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 0,
    elevation: 10,
  },
  content: {
    width: '100%',
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontFamily: 'DotGothic16',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
    marginBottom: 16,
  },
  countryList: {
    width: '100%',
    gap: 8,
  },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    backgroundColor: '#f9f9f9',
    borderRadius: 2,
    borderWidth: 2,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  countryItemSelected: {
    borderColor: '#FF4B4B',
    backgroundColor: '#FFF5F5',
  },
  countryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  countryFlag: {
    fontSize: 24,
  },
  countryName: {
    fontSize: 15,
    fontFamily: 'Inter',
    color: '#333',
  },
  countryNameSelected: {
    color: '#FF4B4B',
    fontFamily: 'Inter-SemiBold',
  },
  cancelButton: {
    paddingVertical: 14,
    borderRadius: 2,
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderWidth: 2,
    borderColor: 'rgba(0, 0, 0, 0.15)',
  },
  cancelText: {
    fontSize: 15,
    fontFamily: 'Silkscreen',
    color: '#666',
  },
});
