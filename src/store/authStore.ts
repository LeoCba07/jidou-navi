// Auth state - user session and profile
// Zustand = simple global state. Any component can read/update this data.
// Usage: const user = useAuthStore((state) => state.user)
import { create } from 'zustand';
import { Session, User } from '@supabase/supabase-js';
import { Tables } from '../lib/database.types';

type Profile = Tables<'profiles'>;

interface AuthState {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setSession: (session: Session | null) => void;
  setProfile: (profile: Profile | null) => void;
  setLoading: (isLoading: boolean) => void;
  reset: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  profile: null,
  isLoading: true,
  setUser: (user) => set({ user }),
  setSession: (session) => set({ session }),
  setProfile: (profile) => set({ profile }),
  setLoading: (isLoading) => set({ isLoading }),
  reset: () => set({ user: null, session: null, profile: null, isLoading: false }),
}));
