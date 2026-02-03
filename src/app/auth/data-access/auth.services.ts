import { inject, Injectable } from '@angular/core';
import { SupabaseService } from '../../shared/data-access/supabase.service';
import { SignInWithPasswordCredentials } from '@supabase/supabase-js';

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

  // ===== SESSION =====
  getSession() {
    return this.supabase.auth.getSession();
  }

  // compatibilidad opcional
  session() {
    return this.getSession();
  }

  getUser() {
    return this.supabase.auth.getUser();
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
