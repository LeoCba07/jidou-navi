import * as StoreReview from 'expo-store-review';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY_LAST_REVIEW_REQUEST = 'jidou_navi_last_review_request';
const MIN_DAYS_BETWEEN_REQUESTS = 14;

/**
 * Attempts to request an app store review.
 * Will only show the prompt if:
 * 1. The device supports it.
 * 2. It hasn't been shown recently (default 14 days).
 */
export async function tryRequestAppReview() {
  try {
    // 1. Check availability
    const isAvailable = await StoreReview.hasAction();
    if (!isAvailable) {
      return;
    }

    // 2. Check frequency
    const lastRequestTimestamp = await AsyncStorage.getItem(STORAGE_KEY_LAST_REVIEW_REQUEST);
    if (lastRequestTimestamp) {
      const lastRequestDate = new Date(parseInt(lastRequestTimestamp, 10));
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - lastRequestDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays < MIN_DAYS_BETWEEN_REQUESTS) {
        // Too soon
        return;
      }
    }

    // 3. Request Review
    await StoreReview.requestReview();

    // 4. Update timestamp
    await AsyncStorage.setItem(STORAGE_KEY_LAST_REVIEW_REQUEST, Date.now().toString());
  } catch (error) {
    console.error('Error requesting app review:', error);
  }
}
