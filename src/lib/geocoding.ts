// Reverse geocoding utility using Nominatim (OpenStreetMap)
// Uses free Nominatim API - no API key needed

export type ReverseGeocodeResult = {
  address: string | null;
  city: string | null;
  country: string | null;
};

/**
 * Reverse geocode coordinates to get an address
 * Uses Nominatim (OpenStreetMap) free API
 */
export async function reverseGeocode(
  latitude: number,
  longitude: number
): Promise<ReverseGeocodeResult> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'JidouNavi/1.0 (vending machine finder app)',
          'Accept-Language': 'en',
        },
      }
    );

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

    // Add specific location details
    if (addr.road || addr.street) {
      parts.push(addr.road || addr.street);
    }
    if (addr.house_number) {
      parts[parts.length - 1] = `${parts[parts.length - 1]} ${addr.house_number}`;
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

    return {
      address: parts.length > 0 ? parts.join(', ') : data.display_name || null,
      city,
      country,
    };
  } catch (error) {
    console.error('Reverse geocoding error:', error);
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
