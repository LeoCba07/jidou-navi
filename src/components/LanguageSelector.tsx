// Language picker modal component
import { useRef, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useLanguageStore } from '../store/languageStore';
import { supportedLanguages, LanguageCode } from '../lib/i18n';

const { width } = Dimensions.get('window');

export default function LanguageSelector() {
  const { t } = useTranslation();
  const {
    currentLanguage,
    isLanguageSelectorVisible,
    setCurrentLanguage,
    hideLanguageSelector,
  } = useLanguageStore();

  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isLanguageSelectorVisible) {
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
  }, [isLanguageSelectorVisible]);

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
      hideLanguageSelector();
    });
  }

  async function handleLanguageSelect(code: LanguageCode) {
    await setCurrentLanguage(code);
    handleClose();
  }

  if (!isLanguageSelectorVisible) return null;

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
            <Text style={styles.title}>{t('languageSelector.title')}</Text>

            <View style={styles.languageList}>
              {supportedLanguages.map((language) => {
                const isSelected = currentLanguage === language.code;
                return (
                  <Pressable
                    key={language.code}
                    style={[styles.languageItem, isSelected && styles.languageItemSelected]}
                    onPress={() => handleLanguageSelect(language.code)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                  >
                    <View style={styles.languageInfo}>
                      <Text style={[styles.languageName, isSelected && styles.languageNameSelected]}>
                        {language.nativeName}
                      </Text>
                      <Text style={styles.languageNameEnglish}>{language.name}</Text>
                    </View>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={24} color="#FF4B4B" />
                    )}
                  </Pressable>
                );
              })}
            </View>

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
  },
  title: {
    fontSize: 12,
    fontFamily: 'PressStart2P',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  languageList: {
    width: '100%',
    gap: 10,
    marginBottom: 20,
  },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#f9f9f9',
    borderRadius: 2,
    borderWidth: 2,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  languageItemSelected: {
    borderColor: '#FF4B4B',
    backgroundColor: '#FFF5F5',
  },
  languageInfo: {
    flex: 1,
  },
  languageName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
    marginBottom: 2,
  },
  languageNameSelected: {
    color: '#FF4B4B',
  },
  languageNameEnglish: {
    fontSize: 13,
    fontFamily: 'Inter',
    color: '#666',
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
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#666',
  },
});
