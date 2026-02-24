import { Component, inject, signal } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { AuthService } from '../../data-access/auth.services';
import { ToastService } from '../../../core/services/toast.service';

interface LogInForm {
  email: FormControl<string | null>;
  password: FormControl<string | null>;
  challengeAnswer: FormControl<string | null>;
}

@Component({
  selector: 'app-log-in',
  standalone: true,
  imports: [ReactiveFormsModule, LucideAngularModule, RouterLink],
  template: `
    <div
      class="min-h-screen flex items-center justify-center
             bg-linear-to-br from-zinc-950 via-zinc-900 to-black
             text-zinc-100 px-4"
    >
      <form
        [formGroup]="form"
        (ngSubmit)="submit()"
        class="w-full max-w-md
               bg-[#121212]/80 backdrop-blur-xl
               border border-white/5
               p-8 rounded-3xl
               shadow-[0_20px_60px_rgba(0,0,0,0.6)]"
      >
        <!-- Header -->
        <div class="text-center mb-8">
          <img
            loading="lazy"
            src="assets/logo/logo.webp"
            alt="logo"
            class="w-20 h-20 mx-auto mb-3"
          />
          <h1 class="text-3xl font-bold tracking-wide">
            Iniciar Sesión
          </h1>
          <p class="text-sm text-zinc-400 mt-1">
            Nordikos Grill House
          </p>
        </div>

        <!-- Email -->
        <div class="mb-5">
          <label class="block text-sm mb-1 text-zinc-300">
            Correo
          </label>

          <div
            class="flex items-center gap-3
                   bg-zinc-800/70
                   border border-transparent
                   focus-within:border-amber-500
                   px-4 py-3 rounded-2xl transition"
          >
            <lucide-icon
              name="mail"
              class="w-5 h-5 text-zinc-400"
            />
            <input
              type="email"
              formControlName="email"
              autocomplete="email"
              class="w-full bg-transparent outline-none text-sm"
              placeholder="correo@nordikos.com"
            />
          </div>

          @if (email?.touched && email?.errors?.['required']) {
            <p class="text-xs text-red-400 mt-1">
              El correo es obligatorio
            </p>
          }
          @if (email?.touched && email?.errors?.['pattern']) {
            <p class="text-xs text-red-400 mt-1">Formato de correo inválido</p>
          }
        </div>

        <!-- Password -->
        <div class="mb-6">
          <label class="block text-sm mb-1 text-zinc-300">
            Contraseña
          </label>

          <div
            class="flex items-center gap-3
                   bg-zinc-800/70
                   border border-transparent
                   focus-within:border-amber-500
                   px-4 py-3 rounded-2xl transition"
          >
            <lucide-icon
              name="lock"
              class="w-5 h-5 text-zinc-400"
            />

            <input
              [type]="showPassword() ? 'text' : 'password'"
              formControlName="password"
              autocomplete="current-password"
              class="w-full bg-transparent outline-none text-sm"
              placeholder="••••••••"
            />

            <button
              type="button"
              (click)="togglePassword()"
              class="text-zinc-400 hover:text-amber-400 transition"
            >
              <lucide-icon
                [name]="showPassword() ? 'eye-off' : 'eye'"
                class="w-5 h-5"
              />
            </button>
          </div>

          @if (password?.touched && password?.errors?.['required']) {
            <p class="text-xs text-red-400 mt-1">
              La contraseña es obligatoria
            </p>
          }

          @if (password?.touched && password?.errors?.['minlength']) {
            <p class="text-xs text-red-400 mt-1">
              Mínimo 6 caracteres
            </p>
          }
        </div>

        @if (locked()) {
          <div class="mb-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3">
            <p class="text-sm text-red-400">
              Demasiados intentos. Espera {{ remainingLockSeconds() }}s para volver a intentar.
            </p>
          </div>
        }

        @if (challenge()) {
          <div class="mb-5">
            <label class="block text-sm mb-1 text-zinc-300">
              Verificación
            </label>
            <div
              class="flex items-center gap-3
                     bg-zinc-800/70
                     border border-transparent
                     focus-within:border-amber-500
                     px-4 py-3 rounded-2xl transition"
            >
              <lucide-icon name="check" class="w-5 h-5 text-zinc-400" />
              <input
                formControlName="challengeAnswer"
                class="w-full bg-transparent outline-none text-sm"
                [placeholder]="'Resuelve: ' + challenge()!.a + ' + ' + challenge()!.b"
              />
            </div>
            @if (form.get('challengeAnswer')?.touched && !challengeSolved()) {
              <p class="text-xs text-red-400 mt-1">
                Respuesta incorrecta
              </p>
            }
          </div>
        }

        <!-- Submit -->
        <button
          type="submit"
          [disabled]="form.invalid || loading() || locked() || (challenge() && !challengeSolved())"
          class="w-full
                 bg-amber-500 hover:bg-amber-400
                 disabled:bg-zinc-700 disabled:text-zinc-400
                 text-zinc-900 font-bold py-3
                 rounded-2xl
                 transition-all duration-200"
        >
          {{ loading() ? 'Ingresando...' : 'Ingresar' }}
        </button>

        <!-- Register -->
        <p class="text-sm text-center text-zinc-400 mt-6">
          ¿No tienes cuenta?
          <a
            routerLink="/auth/sign-up"
            class="text-amber-400 hover:text-amber-300 font-semibold ml-1"
          >
            Regístrate
          </a>
        </p>

        <p class="text-xs text-center text-zinc-500 mt-4">
          Sistema interno Nordikos Grill House
        </p>
      </form>
    </div>
  `,
})
export default class LogIn {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private toastService = inject(ToastService);

