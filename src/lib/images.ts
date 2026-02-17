import * as Manipulator from 'expo-image-manipulator';

/**
 * Shared utility for image processing across the app.
 * Handles resizing (capping the largest dimension) and compression while preserving format.
 */

export const IMAGE_LIMITS = {
  MACHINE: 1200,
  AVATAR: 400,
};

export const COMPRESSION_QUALITY = 0.7;

interface ProcessOptions {
  maxDimension: number;
  quality?: number;
}

/**
 * Resizes and compresses an image while maintaining aspect ratio and preserving format.
 */
export async function processImage(
  uri: string, 
  options: ProcessOptions = { maxDimension: IMAGE_LIMITS.MACHINE, quality: COMPRESSION_QUALITY }
): Promise<string> {
  try {
    const { maxDimension, quality = COMPRESSION_QUALITY } = options;

    // 1. Get image info to determine dimensions and format
    const info = await Manipulator.manipulateAsync(uri, [], { format: Manipulator.SaveFormat.JPEG }); // Dummy op to get info is not possible, getInfoAsync is better
    
    // Using manipulateAsync with empty actions to get current info
    // Actually, Expo Image Manipulator doesn't have a direct "getInfo" that is as reliable as just starting the process
    // But we can determine format from URI
    let format = Manipulator.SaveFormat.JPEG;
    const lowerUri = uri.toLowerCase();
    if (lowerUri.endsWith('.png')) format = Manipulator.SaveFormat.PNG;
    else if (lowerUri.endsWith('.webp')) format = Manipulator.SaveFormat.WEBP;

    // To get dimensions properly we need to use the result of a manipulation or Image.getSize
    // Manipulator.manipulateAsync returns width/height of the resulting image
    const initialResult = await Manipulator.manipulateAsync(uri, [], { compress: 1 });
    const { width, height } = initialResult;

    const actions: Manipulator.Action[] = [];
    const largestDimension = Math.max(width, height);

    if (largestDimension > maxDimension) {
      if (width >= height) {
        actions.push({ resize: { width: maxDimension } });
      } else {
        actions.push({ resize: { height: maxDimension } });
      }
    }

    const finalResult = await Manipulator.manipulateAsync(
      uri,
      actions,
      { compress: quality, format }
    );

    return finalResult.uri;
  } catch (error) {
    console.warn('[Images] Processing failed, falling back to original:', error);
    return uri;
  }
}
