// Reverse geocoding utility using Nominatim (OpenStreetMap)
// Uses free Nominatim API - no API key needed

export type ReverseGeocodeResult = {
  address: string | null;
  city: string | null;
  country: string | null;
};

// Simple in-memory cache to avoid repeated requests for same coordinates
const geocodeCache = new Map<string, ReverseGeocodeResult>();
const CACHE_KEY_PRECISION = 5; // ~1m precision
const REQUEST_TIMEOUT_MS = 10000;

function getCacheKey(lat: number, lng: number): string {
  return `${lat.toFixed(CACHE_KEY_PRECISION)},${lng.toFixed(CACHE_KEY_PRECISION)}`;
}

/**
 * Reverse geocode coordinates to get an address
 * Uses Nominatim (OpenStreetMap) free API with caching and timeout
 */
export async function reverseGeocode(
  latitude: number,
  longitude: number
): Promise<ReverseGeocodeResult> {
  // Check cache first
  const cacheKey = getCacheKey(latitude, longitude);
  const cached = geocodeCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'JidouNavi/1.0 (vending machine finder app)',
          'Accept-Language': 'en',
        },
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn('Reverse geocoding failed:', response.status);
      return { address: null, city: null, country: null };
    }

    const data = await response.json();

    if (!data || data.error) {
      return { address: null, city: null, country: null };
    }

    // Build a readable address from the response
    const addr = data.address || {};
    const parts: string[] = [];

    // Add street + house number (fixed logic to avoid index -1)
    const street = addr.road || addr.street;
    if (street && addr.house_number) {
      parts.push(`${street} ${addr.house_number}`);
    } else if (street) {
      parts.push(street);
    } else if (addr.house_number) {
      parts.push(addr.house_number);
    }

    if (addr.neighbourhood || addr.suburb || addr.quarter) {
      parts.push(addr.neighbourhood || addr.suburb || addr.quarter);
    }

    // City/town
    const city = addr.city || addr.town || addr.village || addr.municipality || null;
    if (city) {
      parts.push(city);
    }

    // Prefecture/state (for Japan)
    if (addr.state || addr.province) {
      parts.push(addr.state || addr.province);
    }

    const country = addr.country || null;

    const result: ReverseGeocodeResult = {
      address: parts.length > 0 ? parts.join(', ') : data.display_name || null,
      city,
      country,
    };

    // Cache the result
    geocodeCache.set(cacheKey, result);

    return result;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.warn('Reverse geocoding timed out');
    } else {
      console.error('Reverse geocoding error:', error);
    }
    return { address: null, city: null, country: null };
  }
}

/**
 * Generate a simple coordinate-based location hint
 * Useful as fallback when reverse geocoding fails
 */
export function formatCoordinatesAsLocation(
  latitude: number,
  longitude: number
): string {
  const latDir = latitude >= 0 ? 'N' : 'S';
  const lonDir = longitude >= 0 ? 'E' : 'W';
  return `${Math.abs(latitude).toFixed(4)}°${latDir}, ${Math.abs(longitude).toFixed(4)}°${lonDir}`;
}
