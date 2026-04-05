import { inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { SupabaseService } from '../../shared/data-access/supabase.service';
import { LoggerService } from '../../core/services/logger.service';
import { SignInWithPasswordCredentials, User } from '@supabase/supabase-js';

export interface EmailSignUp {
  email: string;
  password: string;
  name?: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private platformId = inject(PLATFORM_ID);
  private supabase = inject(SupabaseService).supabaseClient;
  private logger = inject(LoggerService);

  readonly user = signal<User | null>(null);

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.init();
    }
  }

  private async init() {
    const {
      data: { session },
    } = await this.supabase.auth.getSession();
    this.user.set(session?.user ?? null);

    this.supabase.auth.onAuthStateChange((_event, session) => {
      this.user.set(session?.user ?? null);
    });
  }

  getSession() {
    return this.supabase.auth.getSession();
  }

  session() {
    return this.getSession();
  }

  async getUser() {
    const {
      data: { session },
      error: sessionError,
    } = await this.getSession();
    if (sessionError) {
      this.logger.error('Error getting session', sessionError, 'AuthService');
      return { data: { user: null }, error: sessionError };
    }
    if (session && session.user) {
      return { data: { user: session.user }, error: null };
    }
    return { data: { user: null }, error: null };
  }

  signUp(credentials: EmailSignUp) {
    return this.supabase.auth.signUp({
      email: credentials.email,
      password: credentials.password,
      options: {
        data: {
          name: credentials.name,
        },
        emailRedirectTo: isPlatformBrowser(this.platformId) ? `${window.location.origin}/auth/callback` : '',
      },
    });
  }

  logIn(credentials: SignInWithPasswordCredentials) {
    return this.supabase.auth.signInWithPassword(credentials);
  }

  signOut() {
    return this.supabase.auth.signOut();
  }
}
