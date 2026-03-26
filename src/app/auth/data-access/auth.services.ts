import { inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { SupabaseService } from '../../shared/data-access/supabase.service';
import { SignInWithPasswordCredentials, User } from '@supabase/supabase-js';
import { EncryptionService } from '../../core/services/encryption.service';

export interface EmailSignUp {
  email: string;
  password: string;
  name?: string;
  telefono?: string;
  curp?: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private platformId = inject(PLATFORM_ID);
  private supabase = inject(SupabaseService).supabaseClient;
  private encryptionService = inject(EncryptionService);

  // Signal for reactive auth state
  readonly user = signal<User | null>(null);

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.init();
    }
  }

  private async init() {
    // 1. Get initial session
    const {
      data: { session },
    } = await this.supabase.auth.getSession();
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
    const {
      data: { session },
      error: sessionError,
    } = await this.getSession();
    if (sessionError) {
      console.error('Error getting session:', sessionError);
      return { data: { user: null }, error: sessionError };
    }
    if (session && session.user) {
      console.log(
        'AuthService.getUser() resolved user from session:',
        session.user,
      );
      return { data: { user: session.user }, error: null };
    }
    console.log('AuthService.getUser() no active session or user in session.');
    return { data: { user: null }, error: null };
  }

  // ===== SIGN UP =====
  signUp(credentials: EmailSignUp) {
    // Encrypt sensitive fields
    const encryptedTelefono = credentials.telefono
      ? this.encryptionService.encrypt(credentials.telefono)
      : undefined;
    const encryptedCurp = credentials.curp
      ? this.encryptionService.encrypt(credentials.curp)
      : undefined;

    console.log('--- VERIFICACIÓN DE CIFRADO ---');
    console.log('Teléfono Original:', credentials.telefono);
    console.log('Teléfono Cifrado (a DB):', encryptedTelefono);
    console.log('CURP Original:', credentials.curp);
    console.log('CURP Cifrado (a DB):', encryptedCurp);
    console.log('-------------------------------');

    return this.supabase.auth.signUp({
      email: credentials.email,
      password: credentials.password,
      options: {
        data: {
          name: credentials.name,
          telefono: encryptedTelefono,
          curp: encryptedCurp,
        },
        emailRedirectTo: isPlatformBrowser(this.platformId) ? `${window.location.origin}/auth/callback` : '',
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
