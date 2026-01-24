// Storage helpers for machine photos
// Bucket must be created first - already ran supabase/storage.sql in Supabase
import { supabase } from './supabase';
import * as FileSystem from 'expo-file-system/legacy';

const BUCKET = 'machine-photos';
const AVATAR_BUCKET = 'avatars';

// Upload a photo, returns the public URL
export async function uploadPhoto(
  userId: string,
  machineId: string,
  file: { uri: string; type: string; name: string }
): Promise<string> {
  const path = `${userId}/${machineId}/${Date.now()}-${file.name}`;

  // Read file as base64 and convert to ArrayBuffer
  const base64 = await FileSystem.readAsStringAsync(file.uri, {
    encoding: 'base64',
  });
  const arrayBuffer = base64ToArrayBuffer(base64);

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, arrayBuffer, {
      contentType: file.type,
    });

  if (error) throw error;

  return getPhotoUrl(path);
}

// Helper to decode base64 to ArrayBuffer (avoids external dependency)
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = global.atob ? global.atob(base64) : Buffer.from(base64, 'base64').toString('binary');
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

// Upload an avatar, returns the public URL
export async function uploadAvatar(
  userId: string,
  file: { uri: string; type: string; name: string; size?: number }
): Promise<string> {
  // 1. Validation
  const MAX_SIZE = 5 * 1024 * 1024; // 5MB
  if (file.size && file.size > MAX_SIZE) {
    throw new Error('File size exceeds 5MB limit');
  }

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Invalid file type. Only JPG, PNG and WebP are allowed.');
  }

  // 2. Preserve extension
  const extensionMatch = file.name.match(/\.[^./]+$/);
  const extension = extensionMatch ? extensionMatch[0] : '.jpg';

  // 3. Path logic - use fixed name to overwrite old avatar
  const path = `${userId}/avatar${extension}`;

  // 4. Read file as base64 and convert to ArrayBuffer
  const base64 = await FileSystem.readAsStringAsync(file.uri, {
    encoding: 'base64',
  });
  const arrayBuffer = base64ToArrayBuffer(base64);

  // 5. Upload with upsert
  const { error } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(path, arrayBuffer, {
      contentType: file.type,
      upsert: true,
    });

  if (error) throw error;

  return getPhotoUrl(path, AVATAR_BUCKET);
}

// Get public URL for a photo
export function getPhotoUrl(path: string, bucket: string = BUCKET): string {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

// Delete a photo
export async function deletePhoto(path: string): Promise<void> {
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) throw error;
}
