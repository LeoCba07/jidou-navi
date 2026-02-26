// Admin dashboard - pending machines queue and pending photos review
import { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../src/store/authStore';
import { useAdminStore } from '../../src/store/adminStore';
import { useToast } from '../../src/hooks/useToast';
import PendingMachineCard from '../../src/components/admin/PendingMachineCard';
import PendingPhotoCard from '../../src/components/admin/PendingPhotoCard';
import { FONT_SIZES, ICON_SIZES } from '../../src/theme/constants';

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
    pendingPhotos,
    isLoadingPhotos,
    loadPendingPhotos,
    approvePhoto,
    rejectPhoto,
  } = useAdminStore();

  const isAdmin = profile?.role === 'admin';

  useEffect(() => {
    if (isAdmin) {
      loadPendingMachines();
      loadPendingPhotos();
    }
  }, [isAdmin]);

  const onRefresh = useCallback(async () => {
    await Promise.all([loadPendingMachines(), loadPendingPhotos()]);
  }, []);

  const handleMachinePress = (machine: typeof pendingMachines[0]) => {
    selectMachine(machine);
    router.push({
      pathname: '/admin/review/[id]',
      params: { id: machine.id },
    });
  };

  const handleApprovePhoto = async (photoId: string) => {
    const success = await approvePhoto(photoId);
    if (success) {
      toast.showSuccess(t('admin.photoApproveSuccess'));
    } else {
      toast.showError(t('admin.photoApproveError'));
    }
    return success;
  };

  const handleRejectPhoto = async (photoId: string) => {
    const success = await rejectPhoto(photoId);
    if (success) {
      toast.showInfo(t('admin.photoRejectSuccess'));
    } else {
      toast.showError(t('admin.photoRejectError'));
    }
    return success;
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
          <Text style={styles.statNumber}>{pendingPhotos.length}</Text>
          <Text style={styles.statLabel}>{t('admin.pendingPhotos')}</Text>
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
            <Text style={styles.sectionTitle}>{t('admin.pendingReview')}</Text>
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

            {/* Pending Photos */}
            <Text style={[styles.sectionTitle, styles.sectionTitleSpaced]}>{t('admin.pendingPhotos')}</Text>
            <Text style={styles.sectionSubtitle}>{t('admin.pendingPhotosSubtext')}</Text>
            {isLoadingPhotos ? (
              <ActivityIndicator color="#FF4B4B" style={{ marginVertical: 16 }} />
            ) : pendingPhotos.length === 0 ? (
              <View style={styles.emptySection}>
                <Ionicons name="checkmark-circle-outline" size={ICON_SIZES.xl} color="#22C55E" />
                <Text style={styles.emptyText}>{t('admin.photosQueueEmpty')}</Text>
              </View>
            ) : (
              <View style={styles.itemList}>
                {pendingPhotos.map((photo) => (
                  <PendingPhotoCard
                    key={photo.id}
                    photo={photo}
                    onApprove={handleApprovePhoto}
                    onReject={handleRejectPhoto}
                  />
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
});
