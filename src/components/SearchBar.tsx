// Search bar component for finding machines
import { useState, useCallback } from "react";
import {
  View,
  TextInput,
  StyleSheet,
  Pressable,
  Text,
  FlatList,
  Keyboard,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { searchMachines, SearchResult } from "../lib/machines";

type SearchBarProps = {
  onResultSelect?: (result: SearchResult) => void;
};

export function SearchBar({ onResultSelect }: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);

  // Debounced search
  const handleSearch = useCallback(async (text: string) => {
    setQuery(text);

    if (text.trim().length < 2) {
      setResults([]);
      setShowResults(false);
      return;
    }

    setIsSearching(true);
    const data = await searchMachines(text);
    setResults(data);
    setShowResults(true);
    setIsSearching(false);
  }, []);

  const handleResultPress = (result: SearchResult) => {
    Keyboard.dismiss();
    setShowResults(false);
    setQuery("");

    if (onResultSelect) {
      onResultSelect(result);
    } else {
      // Navigate to machine detail
      router.push({
        pathname: "/machine/[id]",
        params: {
          id: result.id,
          name: result.name || "",
          description: result.description || "",
          address: result.address || "",
          latitude: String(result.latitude),
          longitude: String(result.longitude),
          visit_count: String(result.visit_count),
          status: result.status || "",
        },
      });
    }
  };

  const handleClear = () => {
    setQuery("");
    setResults([]);
    setShowResults(false);
  };

  return (
    <View style={styles.container}>
      {/* Search input */}
      <View style={styles.inputContainer}>
        <Ionicons name="search" size={20} color="#999" style={styles.icon} />
        <TextInput
          style={styles.input}
          value={query}
          onChangeText={handleSearch}
          placeholder="Search machines..."
          placeholderTextColor="#999"
          returnKeyType="search"
          autoCorrect={false}
          autoCapitalize="none"
        />
        {query.length > 0 && (
          <Pressable onPress={handleClear} style={styles.clearButton}>
            <Ionicons name="close-circle" size={20} color="#999" />
          </Pressable>
        )}
      </View>

      {/* Results dropdown */}
      {showResults && results.length > 0 && (
        <View style={styles.resultsContainer}>
          <FlatList
            data={results}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <Pressable
                style={styles.resultItem}
                onPress={() => handleResultPress(item)}
              >
                <View style={styles.resultContent}>
                  <Text style={styles.resultName} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={styles.resultAddress} numberOfLines={1}>
                    {item.address}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#ccc" />
              </Pressable>
            )}
          />
        </View>
      )}

      {/* No results message */}
      {showResults && results.length === 0 && query.length >= 2 && !isSearching && (
        <View style={styles.resultsContainer}>
          <Text style={styles.noResults}>No machines found</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 60,
    left: 12,
    right: 12,
    zIndex: 20,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 12,
    paddingHorizontal: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  icon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: "#333",
  },
  clearButton: {
    padding: 4,
  },
  resultsContainer: {
    marginTop: 8,
    backgroundColor: "white",
    borderRadius: 12,
    maxHeight: 250,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
    overflow: "hidden",
  },
  resultItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  resultContent: {
    flex: 1,
  },
  resultName: {
    fontSize: 15,
    fontWeight: "500",
    color: "#333",
    marginBottom: 2,
  },
  resultAddress: {
    fontSize: 13,
    color: "#666",
  },
  noResults: {
    padding: 16,
    textAlign: "center",
    color: "#999",
    fontSize: 14,
  },
});
