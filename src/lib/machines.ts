// API functions for fetching machines from Supabase
import { supabase } from './supabase';

export type NearbyMachine = {
  id: string;
  name: string;
  description: string;
  address: string;
  latitude: number;
  longitude: number;
  distance_meters: number;
  categories: unknown;
  primary_photo_url: string;
  status: string;
  visit_count: number;
};

// Fetch machines within radius of a location
export async function fetchNearbyMachines(
  lat: number,
  lng: number,
  radiusMeters: number = 5000
): Promise<NearbyMachine[]> {
  const { data, error } = await supabase.rpc('nearby_machines', {
    lat,
    lng,
    radius_meters: radiusMeters,
    limit_count: 50,
  });

  if (error) {
    console.error('Error fetching nearby machines:', error);
    return [];
  }

  return data || [];
}
