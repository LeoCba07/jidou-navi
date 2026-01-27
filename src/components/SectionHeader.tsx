// Reusable retro-style section header
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, FONTS, SPACING } from '../theme/constants';

type SectionHeaderProps = {
  title: string;
  showLine?: boolean;
};

export function SectionHeader({ title, showLine = false }: SectionHeaderProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {showLine && <View style={styles.line} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  title: {
    fontSize: 10,
    fontFamily: FONTS.heading,
    color: COLORS.primary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.backgroundDark,
  },
});
