import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

let _supabaseInstance: SupabaseClient<Database> | undefined;

function initializeSupabase(): SupabaseClient<Database> {
  if (_supabaseInstance) {
    return _supabaseInstance;
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
  }

  _supabaseInstance = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  return _supabaseInstance;
}

// Export using a getter to delay initialization
export const supabase: SupabaseClient<Database> = new Proxy({} as SupabaseClient<Database>, {
  get: (_target, prop, receiver) => {
    const client = initializeSupabase();
    const value = Reflect.get(client, prop, client);
    return typeof value === 'function' ? value.bind(client) : value;
  },
  set: (_target, prop, value) => {
    const client = initializeSupabase();
    return Reflect.set(client, prop, value, client);
  },
  has: (_target, prop) => {
    const client = initializeSupabase();
    return Reflect.has(client, prop);
  },
});
