// API functions for fetching machines from Supabase
import { supabase } from './supabase';

export type MachineCategory = {
  id: string;
  slug: string;
  name: string;
  color: string;
};

export type NearbyMachine = {
  id: string;
  name: string;
  description: string;
  address: string;
  latitude: number;
  longitude: number;
  distance_meters: number;
  categories: MachineCategory[] | null;
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

// Filter machines by selected categories (OR logic)
export function filterMachinesByCategories(
  machines: NearbyMachine[],
  selectedCategories: string[]
): NearbyMachine[] {
  if (selectedCategories.length === 0) {
    return machines;
  }

  return machines.filter((machine) => {
    const cats = machine.categories || [];
    return cats.some((cat) => selectedCategories.includes(cat.slug));
  });
}
