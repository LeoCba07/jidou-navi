// Custom hook to get the top inset for safe area positioning
import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * Returns the top safe area inset with a fallback value.
 * Useful for positioning UI elements below the status bar/notch on devices.
 * 
 * @param fallback - The fallback value to use when the device has no notch (default: 20)
 * @returns The calculated top inset value
 */
export function useTopInset(fallback: number = 20): number {
  const insets = useSafeAreaInsets();
  return insets.top > 0 ? insets.top : fallback;
}
