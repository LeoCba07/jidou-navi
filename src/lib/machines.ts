// API functions for fetching machines from Supabase
import { supabase } from './supabase';

export type SearchResult = {
  id: string;
  name: string;
  description: string;
  address: string;
  latitude: number;
  longitude: number;
  status: string;
  visit_count: number;
  similarity_score: number;
};

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
  console.log('📡 API: nearby_machines RPC called', { lat, lng, radiusMeters });

  const { data, error } = await supabase.rpc('nearby_machines', {
    lat,
    lng,
    radius_meters: radiusMeters,
    limit_count: 50,
  });

  if (error) {
    console.error('❌ API: RPC error:', error.message);
    console.error('Error details:', error);
    return [];
  }

  console.log('✓ API: RPC returned', data?.length || 0, 'machines');
  return (data || []) as NearbyMachine[];
}

// Search machines by name, description, or address (fuzzy search)
export async function searchMachines(
  searchTerm: string,
  limit: number = 20
): Promise<SearchResult[]> {
  if (!searchTerm.trim()) {
    return [];
  }

  const { data, error } = await supabase.rpc('search_machines', {
    search_term: searchTerm.trim(),
    limit_count: limit,
  });

  if (error) {
    console.error('Error searching machines:', error);
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

// Type for saved machine with details
export type SavedMachine = {
  id: string;
  machine_id: string;
  saved_at: string;
  machine: {
    id: string;
    name: string;
    description: string;
    address: string;
    latitude: number;
    longitude: number;
    primary_photo_url: string | null;
    status: string;
    visit_count: number;
  };
};

// Save a machine (bookmark)
export async function saveMachine(machineId: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    console.error('Error saving machine: No authenticated user');
    return false;
  }

  const { error } = await supabase
    .from('saved_machines')
    .insert({ machine_id: machineId, user_id: user.id });

  if (error) {
    console.error('Error saving machine:', error);
    return false;
  }

  return true;
}

// Unsave a machine (remove bookmark)
export async function unsaveMachine(machineId: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    console.error('Error unsaving machine: No authenticated user');
    return false;
  }

  const { error } = await supabase
    .from('saved_machines')
    .delete()
    .eq('machine_id', machineId)
    .eq('user_id', user.id);

  if (error) {
    console.error('Error unsaving machine:', error);
    return false;
  }

  return true;
}

// Fetch all saved machine IDs for current user (for quick lookup)
export async function fetchSavedMachineIds(): Promise<string[]> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const { data, error } = await supabase
    .from('saved_machines')
    .select('machine_id')
    .eq('user_id', user.id);

  if (error) {
    console.error('Error fetching saved machine IDs:', error);
    return [];
  }

  return data?.map((item) => item.machine_id) || [];
}

// Fetch saved machines with full details
export async function fetchSavedMachines(): Promise<SavedMachine[]> {
  const { data, error } = await supabase
    .from('saved_machines')
    .select(`
      id,
      machine_id,
      saved_at,
      machine:machines (
        id,
        name,
        description,
        address,
        latitude,
        longitude,
        status,
        visit_count
      )
    `)
    .order('saved_at', { ascending: false });

  if (error) {
    console.error('Error fetching saved machines:', error);
    return [];
  }

  if (!data || data.length === 0) {
    return [];
  }

  // Batch fetch primary photos for all machines in one query
  const machineIds = data.map((item) => item.machine_id);
  const { data: photoData } = await supabase
    .from('machine_photos')
    .select('machine_id, photo_url')
    .in('machine_id', machineIds)
    .eq('is_primary', true)
    .eq('status', 'active');

  // Create a map of machine_id to photo_url for fast lookup
  const photoMap = new Map<string, string>();
  if (photoData) {
    photoData.forEach((photo) => {
      photoMap.set(photo.machine_id, photo.photo_url);
    });
  }

  // Attach photos to machines
  const machinesWithPhotos = data.map((item) => ({
    ...item,
    machine: {
      ...item.machine,
      primary_photo_url: photoMap.get(item.machine_id) || null,
    },
  }));

  return machinesWithPhotos as SavedMachine[];
}
