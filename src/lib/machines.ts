// API functions for fetching machines from Supabase
import { supabase } from './supabase';

// Calculate distance between two coordinates using Haversine formula
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

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
  verification_count?: number;
  last_verified_at?: string;
  directions_hint?: string | null;
};

// Fetch a single machine by ID
export async function fetchMachineById(machineId: string): Promise<NearbyMachine | null> {
  try {
    const { data, error } = await supabase
      .from('machines_with_details')
      .select('*')
      .eq('id', machineId)
      .eq('status', 'active')
      .single();

    if (error) {
      console.error('Error fetching machine by ID:', error);
      return null;
    }

    return data as unknown as NearbyMachine;
  } catch (e) {
    console.error('Network error fetching machine by ID:', e);
    return null;
  }
}

// Fetch machines within radius of a location
// Returns null on network failure so caller can keep cached data
export async function fetchNearbyMachines(
  lat: number,
  lng: number,
  radiusMeters: number = 5000
): Promise<NearbyMachine[] | null> {
  try {
    const { data, error } = await supabase.rpc('nearby_machines', {
      lat,
      lng,
      radius_meters: radiusMeters,
      limit_count: 50,
    });

    if (error) {
      console.error('Error fetching nearby machines:', error);
      return null; // Return null so caller keeps cached data
    }

    return (data || []) as NearbyMachine[];
  } catch (e) {
    // Network error - request failed entirely
    console.error('Network error fetching machines:', e);
    return null;
  }
}

// Bounds type for map viewport queries
export type MapBounds = {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
};

// Fetch machines within bounding box (for map viewport)
// Returns null on network failure so caller can keep cached data
export async function fetchMachinesInBounds(
  bounds: MapBounds,
  limit: number = 200
): Promise<NearbyMachine[] | null> {
  try {
    const { data, error } = await supabase.rpc('machines_in_bounds', {
      min_lat: bounds.minLat,
      max_lat: bounds.maxLat,
      min_lng: bounds.minLng,
      max_lng: bounds.maxLng,
      limit_count: limit,
    });

    if (error) {
      console.error('Error fetching machines in bounds:', error);
      return null;
    }

    return (data || []) as NearbyMachine[];
  } catch (e) {
    console.error('Network error fetching machines in bounds:', e);
    return null;
  }
}

// Search result with error handling
export type SearchResponse = {
  data: SearchResult[];
  error: string | null;
};

// Search machines by name, description, or address (fuzzy search)
export async function searchMachines(
  searchTerm: string,
  limit: number = 20
): Promise<SearchResponse> {
  if (!searchTerm.trim()) {
    return { data: [], error: null };
  }

  try {
    const { data, error } = await supabase.rpc('search_machines', {
      search_term: searchTerm.trim(),
      limit_count: limit,
    });

    if (error) {
      console.error('Error searching machines:', error);
      return { data: [], error: 'search_failed' };
    }

    return { data: data || [], error: null };
  } catch (e) {
    console.error('Network error searching machines:', e);
    return { data: [], error: 'search_failed' };
  }
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
    last_verified_at: string | null;
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

// Fetch all photos for a machine
export async function fetchMachinePhotos(machineId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('machine_photos')
    .select('photo_url')
    .eq('machine_id', machineId)
    .eq('status', 'active')
    .order('is_primary', { ascending: false }) // Primary first
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching machine photos:', error);
    return [];
  }

  return data.map(p => p.photo_url);
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

// Fetch all machine IDs that the current user has visited
export async function fetchVisitedMachineIds(): Promise<string[]> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const { data, error } = await supabase
    .from('visits')
    .select('machine_id')
    .eq('user_id', user.id);

  if (error) {
    console.error('Error fetching visited machine IDs:', error);
    return [];
  }

  // Return unique machine IDs
  const uniqueIds = [...new Set(data?.map((item) => item.machine_id) || [])];
  return uniqueIds;
}

// Type for discover/trending machine
export type DiscoverMachine = {
  id: string;
  name: string;
  description: string;
  address: string;
  latitude: number;
  longitude: number;
  primary_photo_url: string | null;
  status: string;
  visit_count: number;
  created_at: string;
  categories: MachineCategory[] | null;
  last_verified_at: string | null;
};

// Type for machine with engagement data (upvotes, visitors)
export type EngagedMachine = {
  id: string;
  name: string;
  description: string;
  address: string;
  latitude: number;
  longitude: number;
  distance_meters?: number;
  primary_photo_url: string | null;
  status: string;
  visit_count: number;
  upvote_count: number;
  weekly_activity?: number;
  categories: MachineCategory[] | null;
};

