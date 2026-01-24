// Settings modal - account settings, language, support, legal, logout
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useLanguageStore } from '../../store/languageStore';
import { supportedLanguages } from '../../lib/i18n';

interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
  user: { email: string } | null;
  profile: any;
  onLogout: () => void;
  onDeleteAccount: () => void;
}

export default function SettingsModal({
  visible,
  onClose,
  user,
  profile,
  onLogout,
  onDeleteAccount,
}: SettingsModalProps) {
  const { t } = useTranslation();
  const { currentLanguage, showLanguageSelector } = useLanguageStore();

  // Get current language display name
  const currentLanguageName = supportedLanguages.find(l => l.code === currentLanguage)?.nativeName || 'English';

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>{t('profile.accountSettings')}</Text>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#666" />
            </Pressable>
          </View>

          {/* Content */}
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
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
                onPress={showLanguageSelector}
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
  title: {
    fontSize: 18,
    fontFamily: 'DotGothic16',
    color: '#2B2B2B',
  },
  closeButton: {
    padding: 4,
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
});
