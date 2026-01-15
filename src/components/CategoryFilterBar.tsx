// Horizontal filter bar with category chips for the map
import { View, ScrollView, Pressable, Text, StyleSheet } from "react-native";
import { useUIStore } from "../store";

// TODO: Consider fetching categories from database for consistency
const CATEGORIES = [
  { slug: "drinks", name: "Drinks", color: "#3C91E6" },
  { slug: "food", name: "Food", color: "#FF4B4B" },
  { slug: "gachapon", name: "Gachapon", color: "#FFB7CE" },
  { slug: "weird", name: "Weird", color: "#9B59B6" },
  { slug: "retro", name: "Retro", color: "#FFD966" },
  { slug: "ice-cream", name: "Ice Cream", color: "#E74C3C" },
  { slug: "coffee", name: "Coffee", color: "#8B4513" },
  { slug: "alcohol", name: "Alcohol", color: "#F39C12" },
];

export function CategoryFilterBar() {
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
          accessibilityLabel="Show all categories"
          accessibilityRole="button"
        >
          <Text
            style={[styles.chipText, isAllSelected && styles.chipTextSelected]}
          >
            All
          </Text>
        </Pressable>

        {/* Category chips */}
        {CATEGORIES.map((cat) => {
          const isSelected = selectedCategories.includes(cat.slug);
          return (
            <Pressable
              key={cat.slug}
              style={[
                styles.chip,
                isSelected && { backgroundColor: cat.color },
              ]}
              onPress={() => toggleCategory(cat.slug)}
              accessibilityLabel={`Filter by ${cat.name} category`}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
            >
              <Text
                style={[styles.chipText, isSelected && styles.chipTextSelected]}
              >
                {cat.name}
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
