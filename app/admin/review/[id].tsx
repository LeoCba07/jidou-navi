// Admin review screen for a single pending machine
import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../../src/store/authStore';
import { useAdminStore } from '../../../src/store/adminStore';
import { useAppModal } from '../../../src/hooks/useAppModal';
import RejectReasonModal from '../../../src/components/admin/RejectReasonModal';

// Open location in Google Maps
const openInMaps = (lat: number, lng: number) => {
  const url = `https://www.google.com/maps?q=${lat},${lng}`;
  Linking.openURL(url);
};

export default function ReviewMachineScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, profile } = useAuthStore();
  const {
    selectedMachine,
    nearbyMachines,
    isLoadingNearby,
    loadNearbyMachines,
    approve,
    reject,
  } = useAdminStore();
  const { showError, showSuccess, showConfirm } = useAppModal();

  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);

  const isAdmin = profile?.role === 'admin';

  useEffect(() => {
    if (id && isAdmin) {
      loadNearbyMachines(id);
    }
  }, [id, isAdmin]);

  const handleApprove = () => {
    showConfirm(
      t('admin.confirmApprove'),
      t('admin.confirmApproveMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('admin.approve'),
          onPress: async () => {
            if (!user) return;
            setIsApproving(true);
            const success = await approve(id!, user.id);
            setIsApproving(false);

            if (success) {
              showSuccess(t('common.success'), t('admin.approveSuccess'), () => {
                router.back();
              });
            } else {
              showError(t('common.error'), t('admin.approveError'));
            }
          },
        },
      ]
    );
  };

  const handleReject = async (reason: string) => {
    if (!user) return;
    setIsRejecting(true);
    const success = await reject(id!, user.id, reason);
    setIsRejecting(false);
    setShowRejectModal(false);

    if (success) {
      showSuccess(t('common.success'), t('admin.rejectSuccess'), () => {
        router.back();
      });
    } else {
      showError(t('common.error'), t('admin.rejectError'));
    }
  };

  // Access denied for non-admins
  if (!isAdmin) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </Pressable>
          <Text style={styles.title}>{t('admin.review')}</Text>
          <View style={styles.backButton} />
        </View>
        <View style={styles.centered}>
          <Ionicons name="lock-closed" size={64} color="#ccc" />
          <Text style={styles.accessDenied}>{t('admin.accessDenied')}</Text>
        </View>
      </View>
    );
  }

  if (!selectedMachine) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </Pressable>
          <Text style={styles.title}>{t('admin.review')}</Text>
          <View style={styles.backButton} />
        </View>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#FF4B4B" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </Pressable>
        <Text style={styles.title}>{t('admin.review')}</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Photo */}
        {selectedMachine.primary_photo_url ? (
          <Image
            source={{ uri: selectedMachine.primary_photo_url }}
            style={styles.photo}
          />
        ) : (
          <View style={[styles.photo, styles.photoPlaceholder]}>
            <Ionicons name="image-outline" size={48} color="#ccc" />
          </View>
        )}

        {/* Machine Info */}
        <View style={styles.infoSection}>
          <Text style={styles.machineName}>
            {selectedMachine.name || t('machine.unnamed')}
          </Text>
          <Text style={styles.description}>
            {selectedMachine.description || t('admin.noDescription')}
          </Text>

          {/* Categories */}
          {selectedMachine.categories && selectedMachine.categories.length > 0 && (
            <View style={styles.categoriesRow}>
              {selectedMachine.categories.map((cat) => (
                <View
                  key={cat.id}
                  style={[styles.categoryChip, { backgroundColor: cat.color }]}
                >
                  <Text style={styles.categoryText}>{cat.name}</Text>
                </View>
              ))}
            </View>
          )}
          {(!selectedMachine.categories || selectedMachine.categories.length === 0) && (
            <Text style={styles.noCategoriesText}>{t('admin.noCategories')}</Text>
          )}
        </View>

        {/* Contributor Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('admin.submittedBy')}</Text>
          <Pressable
            style={styles.contributorRow}
            onPress={() => {
              if (selectedMachine.contributor_id) {
                router.push(`/profile/${selectedMachine.contributor_id}`);
              }
            }}
            disabled={!selectedMachine.contributor_id}
          >
            {selectedMachine.contributor_avatar_url ? (
              <Image
                source={{ uri: selectedMachine.contributor_avatar_url }}
                style={styles.contributorAvatar}
              />
            ) : (
              <Ionicons name="person-circle-outline" size={36} color="#666" />
            )}
            <View style={styles.contributorInfo}>
              <Text style={styles.contributorName}>
                {selectedMachine.contributor_display_name ||
                  selectedMachine.contributor_username ||
                  t('common.user')}
              </Text>
              {selectedMachine.contributor_id && (
                <Text style={styles.viewProfileText}>{t('admin.viewProfile')}</Text>
              )}
            </View>
            {selectedMachine.contributor_id && (
              <Ionicons name="chevron-forward" size={20} color="#999" />
            )}
          </Pressable>
          <Text style={styles.submittedAt}>
            {new Date(selectedMachine.created_at).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>

        {/* Location Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('admin.location')}</Text>
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={20} color="#666" />
            <Text style={styles.locationText}>
              {selectedMachine.address || t('machine.noAddress')}
            </Text>
          </View>
          <Text style={styles.coordinates}>
            {selectedMachine.latitude?.toFixed(6)}, {selectedMachine.longitude?.toFixed(6)}
          </Text>
          
          {/* Open in Maps button */}
          {selectedMachine.latitude && selectedMachine.longitude && (
            <Pressable
              style={styles.openMapsButton}
              onPress={() => openInMaps(selectedMachine.latitude!, selectedMachine.longitude!)}
            >
              <Ionicons name="map-outline" size={16} color="#3C91E6" />
              <Text style={styles.openMapsText}>{t('admin.openInMaps')}</Text>
            </Pressable>
          )}

          {/* Directions Hint */}
          {selectedMachine.directions_hint && (
            <View style={styles.directionsHint}>
              <Ionicons name="navigate-outline" size={16} color="#666" />
              <Text style={styles.directionsHintText}>{selectedMachine.directions_hint}</Text>
            </View>
          )}
        </View>

        {/* Nearby Machines (Duplicate Check) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('admin.nearbyCheck')}</Text>
          <Text style={styles.duplicateExplanation}>{t('admin.duplicateExplanation')}</Text>
          {isLoadingNearby ? (
            <ActivityIndicator color="#FF4B4B" style={{ marginVertical: 16 }} />
          ) : nearbyMachines.length === 0 ? (
            <View style={styles.noDuplicates}>
              <Ionicons name="checkmark-circle" size={24} color="#22C55E" />
              <Text style={styles.noDuplicatesText}>{t('admin.noDuplicates')}</Text>
            </View>
          ) : (
            <View style={styles.duplicateWarning}>
              <View style={styles.duplicateHeader}>
                <Ionicons name="warning" size={24} color="#D97706" />
                <Text style={styles.duplicateTitle}>
                  {t('admin.potentialDuplicates', { count: nearbyMachines.length })}
                </Text>
              </View>
              {nearbyMachines.map((nearby) => (
                <View key={nearby.id} style={styles.nearbyCard}>
                  {nearby.primary_photo_url ? (
                    <Image
                      source={{ uri: nearby.primary_photo_url }}
                      style={styles.nearbyPhoto}
                    />
                  ) : (
                    <View style={[styles.nearbyPhoto, styles.nearbyPhotoPlaceholder]}>
                      <Ionicons name="image-outline" size={20} color="#ccc" />
                    </View>
                  )}
                  <View style={styles.nearbyInfo}>
                    <View style={styles.nearbyNameRow}>
                      <Text style={styles.nearbyName} numberOfLines={1}>
                        {nearby.name || t('machine.unnamed')}
                      </Text>
                      {nearby.name_similarity > 0.3 && (
                        <View style={[
                          styles.similarityBadge,
                          { backgroundColor: nearby.name_similarity > 0.7 ? '#FEE2E2' : '#FEF3C7' }
                        ]}>
                          <Text style={[
                            styles.similarityText,
                            { color: nearby.name_similarity > 0.7 ? '#EF4444' : '#D97706' }
                          ]}>
                            {t('admin.nameMatch', { percent: Math.round(nearby.name_similarity * 100) })}
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.nearbyDistance}>
                      {nearby.distance_meters.toFixed(0)}m {t('admin.away')}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actionBar}>
        <Pressable
          style={[styles.rejectButton, isRejecting && styles.buttonDisabled]}
          onPress={() => setShowRejectModal(true)}
          disabled={isApproving || isRejecting}
        >
          {isRejecting ? (
            <ActivityIndicator color="#FF4B4B" />
          ) : (
            <>
              <Ionicons name="close-circle-outline" size={20} color="#FF4B4B" />
              <Text style={styles.rejectText}>{t('admin.reject')}</Text>
            </>
          )}
        </Pressable>
        <Pressable
          style={[styles.approveButton, isApproving && styles.buttonDisabled]}
          onPress={handleApprove}
          disabled={isApproving || isRejecting}
        >
          {isApproving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
              <Text style={styles.approveText}>{t('admin.approve')}</Text>
            </>
          )}
        </Pressable>
      </View>

      {/* Reject Reason Modal */}
      <RejectReasonModal
        visible={showRejectModal}
        onClose={() => setShowRejectModal(false)}
        onReject={handleReject}
        isSubmitting={isRejecting}
      />
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
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  accessDenied: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#666',
    marginTop: 16,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 140,
  },
  photo: {
    width: '100%',
    height: 250,
    backgroundColor: '#f0f0f0',
  },
  photoPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoSection: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  machineName: {
    fontSize: 22,
    fontFamily: 'DotGothic16',
    color: '#2B2B2B',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    fontFamily: 'Inter',
    color: '#666',
    lineHeight: 20,
  },
  section: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: 'Inter-Bold',
    color: '#999',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  contributorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  contributorName: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
  },
  submittedAt: {
    fontSize: 13,
    fontFamily: 'Inter',
    color: '#999',
    marginTop: 4,
    marginLeft: 32,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  locationText: {
    fontSize: 14,
    fontFamily: 'Inter',
    color: '#333',
    flex: 1,
  },
  coordinates: {
    fontSize: 12,
    fontFamily: 'Inter',
    color: '#999',
    marginTop: 4,
    marginLeft: 28,
  },
  noDuplicates: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: '#F0FDF4',
    borderRadius: 8,
  },
  noDuplicatesText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#22C55E',
  },
  duplicateWarning: {
    backgroundColor: '#FFFBEB',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  duplicateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  duplicateTitle: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#D97706',
  },
  nearbyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#fff',
    borderRadius: 4,
    marginTop: 8,
  },
  nearbyPhoto: {
    width: 50,
    height: 50,
    borderRadius: 4,
  },
  nearbyPhotoPlaceholder: {
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  nearbyInfo: {
    flex: 1,
    marginLeft: 12,
  },
  nearbyNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  nearbyName: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
    flex: 1,
  },
  similarityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  similarityText: {
    fontSize: 10,
    fontFamily: 'Inter-Bold',
  },
  nearbyDistance: {
    fontSize: 12,
    fontFamily: 'Inter',
    color: '#666',
  },
  actionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: 16,
    paddingBottom: 48,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    gap: 12,
  },
  rejectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 2,
    borderWidth: 2,
    borderColor: '#FF4B4B',
    backgroundColor: '#fff',
  },
  rejectText: {
    fontSize: 14,
    fontFamily: 'Silkscreen',
    color: '#FF4B4B',
  },
  approveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 2,
    backgroundColor: '#22C55E',
    borderWidth: 2,
    borderColor: '#16A34A',
  },
  approveText: {
    fontSize: 14,
    fontFamily: 'Silkscreen',
    color: '#fff',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  categoriesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  categoryChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 2,
  },
  categoryText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#fff',
  },
  noCategoriesText: {
    fontSize: 13,
    fontFamily: 'Inter',
    color: '#999',
    fontStyle: 'italic',
    marginTop: 12,
  },
  contributorAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  contributorInfo: {
    flex: 1,
    marginLeft: 8,
  },
  viewProfileText: {
    fontSize: 12,
    fontFamily: 'Inter',
    color: '#3C91E6',
    marginTop: 2,
  },
  openMapsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    padding: 10,
    backgroundColor: '#EFF6FF',
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  openMapsText: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: '#3C91E6',
  },
  directionsHint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 12,
    padding: 10,
    backgroundColor: '#F9FAFB',
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#D1D5DB',
  },
  directionsHintText: {
    fontSize: 13,
    fontFamily: 'Inter',
    color: '#4B5563',
    flex: 1,
    lineHeight: 18,
  },
  duplicateExplanation: {
    fontSize: 12,
    fontFamily: 'Inter',
    color: '#666',
    marginBottom: 12,
    lineHeight: 18,
  },
});
