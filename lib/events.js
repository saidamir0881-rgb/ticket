import { createClient } from '@supabase/supabase-js';
import { supabaseUrl, supabaseKey } from './supabase/config';
import { demoEvents, demoVenues } from './demo';
function publicClient() {
  return createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: (url, init) => fetch(url, { ...init, signal: AbortSignal.timeout(8000), cache: 'no-store' }) } });
}
export async function listEvents() {
  try {
    const { data, error } = await publicClient().from('events').select('*, venue:venues(*)').eq('status', 'published').order('starts_at');
    if (error) throw error;
    return { events: data, setup: false };
  } catch { return { events: demoEvents, setup: true }; }
}
export async function getEvent(id) {
  if (id.startsWith('demo-')) {
    const sample = demoEvents.find(e => e.id === id);
    if (!sample) return null;
    // Old bookmarks must use real database seats after the seed is installed.
    const seededId = `20000000-0000-4000-8000-${id.slice(5).padStart(12, '0')}`;
    try {
      const { data, error } = await publicClient().from('events').select('*, venue:venues(*)').eq('id', seededId).eq('status', 'published').maybeSingle();
      if (!error && data) return data;
    } catch { /* The unprovisioned preview remains explicitly non-bookable. */ }
    return sample;
  }
  const { data, error } = await publicClient().from('events').select('*, venue:venues(*)').eq('id', id).eq('status', 'published').maybeSingle();
  if (error) return null;
  return data;
}
export async function listVenues() {
  try {
    const { data, error } = await publicClient().from('venues').select('*').order('name');
    if (error) throw error;
    return data;
  } catch { return demoVenues; }
}
