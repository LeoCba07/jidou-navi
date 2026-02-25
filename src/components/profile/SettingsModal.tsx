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
  Image,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { User } from '@supabase/supabase-js';
import { useTranslation } from 'react-i18next';
import * as Clipboard from 'expo-clipboard';
import { FONT_SIZES, ICON_SIZES } from '../../theme/constants';
import { useLanguageStore } from '../../store/languageStore';
import { supportedLanguages, LanguageCode } from '../../lib/i18n';
import { Profile } from '../../store/authStore';
import { supabase } from '../../lib/supabase';
import { useAppModal } from '../../hooks/useAppModal';
import PixelLoader from '../PixelLoader';
import { fetchUserPendingMachines, dismissRejectedMachine, UserPendingMachine } from '../../lib/admin';
import { Sentry } from '../../lib/sentry';

type UpdateProfileResult = { success: boolean; error?: string };

interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
  user: User | null;
  profile: Profile | null;
  onLogout: () => void;
  onDeleteAccount: () => void;
  onProfileUpdate: (newProfile: Profile) => void;
}

// Pixel art assets for icons
const pixelGiftInvite = require('../../../assets/pixel-gift-invite.png');
const pixelShare = require('../../../assets/pixel-ui-share.png');
const feedbackIcon = require('../../../assets/feedback-icon.png');

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
  const [currentScreen, setCurrentScreen] = useState<'main' | 'language' | 'edit_profile' | 'my_submissions' | 'feedback'>('main');
  
  // Profile edit state
  const [displayName, setDisplayName] = useState(profile?.display_name || '');
  const [receiveNewsletter, setReceiveNewsletter] = useState(profile?.receive_newsletter || false);
  const [saving, setSaving] = useState(false);

  // Feedback state
  const [feedbackContent, setFeedbackContent] = useState('');
  const [sendingFeedback, setSendingFeedback] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState(false);

  // My Submissions state
  const [pendingMachines, setPendingMachines] = useState<UserPendingMachine[]>([]);
  const [loadingPending, setLoadingPending] = useState(false);

  // Invitation link logic
  const inviteLink = profile?.referral_code 
    ? `https://jidou-navi.app/invite/${profile.referral_code}` 
    : '';

  async function handleInvite() {
    if (!inviteLink) return;
    
    try {
      await Share.share({
        message: t('profile.inviteMessage') + '\n' + inviteLink,
        url: inviteLink, 
        title: t('profile.inviteTitle'),
      });
    } catch (error) {
      // Fallback to clipboard if sharing fails
      try {
        await Clipboard.setStringAsync(inviteLink);
        showSuccess(t('common.success'), t('profile.inviteLinkCopied'));
      } catch (e) {
        Sentry.captureException(e, { tags: { context: 'settings_invite' } });
      }
    }
  }

  // Sync state when profile or visibility changes
  useEffect(() => {
    if (visible && profile) {
      setDisplayName(profile.display_name || '');
      setReceiveNewsletter(profile.receive_newsletter || false);
    }
  }, [visible, profile]);

  // Compute name change cooldown
  const lastNameChange = (profile as any)?.last_display_name_change;
  const nameChangeCooldownDays = (() => {
    if (!lastNameChange) return 0;
    const elapsed = Date.now() - new Date(lastNameChange).getTime();
    const cooldownMs = 14 * 86400000;
    if (elapsed >= cooldownMs) return 0;
    return Math.ceil((cooldownMs - elapsed) / 86400000);
  })();
  const isNameChangeDisabled = nameChangeCooldownDays > 0;

  // Load pending machines when entering that screen
  useEffect(() => {
    if (currentScreen === 'my_submissions' && user) {
      loadPendingSubmissions();
    }
  }, [currentScreen, user]);

  async function loadPendingSubmissions() {
    setLoadingPending(true);
    try {
      const data = await fetchUserPendingMachines();
      setPendingMachines(data);
    } catch (err) {
      Sentry.captureException(err, { tags: { context: 'settings_load_pending' } });
    } finally {
      setLoadingPending(false);
    }
  }

  async function handleDismissRejected(machineId: string) {
    try {
      const success = await dismissRejectedMachine(machineId);
      if (success) {
        setPendingMachines(prev => prev.filter(m => m.id !== machineId));
      }
    } catch (err) {
      showError(t('common.error'), t('admin.dismissError'));
    }
  }

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
    
    const trimmedName = displayName.trim();
    if (!trimmedName) {
      showError(t('common.error'), t('auth.validation.enterUsername'));
      return;
    }
    if (trimmedName.length < 3) {
      showError(t('common.error'), t('auth.validation.usernameMinLength'));
      return;
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(trimmedName)) {
      showError(t('common.error'), t('auth.validation.usernameFormat'));
      return;
    }

    setSaving(true);
    try {
      const { data, error } = await supabase.rpc('update_profile', {
        p_display_name: trimmedName,
        p_receive_newsletter: receiveNewsletter,
      });

      if (error) throw error;

      const result = data as UpdateProfileResult & { days_remaining?: number };
      if (result.success) {
        if (profile) {
          onProfileUpdate({
            ...profile,
            display_name: trimmedName,
            receive_newsletter: receiveNewsletter,
          });
        }
        showSuccess(t('common.success'), t('profile.updateSuccess'));
        handleClose();
      } else if (result.error === 'name_change_cooldown') {
        showError(t('common.error'), t('profile.nameChangeCooldown', { days: result.days_remaining || 14 }));
      } else {
        showError(t('common.error'), result.error || t('profile.updateError'));
      }
    } catch (err) {
      Sentry.captureException(err, { tags: { context: 'settings_update_profile' } });
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

  async function handleSendFeedback() {
    if (!feedbackContent.trim()) return;

    setSendingFeedback(true);
    try {
      const { data, error } = await supabase.rpc('submit_feedback', {
        p_content: feedbackContent.trim(),
        p_category: 'general',
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string };
      if (!result.success) {
        if (result.error === 'rate_limit_exceeded') {
          showError(t('common.error'), t('report.errors.rateLimited'));
        } else {
          showError(t('common.error'), t('profile.feedbackError'));
        }
        return;
      }

      setFeedbackContent('');
      setFeedbackSent(true);
      setTimeout(() => {
        setFeedbackSent(false);
        handleClose();
      }, 2000);
    } catch (err) {
      Sentry.captureException(err, { tags: { context: 'settings_feedback' } });
      showError(t('common.error'), t('profile.feedbackError'));
    } finally {
      setSendingFeedback(false);
    }
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
                <Ionicons name="arrow-back" size={ICON_SIZES.md} color="#666" />
              </Pressable>
            )}
            <Text style={styles.title}>
              {currentScreen === 'language' 
                ? t('profile.language') 
                : currentScreen === 'edit_profile'
                ? t('profile.editProfile')
                : currentScreen === 'my_submissions'
                ? t('profile.mySubmissions')
                : currentScreen === 'feedback'
                ? t('profile.feedbackTitle')
                : t('profile.accountSettings')}
            </Text>
            <Pressable onPress={handleClose} style={styles.closeButton} disabled={saving}>
              <Ionicons name="close" size={ICON_SIZES.md} color="#666" />
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
            {/* ── ACCOUNT ── */}
            <Text style={styles.sectionHeader}>{t('profile.sectionAccount')}</Text>

            <View style={styles.section}>
              <Pressable
                style={styles.itemRow}
                onPress={() => setCurrentScreen('edit_profile')}
                accessibilityRole="button"
                accessibilityLabel={t('profile.editProfile')}
              >
                <Ionicons name="person-outline" size={ICON_SIZES.sm} color="#666" />
                <View style={styles.itemContent}>
                  <Text style={styles.itemLabel}>{t('profile.editProfile')}</Text>
                  <Text style={styles.itemValue}>
                    {profile?.display_name || profile?.username || t('common.user')}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={ICON_SIZES.sm} color="#ccc" />
              </Pressable>
            </View>

            <View style={styles.divider} />

            <View style={styles.section}>
              <Pressable
                style={styles.itemRow}
                onPress={() => setCurrentScreen('language')}
                accessibilityRole="button"
                accessibilityLabel={t('profile.language')}
              >
                <Ionicons name="language-outline" size={ICON_SIZES.sm} color="#666" />
                <View style={styles.itemContent}>
                  <Text style={styles.itemLabel}>{t('profile.language')}</Text>
                  <Text style={styles.itemValue}>{currentLanguageName}</Text>
                </View>
                <Ionicons name="chevron-forward" size={ICON_SIZES.sm} color="#ccc" />
              </Pressable>
            </View>

            {/* ── CONTENT ── */}
            <View style={styles.sectionDivider} />
            <Text style={styles.sectionHeader}>{t('profile.sectionContent')}</Text>

            <View style={styles.section}>
              <Pressable
                style={styles.itemRow}
                onPress={() => setCurrentScreen('my_submissions')}
                accessibilityRole="button"
                accessibilityLabel={t('profile.mySubmissions')}
              >
                <Ionicons name="cube-outline" size={ICON_SIZES.sm} color="#666" />
                <View style={styles.itemContent}>
                  <Text style={styles.itemLabel}>{t('profile.mySubmissions')}</Text>
                  <Text style={styles.itemValue}>{t('admin.pendingReview')}</Text>
                </View>
                <Ionicons name="chevron-forward" size={ICON_SIZES.sm} color="#ccc" />
              </Pressable>
            </View>

            {isAdmin && (
              <>
                <View style={styles.divider} />
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
                    <Ionicons name="shield-checkmark" size={ICON_SIZES.sm} color="#FF4B4B" />
                    <View style={styles.itemContent}>
                      <Text style={[styles.itemLabel, { color: '#FF4B4B' }]}>{t('admin.dashboard')}</Text>
                      <Text style={styles.itemValue}>{t('admin.reviewSubmissions')}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={ICON_SIZES.sm} color="#FF4B4B" />
                  </Pressable>
                </View>
              </>
            )}

            {/* ── COMMUNITY ── */}
            <View style={styles.sectionDivider} />
            <Text style={styles.sectionHeader}>{t('profile.sectionCommunity')}</Text>

            <View style={styles.section}>
              <Pressable
                style={styles.itemRow}
                onPress={handleInvite}
                accessibilityRole="button"
                accessibilityLabel={t('profile.inviteTitle')}
              >
                <Image source={require('../../../assets/pixel-gift-invite.png')} style={{ width: ICON_SIZES.sm, height: ICON_SIZES.sm }} />
                <View style={styles.itemContent}>
                  <Text style={styles.itemLabel}>{t('profile.inviteTitle')}</Text>
                  <Text style={styles.itemValue}>{t('profile.inviteDescription')}</Text>
                </View>
                <Image source={require('../../../assets/pixel-ui-share.png')} style={{ width: ICON_SIZES.sm, height: ICON_SIZES.sm }} />
              </Pressable>
            </View>

            <View style={styles.divider} />

            <View style={styles.section}>
              <Pressable
                style={styles.itemRow}
                onPress={() => setCurrentScreen('feedback')}
                accessibilityRole="button"
                accessibilityLabel={t('profile.feedbackTitle')}
              >
                <Image source={feedbackIcon} style={{ width: ICON_SIZES.sm, height: ICON_SIZES.sm }} />
                <View style={styles.itemContent}>
                  <Text style={styles.itemLabel}>{t('profile.feedbackTitle')}</Text>
                  <Text style={styles.itemValue}>{t('profile.feedbackDescription')}</Text>
                </View>
                <Ionicons name="chevron-forward" size={ICON_SIZES.sm} color="#ccc" />
              </Pressable>
            </View>

            {/* ── LEGAL ── */}
            <View style={styles.sectionDivider} />
            <Text style={styles.sectionHeader}>{t('profile.sectionLegal')}</Text>

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
                <Ionicons name="shield-checkmark-outline" size={ICON_SIZES.sm} color="#666" />
                <View style={styles.itemContent}>
                  <Text style={styles.itemLabel}>{t('profile.privacyPolicy')}</Text>
                </View>
                <Ionicons name="chevron-forward" size={ICON_SIZES.sm} color="#ccc" />
              </Pressable>
            </View>

            <View style={styles.divider} />

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
                <Ionicons name="document-text-outline" size={ICON_SIZES.sm} color="#666" />
                <View style={styles.itemContent}>
                  <Text style={styles.itemLabel}>{t('profile.termsOfService')}</Text>
                </View>
                <Ionicons name="chevron-forward" size={ICON_SIZES.sm} color="#ccc" />
              </Pressable>
            </View>

            {/* ── DESTRUCTIVE ACTIONS ── */}
            <View style={styles.sectionDivider} />

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
                <Ionicons name="log-out-outline" size={ICON_SIZES.sm} color="#FF4B4B" />
                <Text style={styles.logoutText}>{t('auth.logout')}</Text>
              </Pressable>
            </View>

            <View style={styles.divider} />

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
                          <Ionicons name="checkmark-circle" size={ICON_SIZES.md} color="#FF4B4B" />
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ) : currentScreen === 'my_submissions' ? (
              /* My Submissions Screen */
              <View style={styles.submissionsScreen}>
                {loadingPending ? (
                  <PixelLoader size={40} />
                ) : pendingMachines.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Ionicons name="cube-outline" size={ICON_SIZES.xxl} color="#ccc" />
                    <Text style={styles.emptyText}>{t('admin.queueEmptySubtext')}</Text>
                  </View>
                ) : (
                  <View style={styles.submissionsList}>
                    {pendingMachines.map((machine) => (
                      <View key={machine.id} style={styles.submissionCard}>
                        {machine.primary_photo_url ? (
                          <Image
                            source={{ uri: machine.primary_photo_url }}
                            style={styles.submissionPhoto}
                          />
                        ) : (
                          <View style={[styles.submissionPhoto, styles.photoPlaceholder]}>
                            <Ionicons name="image-outline" size={ICON_SIZES.md} color="#ccc" />
                          </View>
                        )}
                        <View style={styles.submissionInfo}>
                          <View style={styles.statusRow}>
                            <Text style={styles.submissionName} numberOfLines={1}>
                              {machine.name || t('machine.unnamed')}
                            </Text>
                            {machine.status === 'pending' ? (
                              <View style={[styles.statusBadge, styles.pendingBadge]}>
                                <Text style={styles.statusBadgeText}>{t('profile.pendingReview')}</Text>
                              </View>
                            ) : (
                              <View style={[styles.statusBadge, styles.rejectedBadge]}>
                                <Text style={styles.statusBadgeText}>{t('profile.rejected')}</Text>
                              </View>
                            )}
                          </View>
                          {machine.status === 'rejected' && (
                            <View style={styles.rejectionInfo}>
                              <Text style={styles.rejectionReason} numberOfLines={2}>
                                {machine.rejection_reason || t('admin.noReason')}
                              </Text>
                              <Pressable 
                                style={styles.dismissButton} 
                                onPress={() => handleDismissRejected(machine.id)}
                              >
                                <Text style={styles.dismissText}>{t('common.dismiss')}</Text>
                              </Pressable>
                            </View>
                          )}
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            ) : currentScreen === 'feedback' ? (
              /* Feedback Screen */
              <View style={styles.feedbackScreen}>
                {feedbackSent ? (
                  <View style={styles.feedbackSuccessState}>
                    <Ionicons name="checkmark-circle" size={ICON_SIZES.xxl} color="#22C55E" />
                    <Text style={styles.feedbackSentText}>{t('profile.feedbackSentInline')}</Text>
                  </View>
                ) : (
                  <>
                    <View style={styles.field}>
                      <Text style={styles.label}>{t('profile.feedbackDescription')}</Text>
                      <Text style={styles.feedbackRateInfo}>{t('profile.feedbackRateInfo')}</Text>

                      <TextInput
                        style={[styles.input, styles.textArea]}
                        value={feedbackContent}
                        onChangeText={setFeedbackContent}
                        placeholder={t('profile.feedbackPlaceholder')}
                        placeholderTextColor="#999"
                        multiline
                        numberOfLines={6}
                        textAlignVertical="top"
                        autoFocus
                        maxLength={2000}
                      />
                      <Text style={[
                        styles.charCounter,
                        feedbackContent.length > 1800 && styles.charCounterWarning,
                      ]}>
                        {feedbackContent.length}/2000
                      </Text>
                    </View>
                    <Pressable
                      style={[
                        styles.saveButton,
                        (!feedbackContent.trim() || sendingFeedback) && styles.saveButtonDisabled
                      ]}
                      onPress={handleSendFeedback}
                      disabled={!feedbackContent.trim() || sendingFeedback}
                    >
                      {sendingFeedback ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text style={styles.saveButtonText}>{t('profile.feedbackSubmit')}</Text>
                      )}
                    </Pressable>
                  </>
                )}
              </View>
            ) : (
              /* Edit Profile Screen */
              <View style={styles.editProfileScreen}>
                <View style={styles.field}>
                  <Text style={styles.label}>{t('auth.email')}</Text>
                  <TextInput
                    style={[styles.input, styles.inputDisabled]}
                    value={user?.email || ''}
                    editable={false}
                    selectTextOnFocus={false}
                  />
                </View>

                <View style={styles.field}>
                  <Text style={styles.label}>{t('profile.displayName')}</Text>
                  <TextInput
                    style={[
                      styles.input,
                      isNameChangeDisabled && styles.inputDisabled,
                      displayName.length > 0 && !isNameChangeDisabled && (
                        !/^[a-zA-Z0-9_-]+$/.test(displayName) || displayName.trim().length < 3
                      ) && styles.inputError,
                    ]}
                    value={displayName}
                    onChangeText={setDisplayName}
                    placeholder={t('auth.usernamePlaceholder')}
                    maxLength={15}
                    autoCorrect={false}
                    autoCapitalize="none"
                    editable={!isNameChangeDisabled}
                  />
                  {displayName.length > 0 && !isNameChangeDisabled && !/^[a-zA-Z0-9_-]+$/.test(displayName) ? (
                    <Text style={styles.validationError}>{t('auth.validation.usernameFormat')}</Text>
                  ) : displayName.length > 0 && !isNameChangeDisabled && displayName.trim().length < 3 ? (
                    <Text style={styles.validationError}>{t('auth.validation.usernameMinLength')}</Text>
                  ) : (
                    <Text style={styles.nameChangeInfo}>
                      {t('profile.nameChangeInfo')}
                    </Text>
                  )}
                  {isNameChangeDisabled && (
                    <Text style={styles.cooldownText}>
                      {t('profile.nameChangeCooldown', { days: nameChangeCooldownDays })}
                    </Text>
                  )}
                </View>

                <Pressable
                  style={styles.newsletterToggle}
                  onPress={() => setReceiveNewsletter(!receiveNewsletter)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: receiveNewsletter }}
                  accessibilityLabel={t('auth.newsletter.label')}
                >
                  <View style={[styles.checkbox, receiveNewsletter && styles.checkboxChecked]}>
                    {receiveNewsletter && <Ionicons name="checkmark" size={ICON_SIZES.xs} color="#fff" />}
                  </View>
                  <Text style={styles.newsletterText}>{t('auth.newsletter.label')}</Text>
                </Pressable>

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
    fontSize: FONT_SIZES.xl,
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
    fontSize: FONT_SIZES.lg,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
  },
  itemValue: {
    fontSize: FONT_SIZES.md,
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
  sectionHeader: {
    fontSize: FONT_SIZES.xs,
    fontFamily: 'Inter-Bold',
    color: '#999',
    textTransform: 'uppercase',
    letterSpacing: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 4,
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
    fontSize: FONT_SIZES.md,
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
    fontSize: FONT_SIZES.lg,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
    marginBottom: 2,
  },
  languageNameSelected: {
    color: '#FF4B4B',
  },
  languageNameEnglish: {
    fontSize: FONT_SIZES.sm,
    fontFamily: 'Inter',
    color: '#666',
  },
  submissionsScreen: {
    padding: 16,
  },
  submissionsList: {
    gap: 12,
  },
  submissionCard: {
    flexDirection: 'row',
    backgroundColor: '#f9f9f9',
    borderRadius: 4,
    borderWidth: 2,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    overflow: 'hidden',
  },
  submissionPhoto: {
    width: 80,
    height: 80,
  },
  photoPlaceholder: {
    backgroundColor: '#eee',
    justifyContent: 'center',
    alignItems: 'center',
  },
  submissionInfo: {
    flex: 1,
    padding: 10,
    justifyContent: 'center',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  submissionName: {
    flex: 1,
    fontSize: FONT_SIZES.md,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  pendingBadge: {
    backgroundColor: '#FEF3C7',
  },
  rejectedBadge: {
    backgroundColor: '#FEE2E2',
  },
  statusBadgeText: {
    fontSize: FONT_SIZES.xs,
    fontFamily: 'Inter-Bold',
    textTransform: 'uppercase',
  },
  rejectionInfo: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rejectionReason: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
    fontFamily: 'Inter',
    color: '#EF4444',
    marginRight: 8,
  },
  dismissButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#eee',
    borderRadius: 4,
  },
  dismissText: {
    fontSize: FONT_SIZES.xs,
    fontFamily: 'Inter-Medium',
    color: '#666',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    marginTop: 12,
    fontSize: FONT_SIZES.md,
    fontFamily: 'Inter',
    color: '#999',
  },
  loader: {
    marginTop: 40,
  },
  editProfileScreen: {
    padding: 20,
    gap: 16,
  },
  field: {
    gap: 8,
  },
  label: {
    fontSize: FONT_SIZES.sm,
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
    fontSize: FONT_SIZES.lg,
    fontFamily: 'Inter',
    color: '#2B2B2B',
  },
  inputDisabled: {
    backgroundColor: '#eee',
    color: '#999',
  },
  inputError: {
    borderColor: '#FF4B4B',
  },
  validationError: {
    fontSize: FONT_SIZES.sm,
    fontFamily: 'Inter',
    color: '#FF4B4B',
    marginTop: 4,
  },
  nameChangeInfo: {
    fontSize: FONT_SIZES.sm,
    fontFamily: 'Inter',
    color: '#999',
    marginTop: 4,
  },
  cooldownText: {
    fontSize: FONT_SIZES.sm,
    fontFamily: 'Inter',
    color: '#FF4B4B',
    marginTop: 4,
  },
  newsletterToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 2,
    borderWidth: 2,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    backgroundColor: '#f9f9f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  checkboxChecked: {
    backgroundColor: '#FF4B4B',
    borderColor: '#CC3C3C',
  },
  newsletterText: {
    fontSize: FONT_SIZES.md,
    fontFamily: 'Inter',
    color: '#333',
    flex: 1,
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
    fontSize: FONT_SIZES.lg,
    fontFamily: 'Silkscreen',
    color: '#fff',
  },
  feedbackScreen: {
    padding: 20,
    gap: 16,
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  charCounter: {
    fontSize: FONT_SIZES.xs,
    fontFamily: 'Inter',
    color: '#999',
    textAlign: 'right',
    marginTop: 4,
  },
  charCounterWarning: {
    color: '#FF4B4B',
  },
  feedbackRateInfo: {
    fontSize: FONT_SIZES.xs,
    fontFamily: 'Inter',
    color: '#999',
    marginBottom: 4,
  },
  feedbackSuccessState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  feedbackSentText: {
    fontSize: FONT_SIZES.lg,
    fontFamily: 'Inter-SemiBold',
    color: '#22C55E',
  },
});
