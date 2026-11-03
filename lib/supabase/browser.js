'use client';
import { createBrowserClient } from '@supabase/ssr';
import { supabaseUrl, supabaseKey } from './config';
let client;
export function browserClient() {
  return client ||= createBrowserClient(supabaseUrl, supabaseKey);
}
