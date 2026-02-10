import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import type { MachineVisitor } from '../../lib/machines';
import UserAvatar from '../UserAvatar';
import { COLORS, SPACING, FONTS } from '../../theme/constants';

type RecentVisitorsModalProps = {
  visitors: MachineVisitor[];
  onClose: () => void;
};

export default function RecentVisitorsModal({ visitors, onClose }: RecentVisitorsModalProps) {
  const { t } = useTranslation();

  const handleUserPress = (userId: string) => {
    onClose();
    router.push(`/profile/${userId}`);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('discover.recentVisitors')}</Text>
        <Pressable onPress={onClose} style={styles.closeButton} hitSlop={10}>
          <Ionicons name="close" size={24} color={COLORS.text} />
        </Pressable>
      </View>
      
      <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
        {visitors.map((visitor) => (
          <Pressable
            key={visitor.user_id}
            style={styles.visitorItem}
            onPress={() => handleUserPress(visitor.user_id)}
          >
            <UserAvatar url={visitor.avatar_url} size={40} />
            <View style={styles.visitorInfo}>
              <Text style={styles.displayName}>
                {visitor.display_name || visitor.username || 'User'}
              </Text>
              {visitor.username && visitor.display_name && (
                <Text style={styles.username}>@{visitor.username}</Text>
              )}
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textLight} />
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    maxHeight: 400,
    width: '100%',
    padding: SPACING.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  title: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: COLORS.text,
  },
  closeButton: {
    padding: 4,
  },
  list: {
    width: '100%',
  },
  visitorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  visitorInfo: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  displayName: {
    fontSize: 15,
    fontFamily: 'Inter-Medium',
    color: COLORS.text,
  },
  username: {
    fontSize: 13,
    fontFamily: 'Inter',
    color: COLORS.textMuted,
  },
});
