// Modal for reporting issues with a machine
import { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
  TextInput,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import type { ReportReason } from '../../lib/machines';
import { FONT_SIZES, ICON_SIZES } from '../../theme/constants';

interface ReportModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (reason: ReportReason, details?: string) => Promise<void>;
  isSubmitting: boolean;
}

const REPORT_REASONS: { key: ReportReason; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'not_exists', icon: 'help-circle-outline' },
  { key: 'duplicate', icon: 'copy-outline' },
  { key: 'wrong_location', icon: 'location-outline' },
  { key: 'inappropriate', icon: 'warning-outline' },
  { key: 'other', icon: 'ellipsis-horizontal' },
];

export default function ReportModal({
  visible,
  onClose,
  onSubmit,
  isSubmitting,
}: ReportModalProps) {
  const { t } = useTranslation();
  const [selectedReason, setSelectedReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState('');

  // Reset state when modal closes (handles both user close and parent close)
  useEffect(() => {
    if (!visible) {
      setSelectedReason(null);
      setDetails('');
    }
  }, [visible]);

  const handleSubmit = async () => {
    if (!selectedReason) return;
    await onSubmit(selectedReason, details.trim() || undefined);
  };

  const handleClose = () => {
    if (isSubmitting) return;
    onClose();
  };

  const canSubmit = selectedReason && (selectedReason !== 'other' || details.trim());

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>{t('report.title')}</Text>
            <Pressable
              onPress={handleClose}
              style={styles.closeButton}
              disabled={isSubmitting}
              accessibilityRole="button"
              accessibilityLabel={t('common.close')}
            >
              <Ionicons name="close" size={ICON_SIZES.md} color="#666" />
            </Pressable>
          </View>

          <ScrollView style={styles.content}>
            <Text style={styles.subtitle}>{t('report.subtitle')}</Text>

            {REPORT_REASONS.map((reason) => (
              <Pressable
                key={reason.key}
                style={[
                  styles.reasonOption,
                  selectedReason === reason.key && styles.reasonOptionSelected,
                ]}
                onPress={() => setSelectedReason(reason.key)}
                disabled={isSubmitting}
                accessibilityRole="radio"
                accessibilityState={{ checked: selectedReason === reason.key }}
              >
                <View
                  style={[
                    styles.radio,
                    selectedReason === reason.key && styles.radioSelected,
                  ]}
                >
                  {selectedReason === reason.key && (
                    <View style={styles.radioInner} />
                  )}
                </View>
                <Ionicons
                  name={reason.icon}
                  size={ICON_SIZES.sm}
                  color={selectedReason === reason.key ? '#FF4B4B' : '#666'}
                  style={styles.reasonIcon}
                />
                <Text
                  style={[
                    styles.reasonText,
                    selectedReason === reason.key && styles.reasonTextSelected,
                  ]}
                >
                  {t(`report.reasons.${reason.key}`)}
                </Text>
              </Pressable>
            ))}

            <TextInput
              style={styles.detailsInput}
              placeholder={
                selectedReason === 'other'
                  ? t('report.detailsRequired')
                  : t('report.detailsOptional')
              }
              placeholderTextColor="#999"
              value={details}
              onChangeText={setDetails}
              multiline
              numberOfLines={3}
              editable={!isSubmitting}
            />
          </ScrollView>

          <View style={styles.footer}>
            <Pressable
              style={styles.cancelButton}
              onPress={handleClose}
              disabled={isSubmitting}
              accessibilityRole="button"
            >
              <Text style={styles.cancelText}>{t('common.cancel')}</Text>
            </Pressable>
            <Pressable
              style={[
                styles.submitButton,
                (!canSubmit || isSubmitting) && styles.submitButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={!canSubmit || isSubmitting}
              accessibilityRole="button"
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.submitText}>{t('report.submit')}</Text>
              )}
            </Pressable>
          </View>
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
    maxHeight: '80%',
    backgroundColor: '#fff',
    borderRadius: 4,
    borderWidth: 4,
    borderColor: '#F59E0B',
    shadowColor: '#000',
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 0,
    elevation: 10,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: FONT_SIZES.xl,
    fontFamily: 'DotGothic16',
    color: '#2B2B2B',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    padding: 16,
  },
  subtitle: {
    fontSize: FONT_SIZES.md,
    fontFamily: 'Inter',
    color: '#666',
    marginBottom: 16,
  },
  reasonOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 2,
    borderWidth: 2,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    marginBottom: 8,
  },
  reasonOptionSelected: {
    borderColor: '#FF4B4B',
    backgroundColor: '#FFF5F5',
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#ccc',
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioSelected: {
    borderColor: '#FF4B4B',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FF4B4B',
  },
  reasonIcon: {
    marginRight: 10,
  },
  reasonText: {
    fontSize: FONT_SIZES.md,
    fontFamily: 'Inter',
    color: '#333',
    flex: 1,
  },
  reasonTextSelected: {
    fontFamily: 'Inter-SemiBold',
    color: '#FF4B4B',
  },
  detailsInput: {
    borderWidth: 2,
    borderColor: '#eee',
    borderRadius: 2,
    padding: 12,
    fontSize: FONT_SIZES.md,
    fontFamily: 'Inter',
    color: '#333',
    minHeight: 80,
    textAlignVertical: 'top',
    marginTop: 8,
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 2,
    borderTopColor: '#eee',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 2,
    borderWidth: 2,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  cancelText: {
    fontSize: FONT_SIZES.md,
    fontFamily: 'Silkscreen',
    color: '#666',
  },
  submitButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 2,
    backgroundColor: '#F59E0B',
    borderWidth: 2,
    borderColor: '#D97706',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitText: {
    fontSize: FONT_SIZES.md,
    fontFamily: 'Silkscreen',
    color: '#fff',
  },
});
