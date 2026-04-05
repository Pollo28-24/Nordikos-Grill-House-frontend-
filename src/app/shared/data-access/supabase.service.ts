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
    
    // Fallback strings to prevent crash during build/prerender if env vars are missing
    const supabaseUrl = env?.supabaseUrl || env?.SUPABASE_URL || environment.supabaseUrl || 'https://placeholder.supabase.co';
    const supabaseKey = env?.supabaseKey || env?.SUPABASE_KEY || environment.supabaseKey || 'placeholder';

    if ((!env?.supabaseUrl && !env?.SUPABASE_URL && !environment.supabaseUrl) || 
        (!env?.supabaseKey && !env?.SUPABASE_KEY && !environment.supabaseKey)) {
      console.warn('[SupabaseService] Missing Supabase configuration. Using placeholders for build/prerender.');
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
