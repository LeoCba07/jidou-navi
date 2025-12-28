// Storage helpers for machine photos
// Bucket must be created first - already ran supabase/storage.sql in Supabase
import { supabase } from './supabase';

const BUCKET = 'machine-photos';

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
