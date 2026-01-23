// Storage helpers for machine photos
// Bucket must be created first - already ran supabase/storage.sql in Supabase
import { supabase } from './supabase';

const BUCKET = 'machine-photos';
const AVATAR_BUCKET = 'avatars';

// Upload a photo, returns the public URL
export async function uploadPhoto(
  userId: string,
  machineId: string,
  file: { uri: string; type: string; name: string }
): Promise<string> {
  const path = `${userId}/${machineId}/${Date.now()}-${file.name}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, {
      uri: file.uri,
      type: file.type,
      name: file.name,
    } as any);

  if (error) throw error;

  return getPhotoUrl(path);
}

// Upload an avatar, returns the public URL
export async function uploadAvatar(
  userId: string,
  file: { uri: string; type: string; name: string }
): Promise<string> {
  // Use a fixed name or timestamp? Fixed name 'avatar.jpg' is easier to replace, 
  // but caching issues might occur. Timestamp is safer.
  // Path: {userId}/avatar-{timestamp}.jpg
  const path = `${userId}/avatar-${Date.now()}.jpg`;

  // Ideally, clean up old avatars here, but for now just upload new one.
  const { error } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(path, {
      uri: file.uri,
      type: file.type,
      name: file.name,
    } as any, {
      upsert: true, // Not strictly creating a new file if we keep the name, but with timestamp it's new.
    });

  if (error) throw error;

  const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

// Get public URL for a photo
export function getPhotoUrl(path: string): string {
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

// Delete a photo
export async function deletePhoto(path: string): Promise<void> {
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) throw error;
}
