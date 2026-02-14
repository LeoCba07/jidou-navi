// Modal for selecting/entering rejection reason
import { useState } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
  TextInput,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { FONT_SIZES, ICON_SIZES } from '../../theme/constants';

interface RejectReasonModalProps {
  visible: boolean;
  onClose: () => void;
  onReject: (reason: string) => void;
  isSubmitting: boolean;
}

const REJECTION_REASONS = [
  { key: 'duplicate', translationKey: 'admin.rejectReasons.duplicate' },
  { key: 'inappropriate', translationKey: 'admin.rejectReasons.inappropriate' },
  { key: 'lowQuality', translationKey: 'admin.rejectReasons.lowQuality' },
  { key: 'wrongLocation', translationKey: 'admin.rejectReasons.wrongLocation' },
  { key: 'notVendingMachine', translationKey: 'admin.rejectReasons.notVendingMachine' },
  { key: 'other', translationKey: 'admin.rejectReasons.other' },
];

export default function RejectReasonModal({
  visible,
  onClose,
  onReject,
  isSubmitting,
}: RejectReasonModalProps) {
  const { t } = useTranslation();
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [customReason, setCustomReason] = useState('');

  const handleReject = () => {
    if (!selectedReason) return;

    const reason =
      selectedReason === 'other'
        ? customReason.trim() || t('admin.rejectReasons.other')
        : t(`admin.rejectReasons.${selectedReason}`);

    onReject(reason);
  };

  const handleClose = () => {
    setSelectedReason(null);
    setCustomReason('');
    onClose();
  };

  const canSubmit = selectedReason && (selectedReason !== 'other' || customReason.trim());

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
            <Text style={styles.title}>{t('admin.rejectReason')}</Text>
            <Pressable onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={ICON_SIZES.md} color="#666" />
            </Pressable>
          </View>

          <ScrollView style={styles.content}>
            <Text style={styles.subtitle}>{t('admin.selectRejectReason')}</Text>

            {REJECTION_REASONS.map((reason) => (
              <Pressable
                key={reason.key}
                style={[
                  styles.reasonOption,
                  selectedReason === reason.key && styles.reasonOptionSelected,
                ]}
                onPress={() => setSelectedReason(reason.key)}
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
                <Text
                  style={[
                    styles.reasonText,
                    selectedReason === reason.key && styles.reasonTextSelected,
                  ]}
                >
                  {t(reason.translationKey)}
                </Text>
              </Pressable>
            ))}

            {selectedReason === 'other' && (
              <TextInput
                style={styles.customInput}
                placeholder={t('admin.customReasonPlaceholder')}
                placeholderTextColor="#999"
                value={customReason}
                onChangeText={setCustomReason}
                multiline
                numberOfLines={3}
              />
            )}
          </ScrollView>

          <View style={styles.footer}>
            <Pressable
              style={styles.cancelButton}
              onPress={handleClose}
              disabled={isSubmitting}
            >
              <Text style={styles.cancelText}>{t('common.cancel')}</Text>
            </Pressable>
            <Pressable
              style={[
                styles.rejectButton,
                (!canSubmit || isSubmitting) && styles.rejectButtonDisabled,
              ]}
              onPress={handleReject}
              disabled={!canSubmit || isSubmitting}
            >
              <Text style={styles.rejectText}>{t('admin.reject')}</Text>
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
    borderColor: '#FF4B4B',
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
    marginRight: 12,
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
  customInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
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
  rejectButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 2,
    backgroundColor: '#FF4B4B',
    borderWidth: 2,
    borderColor: '#CC3C3C',
    alignItems: 'center',
  },
  rejectButtonDisabled: {
    opacity: 0.5,
  },
  rejectText: {
    fontSize: FONT_SIZES.md,
    fontFamily: 'Silkscreen',
    color: '#fff',
  },
});
