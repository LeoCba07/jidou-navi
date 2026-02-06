// Settings modal - account settings, language, support, legal, logout
import { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
  ScrollView,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { User } from '@supabase/supabase-js';
import { useTranslation } from 'react-i18next';
import { useLanguageStore } from '../../store/languageStore';
import { supportedLanguages, LanguageCode } from '../../lib/i18n';
import { Tables } from '../../lib/database.types';
import { supabase } from '../../lib/supabase';
import { useAppModal } from '../../hooks/useAppModal';

type Profile = Tables<'profiles'>;

interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
  user: User | null;
  profile: Profile | null;
  onLogout: () => void;
  onDeleteAccount: () => void;
  onProfileUpdate: (newProfile: Profile) => void;
}

export default function SettingsModal({
  visible,
  onClose,
  user,
  profile,
  onLogout,
  onDeleteAccount,
  onProfileUpdate,
}: SettingsModalProps) {
  const { t } = useTranslation();
  const { showError, showSuccess } = useAppModal();
  const { currentLanguage, setCurrentLanguage } = useLanguageStore();
  const [currentScreen, setCurrentScreen] = useState<'main' | 'language' | 'edit_profile'>('main');
  
  // Profile edit state
  const [displayName, setDisplayName] = useState(profile?.display_name || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [saving, setSaving] = useState(false);

  // Sync state when profile or visibility changes
  useEffect(() => {
    if (visible && profile) {
      setDisplayName(profile.display_name || '');
      setBio(profile.bio || '');
    }
  }, [visible, profile]);

  // Get current language display name
  const currentLanguageName = supportedLanguages.find(l => l.code === currentLanguage)?.nativeName || 'English';

  // Check if user is admin
  const isAdmin = profile?.role === 'admin';

  // Reset to main screen when modal closes
  function handleClose() {
    if (saving) return;
    setCurrentScreen('main');
    onClose();
  }

  // Handle profile save
  async function handleSaveProfile() {
    if (!user) return;
    
    setSaving(true);
    try {
      const { data, error } = await supabase.rpc('update_profile', {
        p_display_name: displayName.trim(),
        p_bio: bio.trim(),
      });

      if (error) throw error;

      const result = data as any;
      if (result.success) {
        // Update local state in parent
        if (profile) {
          onProfileUpdate({
            ...profile,
            display_name: displayName.trim(),
            bio: bio.trim(),
          });
        }
        showSuccess(t('common.success'), t('profile.updateSuccess'));
        setCurrentScreen('main');
      } else {
        showError(t('common.error'), result.error || t('profile.updateError'));
      }
    } catch (err) {
      console.error('[Settings] Error updating profile:', err);
      showError(t('common.error'), t('profile.updateError'));
    } finally {
      setSaving(false);
    }
  }

  // Handle language selection
  async function handleLanguageSelect(code: LanguageCode) {
    await setCurrentLanguage(code);
    setCurrentScreen('main');
  }

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            {currentScreen !== 'main' && (
              <Pressable onPress={() => setCurrentScreen('main')} style={styles.backButton} disabled={saving}>
                <Ionicons name="arrow-back" size={24} color="#666" />
              </Pressable>
            )}
            <Text style={styles.title}>
              {currentScreen === 'language' 
                ? t('profile.language') 
                : currentScreen === 'edit_profile'
                ? t('profile.editProfile')
                : t('profile.accountSettings')}
            </Text>
            <Pressable onPress={handleClose} style={styles.closeButton} disabled={saving}>
              <Ionicons name="close" size={24} color="#666" />
            </Pressable>
          </View>

          {/* Content */}
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {currentScreen === 'main' ? (
              <>
            {/* Edit Profile */}
            <View style={styles.section}>
              <Pressable
                style={styles.itemRow}
                onPress={() => setCurrentScreen('edit_profile')}
                accessibilityRole="button"
                accessibilityLabel={t('profile.editProfile')}
              >
                <Ionicons name="person-outline" size={20} color="#666" />
                <View style={styles.itemContent}>
                  <Text style={styles.itemLabel}>{t('profile.editProfile')}</Text>
                  <Text style={styles.itemValue}>{profile?.display_name || t('profile.editProfile')}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#ccc" />
              </Pressable>
            </View>

            <View style={styles.divider} />

            {/* Admin Dashboard Link (only for admins) */}
            {isAdmin && (
              <>
                <View style={styles.section}>
                  <Pressable
                    style={styles.itemRow}
                    onPress={() => {
                      onClose();
                      router.push('/admin');
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={t('admin.dashboard')}
                  >
                    <Ionicons name="shield-checkmark" size={20} color="#FF4B4B" />
                    <View style={styles.itemContent}>
                      <Text style={[styles.itemLabel, { color: '#FF4B4B' }]}>{t('admin.dashboard')}</Text>
                      <Text style={styles.itemValue}>{t('admin.reviewSubmissions')}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#FF4B4B" />
                  </Pressable>
                </View>
                <View style={styles.divider} />
              </>
            )}

            {/* Email */}
            <View style={styles.section}>
              <View style={styles.itemRow}>
                <Ionicons name="mail-outline" size={20} color="#666" />
                <View style={styles.itemContent}>
                  <Text style={styles.itemLabel}>{t('auth.email')}</Text>
                  <Text style={styles.itemValue}>{user?.email}</Text>
                </View>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Language */}
            <View style={styles.section}>
              <Pressable
                style={styles.itemRow}
                onPress={() => setCurrentScreen('language')}
                accessibilityRole="button"
                accessibilityLabel={t('profile.language')}
              >
                <Ionicons name="language-outline" size={20} color="#666" />
                <View style={styles.itemContent}>
                  <Text style={styles.itemLabel}>{t('profile.language')}</Text>
                  <Text style={styles.itemValue}>{currentLanguageName}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#ccc" />
              </Pressable>
            </View>

            <View style={styles.divider} />

            {/* Legal */}
            <View style={styles.section}>
              <Pressable
                style={styles.itemRow}
                onPress={() => {
                  onClose();
                  router.push('/legal/privacy');
                }}
                accessibilityRole="button"
                accessibilityLabel={t('profile.privacyPolicy')}
              >
                <Ionicons name="shield-checkmark-outline" size={20} color="#666" />
                <View style={styles.itemContent}>
                  <Text style={styles.itemLabel}>{t('profile.privacyPolicy')}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#ccc" />
              </Pressable>
            </View>

            <View style={styles.sectionDivider} />

            <View style={styles.section}>
              <Pressable
                style={styles.itemRow}
                onPress={() => {
                  onClose();
                  router.push('/legal/terms');
                }}
                accessibilityRole="button"
                accessibilityLabel={t('profile.termsOfService')}
              >
                <Ionicons name="document-text-outline" size={20} color="#666" />
                <View style={styles.itemContent}>
                  <Text style={styles.itemLabel}>{t('profile.termsOfService')}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#ccc" />
              </Pressable>
            </View>

            <View style={styles.divider} />

            {/* Logout */}
            <View style={styles.section}>
              <Pressable
                style={styles.logoutButton}
                onPress={() => {
                  onClose();
                  onLogout();
                }}
                accessibilityRole="button"
                accessibilityLabel={t('auth.logout')}
              >
                <Ionicons name="log-out-outline" size={20} color="#FF4B4B" />
                <Text style={styles.logoutText}>{t('auth.logout')}</Text>
              </Pressable>
            </View>

            {/* Delete Account */}
            <View style={styles.section}>
              <Pressable
                style={styles.deleteButton}
                onPress={() => {
                  onClose();
                  onDeleteAccount();
                }}
                accessibilityRole="button"
                accessibilityLabel={t('profile.deleteAccount')}
              >
                <Text style={styles.deleteText}>{t('profile.deleteAccount')}</Text>
              </Pressable>
            </View>
              </>
            ) : currentScreen === 'language' ? (
              /* Language Selection Screen */
              <View style={styles.languageScreen}>
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
              </View>
            ) : (
              /* Edit Profile Screen */
              <View style={styles.editProfileScreen}>
                <View style={styles.field}>
                  <Text style={styles.label}>{t('profile.displayName')}</Text>
                  <TextInput
                    style={styles.input}
                    value={displayName}
                    onChangeText={setDisplayName}
                    placeholder={t('auth.usernamePlaceholder')}
                    maxLength={100}
                    autoCorrect={false}
                  />
                </View>

                <View style={styles.field}>
                  <Text style={styles.label}>{t('profile.bio')}</Text>
                  <TextInput
                    style={[styles.input, styles.bioInput]}
                    value={bio}
                    onChangeText={setBio}
                    placeholder={t('profile.bioPlaceholder')}
                    multiline
                    numberOfLines={4}
                    maxLength={500}
                    textAlignVertical="top"
                  />
                </View>

                <Pressable
                  style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                  onPress={handleSaveProfile}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.saveButtonText}>{t('profile.updateProfile')}</Text>
                  )}
                </Pressable>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
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
    width: '100%',
    maxWidth: 400,
    height: 500,
    maxHeight: '80%',
    backgroundColor: '#fff',
    borderRadius: 4,
    borderWidth: 4,
    borderColor: '#FF4B4B',
    shadowColor: '#000',
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 0,
    elevation: 10,
    overflow: 'hidden',
    flexDirection: 'column',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#eee',
  },
  backButton: {
    padding: 4,
    marginRight: 12,
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontFamily: 'DotGothic16',
    color: '#2B2B2B',
  },
  closeButton: {
    padding: 4,
    marginLeft: 12,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  section: {
    padding: 16,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  itemContent: {
    flex: 1,
  },
  itemLabel: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
  },
  itemValue: {
    fontSize: 14,
    fontFamily: 'Inter',
    color: '#666',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#eee',
    marginLeft: 48,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: '#eee',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fff',
    paddingVertical: 12,
    borderRadius: 2,
    borderWidth: 2,
    borderColor: '#FF4B4B',
  },
  logoutText: {
    fontSize: 15,
    color: '#FF4B4B',
    fontFamily: 'Silkscreen',
  },
  deleteButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  deleteText: {
    fontSize: 14,
    fontFamily: 'Silkscreen',
    color: '#FF4B4B',
    textDecorationLine: 'underline',
  },
  languageScreen: {
    padding: 16,
  },
  languageList: {
    width: '100%',
    gap: 10,
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
  editProfileScreen: {
    padding: 20,
    gap: 16,
  },
  field: {
    gap: 8,
  },
  label: {
    fontSize: 12,
    fontFamily: 'Inter-Bold',
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: '#f9f9f9',
    borderWidth: 2,
    borderColor: '#eee',
    borderRadius: 4,
    padding: 12,
    fontSize: 15,
    fontFamily: 'Inter',
    color: '#2B2B2B',
  },
  bioInput: {
    height: 100,
    paddingTop: 12,
  },
  saveButton: {
    backgroundColor: '#FF4B4B',
    paddingVertical: 14,
    borderRadius: 2,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 0,
    elevation: 3,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    fontSize: 15,
    fontFamily: 'Silkscreen',
    color: '#fff',
  },
});
