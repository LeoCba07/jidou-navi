// Admin dashboard - pending machines queue and pending photos review
import { useEffect, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Image,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../src/store/authStore';
import { useAdminStore } from '../../src/store/adminStore';
import { useToast } from '../../src/hooks/useToast';
import PendingMachineCard from '../../src/components/admin/PendingMachineCard';
import { FONT_SIZES, ICON_SIZES } from '../../src/theme/constants';
import type { FlaggedMachine } from '../../src/lib/admin';

export default function AdminDashboard() {
  const { t } = useTranslation();
  const { profile } = useAuthStore();
  const toast = useToast();
  const {
    pendingMachines,
    isLoading,
    error,
    loadPendingMachines,
    selectMachine,
    banUser,
    flaggedMachines,
    isLoadingFlagged,
    loadFlaggedMachines,
    restoreMachine,
    deleteMachine,
  } = useAdminStore();

  const isAdmin = profile?.role === 'admin';

  useEffect(() => {
    if (isAdmin) {
      loadPendingMachines();
      loadFlaggedMachines();
    }
  }, [isAdmin]);

  const onRefresh = useCallback(async () => {
    await Promise.all([loadPendingMachines(), loadFlaggedMachines()]);
  }, []);

  const handleMachinePress = (machine: typeof pendingMachines[0]) => {
    selectMachine(machine);
    router.push({
      pathname: '/admin/review/[id]',
      params: { id: machine.id },
    });
  };

  const [banningUserIds, setBanningUserIds] = useState<Set<string>>(new Set());

  const handleBanUser = (userId: string, displayName: string): Promise<boolean> => {
    return new Promise((resolve) => {
      Alert.alert(
        t('admin.confirmBan'),
        t('admin.confirmBanMessage', { name: displayName }),
        [
          { text: t('common.cancel'), style: 'cancel', onPress: () => resolve(false) },
          {
            text: t('admin.banUser'),
            style: 'destructive',
            onPress: async () => {
              setBanningUserIds((prev) => new Set(prev).add(userId));
              const result = await banUser(userId);
              setBanningUserIds((prev) => {
                const next = new Set(prev);
                next.delete(userId);
                return next;
              });
              if (result) {
                const message = result.rejected_machines > 0
                  ? t('admin.banSuccessWithRejections', {
                      machines: result.rejected_machines,
                    })
                  : t('admin.banSuccess');
                toast.showSuccess(message);
                // Refresh list since submissions were auto-rejected
                loadPendingMachines();
              } else {
                toast.showError(t('admin.banError'));
              }
              resolve(!!result);
            },
          },
        ]
      );
    });
  };

  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  const handleRestoreMachine = (machine: FlaggedMachine) => {
    Alert.alert(
      t('admin.flagged.confirmRestore'),
      t('admin.flagged.confirmRestoreMessage', { name: machine.name || t('machine.unnamed') }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('admin.flagged.restore'),
          onPress: async () => {
            setActionInProgress(machine.id);
            const success = await restoreMachine(machine.id);
            setActionInProgress(null);
            if (success) {
              toast.showSuccess(t('admin.flagged.restoreSuccess'));
            } else {
              toast.showError(t('admin.flagged.restoreError'));
            }
          },
        },
      ]
    );
  };

  const handleDeleteMachine = (machine: FlaggedMachine) => {
    Alert.alert(
      t('admin.flagged.confirmDelete'),
      t('admin.flagged.confirmDeleteMessage', { name: machine.name || t('machine.unnamed') }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('admin.flagged.delete'),
          style: 'destructive',
          onPress: async () => {
            setActionInProgress(machine.id);
            const success = await deleteMachine(machine.id);
            setActionInProgress(null);
            if (success) {
              toast.showSuccess(t('admin.flagged.deleteSuccess'));
            } else {
              toast.showError(t('admin.flagged.deleteError'));
            }
          },
        },
      ]
    );
  };

  // Access denied for non-admins
  if (!isAdmin) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={ICON_SIZES.md} color="#333" />
          </Pressable>
          <Text style={styles.title}>{t('admin.dashboard')}</Text>
          <View style={styles.backButton} />
        </View>
        <View style={styles.centered}>
          <Ionicons name="lock-closed" size={64} color="#ccc" />
          <Text style={styles.accessDenied}>{t('admin.accessDenied')}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={ICON_SIZES.md} color="#333" />
        </Pressable>
        <Text style={styles.title}>{t('admin.dashboard')}</Text>
        <View style={styles.backButton} />
      </View>

      {/* Stats bar */}
      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{pendingMachines.length}</Text>
          <Text style={styles.statLabel}>{t('admin.pendingReview')}</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: '#F59E0B' }]}>{flaggedMachines.length}</Text>
          <Text style={styles.statLabel}>{t('admin.flagged.title')}</Text>
        </View>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={onRefresh} tintColor="#FF4B4B" />
        }
      >
        {isLoading && pendingMachines.length === 0 ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#FF4B4B" />
          </View>
        ) : error ? (
          <View style={styles.centered}>
            <Ionicons name="alert-circle-outline" size={ICON_SIZES.xxl} color="#FF4B4B" />
            <Text style={styles.errorText}>{error}</Text>
            <Pressable style={styles.retryButton} onPress={loadPendingMachines}>
              <Text style={styles.retryText}>{t('map.retry')}</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.listContainer}>
            {/* Pending Machines */}
            <Text style={styles.sectionTitle}>{t('admin.pendingReview')} ({pendingMachines.length})</Text>
            {pendingMachines.length === 0 ? (
              <View style={styles.emptySection}>
                <Ionicons name="checkmark-circle-outline" size={ICON_SIZES.xl} color="#22C55E" />
                <Text style={styles.emptyText}>{t('admin.queueEmpty')}</Text>
              </View>
            ) : (
              <View style={styles.itemList}>
                {pendingMachines.map((machine) => (
                  <PendingMachineCard
                    key={machine.id}
                    machine={machine}
                    onPress={() => handleMachinePress(machine)}
                  />
                ))}
              </View>
            )}

            {/* Flagged Machines */}
            <Text style={[styles.sectionTitle, styles.sectionTitleSpaced]}>
              {t('admin.flagged.title')} ({flaggedMachines.length})
            </Text>
            {isLoadingFlagged && flaggedMachines.length === 0 ? (
              <ActivityIndicator size="small" color="#F59E0B" />
            ) : flaggedMachines.length === 0 ? (
              <View style={styles.emptySection}>
                <Ionicons name="checkmark-circle-outline" size={ICON_SIZES.xl} color="#22C55E" />
                <Text style={styles.emptyText}>{t('admin.flagged.empty')}</Text>
              </View>
            ) : (
              <View style={styles.itemList}>
                {flaggedMachines.map((machine) => (
                  <View key={machine.id} style={styles.flaggedCard}>
                    <View style={styles.flaggedCardHeader}>
                      {machine.primary_photo_url ? (
                        <Image source={{ uri: machine.primary_photo_url }} style={styles.flaggedPhoto} />
                      ) : (
                        <View style={[styles.flaggedPhoto, styles.flaggedPhotoPlaceholder]}>
                          <Ionicons name="image-outline" size={20} color="#ccc" />
                        </View>
                      )}
                      <View style={styles.flaggedInfo}>
                        <Text style={styles.flaggedName} numberOfLines={1}>
                          {machine.name || t('machine.unnamed')}
                        </Text>
                        <Text style={styles.flaggedAddress} numberOfLines={1}>
                          {machine.address || t('machine.noAddress')}
                        </Text>
                        <View style={styles.flaggedBadge}>
                          <Ionicons name="warning" size={12} color="#F59E0B" />
                          <Text style={styles.flaggedBadgeText}>
                            {t('admin.flagged.goneReports', { count: machine.gone_report_count })}
                          </Text>
                        </View>
                      </View>
                    </View>
                    <View style={styles.flaggedActions}>
                      <Pressable
                        style={[styles.flaggedButton, styles.restoreButton]}
                        onPress={() => handleRestoreMachine(machine)}
                        disabled={actionInProgress === machine.id}
                      >
                        {actionInProgress === machine.id ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <>
                            <Ionicons name="checkmark-circle" size={16} color="#fff" />
                            <Text style={styles.flaggedButtonText}>{t('admin.flagged.restore')}</Text>
                          </>
                        )}
                      </Pressable>
                      <Pressable
                        style={[styles.flaggedButton, styles.deleteButton]}
                        onPress={() => handleDeleteMachine(machine)}
                        disabled={actionInProgress === machine.id}
                      >
                        <Ionicons name="trash" size={16} color="#fff" />
                        <Text style={styles.flaggedButtonText}>{t('admin.flagged.delete')}</Text>
                      </Pressable>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    width: 40,
  },
  title: {
    fontSize: 18,
    fontFamily: 'DotGothic16',
    color: '#2B2B2B',
  },
  statsBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statDivider: {
    width: 1,
    backgroundColor: '#eee',
    marginVertical: 4,
  },
  statNumber: {
    fontSize: 28,
    fontFamily: 'DotGothic16',
    color: '#FF4B4B',
  },
  statLabel: {
    fontSize: FONT_SIZES.xs,
    fontFamily: 'Inter',
    color: '#666',
    marginTop: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    flexGrow: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  accessDenied: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#666',
    marginTop: 16,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 14,
    fontFamily: 'Inter',
    color: '#666',
    marginTop: 12,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 24,
    backgroundColor: '#FF4B4B',
    borderRadius: 2,
  },
  retryText: {
    fontSize: 14,
    fontFamily: 'Silkscreen',
    color: '#fff',
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: 'DotGothic16',
    color: '#2B2B2B',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'Inter',
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  machineList: {
    gap: 12,
  },
  listContainer: {
    gap: 0,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.xs,
    fontFamily: 'Inter-Bold',
    color: '#999',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  sectionTitleSpaced: {
    marginTop: 32,
  },
  sectionSubtitle: {
    fontSize: FONT_SIZES.xs,
    fontFamily: 'Inter',
    color: '#aaa',
    marginBottom: 12,
    marginTop: -8,
  },
  emptySection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 16,
    backgroundColor: '#F0FDF4',
    borderRadius: 8,
    marginBottom: 8,
  },
  itemList: {
    gap: 12,
  },
  flaggedCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  flaggedCardHeader: {
    flexDirection: 'row',
    gap: 12,
  },
  flaggedPhoto: {
    width: 48,
    height: 48,
    borderRadius: 8,
  },
  flaggedPhotoPlaceholder: {
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  flaggedInfo: {
    flex: 1,
    gap: 2,
  },
  flaggedName: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#2B2B2B',
  },
  flaggedAddress: {
    fontSize: 12,
    fontFamily: 'Inter',
    color: '#888',
  },
  flaggedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  flaggedBadgeText: {
    fontSize: 11,
    fontFamily: 'Inter-SemiBold',
    color: '#F59E0B',
  },
  flaggedActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  flaggedButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 6,
  },
  restoreButton: {
    backgroundColor: '#22C55E',
  },
  deleteButton: {
    backgroundColor: '#EF4444',
  },
  flaggedButtonText: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: '#fff',
  },
});
