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
    
    // 1. Prioritize injected variables from window.__ENV__ (Client) or process.env (Server)
    let supabaseUrl = env?.supabaseUrl || env?.SUPABASE_URL;
    let supabaseKey = env?.supabaseKey || env?.SUPABASE_KEY;

    // 2. Fallback to environment.ts (if defined there)
    if (!supabaseUrl || !supabaseKey) {
      supabaseUrl = environment.supabaseUrl;
      supabaseKey = environment.supabaseKey;
    }

    // 3. Last resort placeholders (only to prevent crash during build, but warning in console)
    const finalUrl = supabaseUrl || 'https://placeholder.supabase.co';
    const finalKey = supabaseKey || 'placeholder';

    if (isBrowser) {
      if (!supabaseUrl || !supabaseKey) {
        console.error('[SupabaseService] CRITICAL: Supabase configuration missing in browser!', {
          foundInWindow: (window as any).__ENV__,
          foundInEnvTs: { url: environment.supabaseUrl, key: '***' }
        });
      } else {
        console.log('[SupabaseService] Initialized correctly in browser.');
      }
    }

    this.supabaseClient = createClient(
      finalUrl, 
      finalKey,
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
