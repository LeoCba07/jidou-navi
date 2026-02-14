// Admin dashboard - pending machines queue
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
import PendingMachineCard from '../../src/components/admin/PendingMachineCard';
import { FONT_SIZES, ICON_SIZES } from '../../src/theme/constants';

export default function AdminDashboard() {
  const { t } = useTranslation();
  const { profile } = useAuthStore();
  const {
    pendingMachines,
    isLoading,
    error,
    loadPendingMachines,
    selectMachine,
  } = useAdminStore();

  const isAdmin = profile?.role === 'admin';

  useEffect(() => {
    if (isAdmin) {
      loadPendingMachines();
    }
  }, [isAdmin]);

  const onRefresh = useCallback(async () => {
    await loadPendingMachines();
  }, []);

  const handleMachinePress = (machine: typeof pendingMachines[0]) => {
    selectMachine(machine);
    router.push({
      pathname: '/admin/review/[id]',
      params: { id: machine.id },
    });
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
        ) : pendingMachines.length === 0 ? (
          <View style={styles.centered}>
            <Ionicons name="checkmark-circle-outline" size={64} color="#22C55E" />
            <Text style={styles.emptyTitle}>{t('admin.queueEmpty')}</Text>
            <Text style={styles.emptyText}>{t('admin.queueEmptySubtext')}</Text>
          </View>
        ) : (
          <View style={styles.machineList}>
            {pendingMachines.map((machine) => (
              <PendingMachineCard
                key={machine.id}
                machine={machine}
                onPress={() => handleMachinePress(machine)}
              />
            ))}
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
});