  showPassword = signal(false);
  loading = signal(false);
  failedAttempts = signal(0);
  lockUntil = signal<number | null>(null);
  challenge = signal<{ a: number; b: number } | null>(null);

  form = this.fb.group<LogInForm>({
    email: this.fb.control(null, [
      Validators.required,
      Validators.pattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-z]{2,}$/),
      Validators.maxLength(100),
    ]),
    password: this.fb.control(null, [
      Validators.required,
      Validators.minLength(6),
      Validators.maxLength(100),
    ]),
    challengeAnswer: this.fb.control(null),
  });

  get email() {
    return this.form.get('email');
  }

  get password() {
    return this.form.get('password');
  }

  togglePassword() {
    this.showPassword.update(v => !v);
  }

  constructor() {
    this.restoreThrottling();
  }

  locked() {
    const until = this.lockUntil();
    return !!until && Date.now() < until;
  }

  remainingLockSeconds() {
    const until = this.lockUntil();
    if (!until) return 0;
    const ms = until - Date.now();
    return ms > 0 ? Math.ceil(ms / 1000) : 0;
  }

  challengeSolved() {
    const ch = this.challenge();
    if (!ch) return true;
    const answer = (this.form.value.challengeAnswer ?? '').trim();
    const expected = ch.a + ch.b;
    return answer === String(expected);
  }

  private registerFailedAttempt() {
    const next = this.failedAttempts() + 1;
    this.failedAttempts.set(next);
    const base = Math.min(30000, Math.pow(2, Math.min(next, 6)) * 500);
    const delay = next >= 3 ? base : 0;
    if (delay > 0) {
      this.lockUntil.set(Date.now() + delay);
    }
    if (next >= 5 && !this.challenge()) {
      const a = Math.floor(Math.random() * 9) + 1;
      const b = Math.floor(Math.random() * 9) + 1;
      this.challenge.set({ a, b });
      this.form.get('challengeAnswer')?.reset();
    }
    this.persistThrottling();
    this.logAuthEvent(false, 'failed');
  }

  private resetThrottling() {
    this.failedAttempts.set(0);
    this.lockUntil.set(null);
    this.challenge.set(null);
    this.form.get('challengeAnswer')?.reset();
    this.persistThrottling();
  }

  private persistThrottling() {
    try {
      const payload = {
        failedAttempts: this.failedAttempts(),
        lockUntil: this.lockUntil(),
        challenge: this.challenge(),
      };
      localStorage.setItem('auth_throttle', JSON.stringify(payload));
    } catch {}
  }

  private restoreThrottling() {
    try {
      const raw = localStorage.getItem('auth_throttle');
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (typeof parsed?.failedAttempts === 'number') {
        this.failedAttempts.set(parsed.failedAttempts);
      }
      if (typeof parsed?.lockUntil === 'number') {
        this.lockUntil.set(parsed.lockUntil);
      }
      if (parsed?.challenge && typeof parsed.challenge.a === 'number' && typeof parsed.challenge.b === 'number') {
        this.challenge.set(parsed.challenge);
      }
    } catch {}
  }

  private logAuthEvent(success: boolean, reason?: string) {
    try {
      const entry = {
        type: 'login_attempt',
        email: this.form.value.email ?? '',
        success,
        reason: reason ?? null,
        ts: new Date().toISOString(),
        ua: navigator.userAgent,
      };
      const raw = localStorage.getItem('auth_logs');
      const arr = raw ? JSON.parse(raw) : [];
      arr.push(entry);
      localStorage.setItem('auth_logs', JSON.stringify(arr));
    } catch {}
  }

  async submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    if (this.locked()) {
      this.toastService.show('Demasiados intentos. Intenta más tarde', 'error');
      return;
    }

    if (this.challenge() && !this.challengeSolved()) {
      this.form.get('challengeAnswer')?.markAsTouched();
      return;
    }

    this.loading.set(true);

    try {
      const { error } = await this.authService.logIn({
        email: this.form.value.email ?? '',
        password: this.form.value.password ?? '',
      });

      if (error) throw error;

      this.toastService.show(
        '🔥 Bienvenido a Nordikos Grill House',
        'success'
      );

      this.router.navigateByUrl('/');
      this.resetThrottling();
      this.logAuthEvent(true, 'success');
    } catch {
      this.toastService.show(
        'Correo o contraseña incorrectos',
        'error'
      );

      this.password?.reset();
      this.registerFailedAttempt();
    } finally {
      this.loading.set(false);
    }
  }
}
