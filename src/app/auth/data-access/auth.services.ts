import { inject, Injectable, signal } from '@angular/core';
import { SupabaseService } from '../../shared/data-access/supabase.service';
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
  private supabase = inject(SupabaseService).supabaseClient;

  // Signal for reactive auth state
  readonly user = signal<User | null>(null);

  constructor() {
    this.init();
  }

  private async init() {
    // 1. Get initial session
    const { data: { session } } = await this.supabase.auth.getSession();
    this.user.set(session?.user ?? null);

    // 2. Listen for auth changes
    this.supabase.auth.onAuthStateChange((_event, session) => {
      this.user.set(session?.user ?? null);
    });
  }

  // ===== SESSION =====
  getSession() {
    return this.supabase.auth.getSession();
  }

  // compatibilidad opcional
  session() {
    return this.getSession();
  }

  async getUser() {
    const { data: { session }, error: sessionError } = await this.getSession();
    if (sessionError) {
      console.error('Error getting session:', sessionError);
      return { data: { user: null }, error: sessionError };
    }
    if (session && session.user) {
      console.log('AuthService.getUser() resolved user from session:', session.user);
      return { data: { user: session.user }, error: null };
    }
    console.log('AuthService.getUser() no active session or user in session.');
    return { data: { user: null }, error: null };
  }

  // ===== SIGN UP =====
  signUp(credentials: EmailSignUp) {
    return this.supabase.auth.signUp({
      email: credentials.email,
      password: credentials.password,
      options: {
        data: {
          name: credentials.name,
        },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  }

  // ===== LOGIN =====
  logIn(credentials: SignInWithPasswordCredentials) {
    return this.supabase.auth.signInWithPassword(credentials);
  }

  // ===== LOGOUT =====
  signOut() {
    return this.supabase.auth.signOut();
  }
}
