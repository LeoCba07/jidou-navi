// Horizontal filter bar with category chips for the map
import { View, ScrollView, Pressable, Text, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { useUIStore } from "../store";

// Category definitions with translation keys
const CATEGORIES = [
  { slug: "drinks", translationKey: "categories.drinks", color: "#3C91E6" },
  { slug: "food", translationKey: "categories.food", color: "#FF4B4B" },
  { slug: "gachapon", translationKey: "categories.gachapon", color: "#FFB7CE" },
  { slug: "weird", translationKey: "categories.weird", color: "#9B59B6" },
  { slug: "retro", translationKey: "categories.retro", color: "#FFD966" },
  { slug: "ice-cream", translationKey: "categories.iceCream", color: "#E74C3C" },
  { slug: "coffee", translationKey: "categories.coffee", color: "#8B4513" },
  { slug: "alcohol", translationKey: "categories.alcohol", color: "#F39C12" },
];

export function CategoryFilterBar() {
  const { t } = useTranslation();
  const selectedCategories = useUIStore((state) => state.selectedCategories);
  const toggleCategory = useUIStore((state) => state.toggleCategory);
  const clearCategories = useUIStore((state) => state.clearCategories);

  const isAllSelected = selectedCategories.length === 0;

  return (
    <View style={styles.container}>
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
  chipSelected: {
    backgroundColor: "#2B2B2B",
    borderColor: "#000",
  },
  chipText: {
    fontSize: 13,
    fontFamily: "Inter-Medium",
    color: "#333",
  },
  chipTextSelected: {
    color: "white",
  },
});
