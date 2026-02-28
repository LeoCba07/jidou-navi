// Storage helpers for machine photos
// Bucket must be created first - already ran supabase/storage.sql in Supabase
import { supabase } from './supabase';

const BUCKET = 'machine-photos';
const AVATAR_BUCKET = 'avatars';

// Upload a photo, returns the public URL
export async function uploadPhoto(
  userId: string,
  machineId: string | null,
  file: { uri: string; type: string; name: string; size?: number }
): Promise<string> {
  // 1. Validation First (Don't consume rate limit for invalid files)
  const MAX_SIZE = 5 * 1024 * 1024; // 5MB
  if (file.size && file.size > MAX_SIZE) {
    throw new Error('File size exceeds 5MB limit');
  }

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Invalid file type. Only JPG, PNG and WebP are allowed.');
  }

  // 2. Rate Limit Check (Cost Control)
  const { error: limitError } = await supabase.rpc('check_upload_limit');
  if (limitError) {
    if (limitError.message.includes('Rate limit exceeded')) {
      throw new Error('Upload limit reached. Please try again in an hour.');
    }
    throw limitError;
  }

  const randomId = Math.random().toString(36).slice(2, 10);
  const path = machineId
    ? `${userId}/${machineId}/${Date.now()}-${randomId}-${file.name}`
    : `${userId}/pending/${Date.now()}-${randomId}-${file.name}`;

  // Read file as blob for Supabase upload
  const response = await fetch(file.uri);
  const blob = await response.blob();

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, {
      contentType: file.type,
    });

  if (error) throw error;

  return getPhotoUrl(path);
}

// Upload an avatar, returns the public URL
export async function uploadAvatar(
  userId: string,
  file: { uri: string; type: string; name: string; size?: number }
): Promise<string> {
  // 1. Validation First (2MB for avatars, before rate limit)
  const MAX_SIZE = 2 * 1024 * 1024; // 2MB
  if (file.size && file.size > MAX_SIZE) {
    throw new Error('File size exceeds 2MB limit');
  }

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Invalid file type. Only JPG, PNG and WebP are allowed.');
  }

  // 2. Rate Limit Check (Cost Control)
  const { error: limitError } = await supabase.rpc('check_upload_limit');
  if (limitError) {
    if (limitError.message.includes('Rate limit exceeded')) {
      throw new Error('Upload limit reached. Please try again in an hour.');
    }
    throw limitError;
  }

  // 3. Preserve extension
  const extensionMatch = file.name.match(/\.[^./]+$/);
  const extension = extensionMatch ? extensionMatch[0] : '.jpg';

  // 4. Path logic - use fixed name to overwrite old avatar
  const path = `${userId}/avatar${extension}`;

  // 5. Read file as blob for Supabase upload
  const response = await fetch(file.uri);
  const blob = await response.blob();

  // 6. Upload with upsert
  const { error } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(path, blob, {
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
