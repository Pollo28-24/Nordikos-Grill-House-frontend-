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
    
    this.supabaseClient = createClient(
      environment.supabaseUrl, 
      environment.supabaseKey,
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
