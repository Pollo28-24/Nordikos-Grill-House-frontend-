import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  private platformId = inject(PLATFORM_ID);
  supabaseClient: SupabaseClient;

  constructor() {
    const isBrowser = isPlatformBrowser(this.platformId);
    
    const env = isBrowser ? (window as any).__ENV__ : process.env;
    
    const supabaseUrl = env?.supabaseUrl || env?.SUPABASE_URL || environment.supabaseUrl;
    const supabaseKey = env?.supabaseKey || env?.SUPABASE_KEY || environment.supabaseKey;

    if (!supabaseUrl || !supabaseKey) {
      console.error('[SupabaseService] Missing Supabase configuration. Set SUPABASE_URL and SUPABASE_KEY environment variables.');
    }

    this.supabaseClient = createClient(
      supabaseUrl, 
      supabaseKey,
      {
        auth: {
          persistSession: isBrowser,
          autoRefreshToken: isBrowser,
          detectSessionInUrl: isBrowser
        }
      }
    );
  }

  get client() {
    return this.supabaseClient;
  }
}
