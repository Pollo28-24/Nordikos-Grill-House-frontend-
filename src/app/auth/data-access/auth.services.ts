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

  private readonly _user = signal<User | null>(null);
  private readonly _isAuthenticated = signal<boolean | null>(null); // null means "not checked yet"

  readonly user = this._user.asReadonly();
  readonly isAuthenticated = this._isAuthenticated.asReadonly();

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.setupAuthListener();
    }
  }

  /**
   * Initializes auth state. Used in APP_INITIALIZER to prevent flicker.
   */
  async init(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) {
      this._isAuthenticated.set(false);
      return;
    }

    try {
      const { data: { session }, error } = await this.supabase.auth.getSession();
      if (error) throw error;
      
      this._user.set(session?.user ?? null);
      this._isAuthenticated.set(!!session?.user);
    } catch (error) {
      this.logger.error('Error during auth initialization', error, 'AuthService');
      this._user.set(null);
      this._isAuthenticated.set(false);
    }
  }

  private setupAuthListener() {
    this.supabase.auth.onAuthStateChange((_event, session) => {
      this._user.set(session?.user ?? null);
      this._isAuthenticated.set(!!session?.user);
    });
  }

  getSession() {
    return this.supabase.auth.getSession();
  }

  session() {
    return this.getSession();
  }

  async getUser() {
    if (this._isAuthenticated() !== null) {
      return { data: { user: this._user() }, error: null };
    }
    return this.getUserFromServer();
  }

  private async getUserFromServer() {
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