// Type for machine visitor
export type MachineVisitor = {
  user_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  visited_at: string;
};

// Fetch popular machines (sorted by visit count)
export async function fetchPopularMachines(limit: number = 20): Promise<DiscoverMachine[]> {
  const { data, error } = await supabase
    .from('machines_with_details')
    .select(`
      id,
      name,
      description,
      address,
      latitude,
      longitude,
      primary_photo_url,
      status,
      visit_count,
      created_at,
      categories,
      last_verified_at
    `)
    .eq('status', 'active')
    .order('visit_count', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching popular machines:', error);
    return [];
  }

  return (data || []).map(m => ({
    ...m,
    categories: m.categories as MachineCategory[] | null,
  })) as DiscoverMachine[];
}

// Fetch recently added machines
export async function fetchRecentMachines(limit: number = 20): Promise<DiscoverMachine[]> {
  const { data, error } = await supabase
    .from('machines_with_details')
    .select(`
      id,
      name,
      description,
      address,
      latitude,
      longitude,
      primary_photo_url,
      status,
      visit_count,
      created_at,
      categories,
      last_verified_at
    `)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching recent machines:', error);
    return [];
  }

  return (data || []).map(m => ({
    ...m,
    categories: m.categories as MachineCategory[] | null,
  })) as DiscoverMachine[];
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
        visit_count,
        last_verified_at
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

// Fetch nearby machines with engagement data (upvotes)
export async function fetchNearbyMachinesWithEngagement(
  lat: number,
  lng: number,
  radiusMeters: number = 5000,
  limit: number = 20
): Promise<EngagedMachine[]> {
  try {
    const { data, error } = await supabase.rpc('nearby_machines_with_engagement', {
      lat,
      lng,
      radius_meters: radiusMeters,
      limit_count: limit,
    });

    if (error) {
      console.error('Error fetching nearby machines with engagement:', error);
      return [];
    }

    return (data || []).map((m: { categories: unknown }) => ({
      ...m,
      categories: m.categories as MachineCategory[] | null,
    })) as EngagedMachine[];
  } catch (e) {
    console.error('Network error fetching nearby machines with engagement:', e);
    return [];
  }
}

// Fetch popular machines this week (by combined visits + upvotes)
export async function fetchPopularThisWeek(limit: number = 10): Promise<EngagedMachine[]> {
  try {
    const { data, error } = await supabase.rpc('popular_machines_this_week', {
      limit_count: limit,
    });

    if (error) {
      console.error('Error fetching popular machines this week:', error);
      return [];
    }

    return (data || []).map((m: { categories: unknown }) => ({
      ...m,
      categories: m.categories as MachineCategory[] | null,
    })) as EngagedMachine[];
  } catch (e) {
    console.error('Network error fetching popular machines this week:', e);
    return [];
  }
}

// Fetch recent visitors for a machine
export async function fetchMachineVisitors(
  machineId: string,
  limit: number = 5
): Promise<MachineVisitor[]> {
  try {
    const { data, error } = await supabase.rpc('get_machine_visitors', {
      p_machine_id: machineId,
      limit_count: limit,
    });

    if (error) {
      console.error('Error fetching machine visitors:', error);
      return [];
    }

    return data || [];
  } catch (e) {
    console.error('Network error fetching machine visitors:', e);
    return [];
  }
}

// Fetch visitor count for a machine
export async function fetchMachineVisitorCount(machineId: string): Promise<number> {
  try {
    const { data, error } = await supabase.rpc('get_machine_visitor_count', {
      p_machine_id: machineId,
    });

    if (error) {
      console.error('Error fetching machine visitor count:', error);
      return 0;
    }

    return data || 0;
  } catch (e) {
    console.error('Network error fetching machine visitor count:', e);
    return 0;
  }
}

// Report reason types
export type ReportReason = 'not_exists' | 'duplicate' | 'wrong_location' | 'inappropriate' | 'other';

// Report result from RPC
type ReportResult = {
  success: boolean;
  error?: string;
};

// Report a machine for an issue
export async function reportMachine(
  machineId: string,
  reason: ReportReason,
  details?: string
): Promise<ReportResult> {
  try {
    // @ts-expect-error - report_machine RPC not yet in generated types
    const { data, error } = await supabase.rpc('report_machine', {
      p_machine_id: machineId,
      p_reason: reason,
      p_details: details || null,
    });

    if (error) {
      console.error('Error reporting machine:', error);
      return { success: false, error: 'network_error' };
    }

    return data as unknown as ReportResult;
  } catch (e) {
    console.error('Network error reporting machine:', e);
    return { success: false, error: 'network_error' };
  }
}
