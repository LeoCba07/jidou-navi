import { View, Text, Pressable, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import type { SavedMachine } from '../../lib/machines';
import PixelLoader from '../PixelLoader';
import { FONT_SIZES, ICON_SIZES } from '../../theme/constants';

const pixelEmptyQuest = require('../../../assets/pixel-empty-quest.png');
const pixelBookmark = require('../../../assets/pixel-ui-bookmark.png');
const pixelLocation = require('../../../assets/pixel-ui-location.png');
const pixelTabMap = require('../../../assets/pixel-tab-map.png');

interface QuestLogSectionProps {
  sortedMachines: Array<{ saved: SavedMachine; distance: number | null; xp: number }>;
  loading: boolean;
  onMachinePress: (saved: SavedMachine) => void;
  onUnsave: (machineId: string) => void;
  onShowOnMap: (machine: SavedMachine['machine']) => void;
  totalCount: number;
}

function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  }
  return `${(meters / 1000).toFixed(1)}km`;
}

export default function QuestLogSection({
  sortedMachines,
  loading,
  onMachinePress,
  onUnsave,
  onShowOnMap,
  totalCount,
}: QuestLogSectionProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          <Image source={pixelBookmark} style={[{ width: ICON_SIZES.sm, height: ICON_SIZES.sm }, styles.sectionTitleIcon]} />
          <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>{t('profile.questLog')}</Text>
        </View>
      </View>
      {loading ? (
        <PixelLoader size={40} />
      ) : totalCount === 0 ? (
        <View style={styles.emptyContainer}>
          <Image source={pixelEmptyQuest} style={styles.emptyImage} />
          <Text style={styles.emptyText}>{t('profile.noQuestLog')}</Text>
          <Text style={styles.emptySubtext}>{t('profile.questLogHint')}</Text>
        </View>
      ) : (
        <View style={styles.savedList}>
          {sortedMachines.map(({ saved, distance, xp }) => (
            <Pressable
              key={saved.id}
              style={styles.savedCard}
              onPress={() => onMachinePress(saved)}
            >
              <View style={styles.savedPhotoContainer}>
                {saved.machine.primary_photo_url ? (
                  <Image
                    source={{ uri: saved.machine.primary_photo_url }}
                    style={[styles.savedPhoto, styles.savedPhotoWithImage]}
                  />
                ) : (
                  <View style={[styles.savedPhoto, styles.savedPhotoPlaceholder]}>
                    <Ionicons name="image-outline" size={ICON_SIZES.md} color="#ccc" />
                  </View>
                )}
              </View>
              <View style={styles.savedInfo}>
                <View style={styles.savedNameRow}>
                  <Text style={styles.savedName} numberOfLines={1}>
                    {saved.machine.name || t('machine.unnamed')}
                  </Text>
                </View>
                <View style={styles.savedAddressRow}>
                  <Image source={pixelLocation} style={{ width: ICON_SIZES.xs, height: ICON_SIZES.xs, opacity: 0.5 }} />
                  <Text style={styles.savedAddress} numberOfLines={1}>
                    {saved.machine.address || t('machine.noAddress')}
                  </Text>
                </View>
                <View style={styles.savedStatsRow}>
                  <View style={styles.savedStat}>
                    <Ionicons name="flash" size={ICON_SIZES.xs} color="#D97706" />
                    <Text style={styles.savedStatText}>
                      {t('profile.xpEstimate', { xp })}
                    </Text>
                  </View>
                  {distance !== null && (
                    <>
                      <Text style={styles.savedStatDivider}>•</Text>
                      <View style={styles.savedStat}>
                        <Ionicons name="navigate" size={ICON_SIZES.xs} color="#3C91E6" />
                        <Text style={styles.savedStatText}>
                          {t('machine.away', { distance: formatDistance(distance) })}
                        </Text>
                      </View>
                    </>
                  )}
                </View>
              </View>
              <View style={styles.cardActions}>
                <Pressable
                  style={styles.cardActionButton}
                  onPress={() => onUnsave(saved.machine_id)}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={t('common.remove')}
                >
                  <Image source={pixelBookmark} style={{ width: ICON_SIZES.md, height: ICON_SIZES.md }} />
                </Pressable>
                <Pressable
                  style={styles.cardActionButton}
                  onPress={() => onShowOnMap(saved.machine)}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={t('discover.showOnMap')}
                >
                  <Image source={pixelTabMap} style={{ width: ICON_SIZES.md, height: ICON_SIZES.md }} />
                </Pressable>
              </View>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitleIcon: {
    marginTop: -2,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.md,
    fontFamily: 'Inter-Bold',
    color: '#2B2B2B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  emptyContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
  },
  emptyImage: {
    width: 120,
    height: 120,
  },
  emptyText: {
    fontSize: FONT_SIZES.lg,
    fontFamily: 'Inter-SemiBold',
    color: '#666',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: FONT_SIZES.md,
    fontFamily: 'Inter',
    color: '#999',
    textAlign: 'center',
    marginTop: 4,
  },
  savedList: {
    gap: 12,
  },
  savedCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 2,
    padding: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 0,
    elevation: 2,
  },
  savedPhotoContainer: {
    position: 'relative',
  },
  savedPhoto: {
    width: 70,
    height: 70,
    borderRadius: 8,
  },
  savedPhotoWithImage: {
    borderWidth: 2,
    borderColor: '#FF4B4B',
  },
  savedPhotoPlaceholder: {
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  savedInfo: {
    flex: 1,
    marginLeft: 12,
  },
  savedNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  savedName: {
    fontSize: FONT_SIZES.lg,
    fontFamily: 'Inter-SemiBold',
    color: '#2B2B2B',
    flex: 1,
  },
  savedAddressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  savedAddress: {
    fontSize: FONT_SIZES.sm,
    fontFamily: 'Inter',
    color: '#999',
    flex: 1,
  },
  savedStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  savedStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  savedStatText: {
    fontSize: FONT_SIZES.xs,
    fontFamily: 'Inter-SemiBold',
    color: '#666',
  },
  savedStatDivider: {
    fontSize: FONT_SIZES.xs,
    color: '#ccc',
  },
  cardActions: {
    flexDirection: 'column',
    justifyContent: 'center',
    gap: 8,
    marginLeft: 8,
  },
  cardActionButton: {
    padding: 8,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
