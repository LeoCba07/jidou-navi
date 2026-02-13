// Horizontal filter bar with category chips for the map
import { View, ScrollView, Pressable, Text, Image, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useUIStore } from "../store";

const CATEGORY_ICONS: Record<string, any> = {
  eats: require('../../assets/pixel-cat-eats.png'),
  gachapon: require('../../assets/pixel-cat-gachapon.png'),
  weird: require('../../assets/pixel-cat-weird.png'),
  retro: require('../../assets/pixel-cat-retro.png'),
  'local-gems': require('../../assets/pixel-cat-local-gems.png'),
};

// Category definitions with translation keys
const CATEGORIES = [
  { slug: "eats", translationKey: "categories.eats", color: "#FF4B4B" },
  { slug: "gachapon", translationKey: "categories.gachapon", color: "#FFB7CE" },
  { slug: "weird", translationKey: "categories.weird", color: "#D8B4FE" },
  { slug: "retro", translationKey: "categories.retro", color: "#FFD966" },
  { slug: "local-gems", translationKey: "categories.localGems", color: "#2ECC71" },
];

export function CategoryFilterBar() {
  const { t } = useTranslation();
  const selectedCategories = useUIStore((state) => state.selectedCategories);
  const toggleCategory = useUIStore((state) => state.toggleCategory);
  const clearCategories = useUIStore((state) => state.clearCategories);

  const insets = useSafeAreaInsets();
  const topInset = insets.top > 0 ? insets.top : 20;

  const isAllSelected = selectedCategories.length === 0;

  return (
    <View style={[styles.container, { top: topInset + 60 }]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* All chip */}
        <Pressable
          style={[styles.chip, isAllSelected && styles.chipSelected]}
          onPress={clearCategories}
          accessibilityLabel={t('categories.all')}
          accessibilityRole="button"
        >
          <Text
            style={[styles.chipText, isAllSelected && styles.chipTextSelected]}
          >
            {t('categories.all')}
          </Text>
        </Pressable>

        {/* Category chips */}
        {CATEGORIES.map((cat) => {
          const isSelected = selectedCategories.includes(cat.slug);
          const categoryName = t(cat.translationKey);
          return (
            <Pressable
              key={cat.slug}
              style={[
                styles.chip,
                isSelected && { backgroundColor: cat.color },
              ]}
              onPress={() => toggleCategory(cat.slug)}
              accessibilityLabel={categoryName}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
            >
              {CATEGORY_ICONS[cat.slug] && <Image source={CATEGORY_ICONS[cat.slug]} style={styles.chipIcon} />}
              <Text
                style={[styles.chipText, isSelected && styles.chipTextSelected]}
              >
                {categoryName}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 80,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingVertical: 8,
  },
  scrollContent: {
    paddingHorizontal: 12,
    gap: 8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 2,
    backgroundColor: "white",
    borderWidth: 2,
    borderColor: "rgba(0, 0, 0, 0.2)",
    shadowColor: "#000",
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 0,
    elevation: 2,
  },
  chipIcon: {
    width: 16,
    height: 16,
  },
  chipSelected: {
    backgroundColor: "#FF4B4B",
    borderColor: "#CC3C3C",
  },
  chipText: {
    fontSize: 14,
    fontFamily: "Silkscreen",
    color: "#333",
  },
  chipTextSelected: {
    color: "white",
  },
});
