// EXIF metadata extraction utilities
import { readAsync, type ExifTags } from '@lodev09/react-native-exify';

export interface GpsCoordinates {
  latitude: number;
  longitude: number;
}

/**
 * Check if coordinates are valid (not null island, within bounds, finite numbers)
 */
export function isValidCoordinate(lat: number, lng: number): boolean {
  // Must be finite numbers
  if (!isFinite(lat) || !isFinite(lng)) {
    return false;
  }

  // Latitude must be between -90 and 90
  if (lat < -90 || lat > 90) {
    return false;
  }

  // Longitude must be between -180 and 180
  if (lng < -180 || lng > 180) {
    return false;
  }

  // Reject null island (0, 0) - unlikely to be a real vending machine location
  if (lat === 0 && lng === 0) {
    return false;
  }

  return true;
}

/**
 * Extract GPS coordinates from image EXIF metadata
 * Returns null if no GPS data found or if coordinates are invalid
 */
export async function extractGpsFromExif(uri: string): Promise<GpsCoordinates | null> {
  try {
    const exifData = await readAsync(uri);

    if (!exifData) {
      return null;
    }

    // Check for GPS coordinates in EXIF data
    const latitude = exifData.GPSLatitude;
    const longitude = exifData.GPSLongitude;

    if (latitude === undefined || longitude === undefined) {
      return null;
    }

    // The library returns coordinates as numbers (already converted from DMS)
    const lat = typeof latitude === 'number' ? latitude : parseFloat(String(latitude));
    const lng = typeof longitude === 'number' ? longitude : parseFloat(String(longitude));

    if (isNaN(lat) || isNaN(lng)) {
      return null;
    }

    // Validate the coordinates
    if (!isValidCoordinate(lat, lng)) {
      return null;
    }

    return { latitude: lat, longitude: lng };
  } catch (error) {
    console.warn('Failed to extract EXIF GPS data:', error);
    return null;
  }
}
