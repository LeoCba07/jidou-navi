// Search bar component for finding machines
import { useState, useCallback, useRef, useEffect } from "react";
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
import { router, useFocusEffect } from "expo-router";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { searchMachines, SearchResult } from "../lib/machines";

type SearchBarProps = {
  onResultSelect?: (result: SearchResult) => void;
};

const DEBOUNCE_MS = 300;

export function SearchBar({ onResultSelect }: SearchBarProps) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const inputRef = useRef<TextInput>(null);

  // Refs for debounce and race condition handling
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const latestQueryRef = useRef<string>("");

  // Dismiss keyboard when screen loses focus
  useFocusEffect(
    useCallback(() => {
      return () => {
        Keyboard.dismiss();
        setIsFocused(false);
        setShowResults(false);
      };
    }, [])
  );

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  // Debounced search with race condition handling
  const handleSearch = useCallback((text: string) => {
    setQuery(text);
    latestQueryRef.current = text;
    setSearchError(null);

    // Clear previous debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (text.trim().length < 2) {
      setResults([]);
      setShowResults(false);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);

    // Debounce the actual search
    debounceRef.current = setTimeout(async () => {
      const { data, error } = await searchMachines(text);
      // Only update if this is still the latest query (race condition fix)
      if (latestQueryRef.current === text) {
        setResults(data);
        setSearchError(error);
        setShowResults(true);
        setIsSearching(false);
      }
    }, DEBOUNCE_MS);
  }, []);

  const handleResultPress = (result: SearchResult) => {
    Keyboard.dismiss();
    inputRef.current?.blur();
    setShowResults(false);
    setIsFocused(false);
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
          distance_meters: "",
          primary_photo_url: "",
        },
      });
    }
  };

  const handleClear = () => {
    setQuery("");
    setResults([]);
    setShowResults(false);
    setSearchError(null);
    latestQueryRef.current = "";
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
  };

  const dismissResults = () => {
    Keyboard.dismiss();
    inputRef.current?.blur();
    setShowResults(false);
    setIsFocused(false);
  };

  const insets = useSafeAreaInsets();
  const topInset = insets.top > 0 ? insets.top : 20;

  return (
    <>
      {/* Overlay to dismiss results when tapping outside - active when focused */}
      {isFocused && (
        <Pressable
          style={styles.overlay}
          onPress={dismissResults}
          accessibilityLabel={t('map.clearSearch')}
        />
      )}

      <View style={[styles.container, { top: topInset + 10 }]}>
        {/* Search input */}
        <View style={[styles.inputContainer, isFocused && styles.inputContainerFocused]}>
          <Ionicons name="search" size={20} color={isFocused ? "#FF4B4B" : "#999"} style={styles.icon} />
          <TextInput
            ref={inputRef}
            style={styles.input}
            value={query}
            onChangeText={handleSearch}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={t('map.searchPlaceholder')}
            placeholderTextColor="#999"
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
            accessibilityLabel={t('map.searchAccessibilityLabel')}
            accessibilityHint={t('map.searchAccessibilityHint')}
          />
          {query.length > 0 && (
            <Pressable
              onPress={handleClear}
              style={styles.clearButton}
              accessibilityLabel={t('map.clearSearch')}
              accessibilityRole="button"
            >
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
              removeClippedSubviews={true}
              maxToRenderPerBatch={10}
              windowSize={5}
              renderItem={({ item }) => (
                <Pressable
                  style={styles.resultItem}
                  onPress={() => handleResultPress(item)}
                  accessibilityLabel={`${item.name}, ${item.address}`}
                  accessibilityRole="button"
                  accessibilityHint="Tap to view on map"
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

        {/* Error message */}
        {showResults && searchError && !isSearching && (
          <View style={styles.resultsContainer}>
            <View style={styles.errorContainer}>
              <Ionicons name="warning-outline" size={18} color="#EF4444" />
              <Text style={styles.errorText}>{t('map.searchError')}</Text>
            </View>
          </View>
        )}

        {/* No results message */}
        {showResults && results.length === 0 && query.length >= 2 && !isSearching && !searchError && (
          <View style={styles.resultsContainer}>
            <Text style={styles.noResults}>{t('map.noMachinesFound')}</Text>
          </View>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 15,
  },
  container: {
    position: "absolute",
    top: 30,
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
    borderWidth: 2,
    borderColor: "transparent",
  },
  inputContainerFocused: {
    borderColor: "#FF4B4B",
    shadowOpacity: 0.25,
    elevation: 5,
  },
  icon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: "Inter",
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
    fontFamily: "Inter-Medium",
    color: "#333",
    marginBottom: 2,
  },
  resultAddress: {
    fontSize: 13,
    fontFamily: "Inter",
    color: "#666",
  },
  noResults: {
    padding: 16,
    textAlign: "center",
    fontFamily: "Inter",
    color: "#999",
    fontSize: 14,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    gap: 8,
  },
  errorText: {
    fontFamily: "Inter",
    color: "#EF4444",
    fontSize: 14,
  },
});
