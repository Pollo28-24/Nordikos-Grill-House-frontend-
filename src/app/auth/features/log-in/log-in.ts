import { Component, inject } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { AuthService } from '../../data-access/auth.services';

interface LogInForm {
  email: FormControl<string | null>;
  password: FormControl<string | null>;
}

@Component({
  selector: 'app-log-in',
  standalone: true,
  imports: [ReactiveFormsModule, LucideAngularModule, RouterLink],
  template: `
    <div
      class="min-h-screen flex items-center justify-center bg-zinc-950 text-zinc-100 px-4 sm:px-6"
    >
      <form
        [formGroup]="form"
        (ngSubmit)="submit()"
        class="w-full max-w-sm sm:max-w-md bg-zinc-900 p-6 sm:p-8 rounded-2xl shadow-xl"
      >
        <!-- Header -->
        <div class="text-center mb-6 sm:mb-8">
          <h1 class="text-2xl sm:text-3xl font-bold tracking-wide">Iniciar Sesión</h1>
             <img
            loading="lazy"
            src="assets/logo/logo.webp"
            alt="logo"
            class="w-16 h-16 mx-auto mb-2"
          />
          <p class="text-xs sm:text-sm text-zinc-400">Nordikos Grill House</p>
        </div>

        <!-- ALERTA -->
        @if (alertMessage) {
          <div class="mb-4 px-4 py-2 rounded-xl text-sm" [class]="alertClasses">
            {{ alertMessage }}
          </div>
        }

        <!-- Email -->
        <div class="mb-4">
          <label class="block text-xs sm:text-sm mb-1">Correo</label>

          <div class="flex items-center gap-2 bg-zinc-800 px-3 py-2 rounded-xl">
            <lucide-icon
              name="mail"
              class="w-4 h-4 sm:w-5 sm:h-5 text-zinc-400"
            />
            <input
              type="email"
              formControlName="email"
              class="w-full bg-transparent outline-none text-xs sm:text-sm"
              placeholder="correo@nordikos.com"
            />
          </div>

          @if (email?.touched && email?.errors?.['required']) {
            <p class="text-xs text-red-400 mt-1">El correo es obligatorio</p>
          }

          @if (email?.touched && email?.errors?.['email']) {
            <p class="text-xs text-red-400 mt-1">Correo no válido</p>
          }
        </div>

        <!-- Password -->
        <div class="mb-6">
          <label class="block text-xs sm:text-sm mb-1">Contraseña</label>

          <div class="flex items-center gap-2 bg-zinc-800 px-3 py-2 rounded-xl">
            <lucide-icon
              name="lock"
              class="w-4 h-4 sm:w-5 sm:h-5 text-zinc-400"
            />

            <input
              [type]="showPassword ? 'text' : 'password'"
              formControlName="password"
              class="w-full bg-transparent outline-none text-xs sm:text-sm"
              placeholder="••••••••"
            />

            <button
              type="button"
              (click)="togglePassword()"
              class="text-zinc-400 hover:text-zinc-200"
            >
              <lucide-icon
                [name]="showPassword ? 'eye-off' : 'eye'"
                class="w-4 h-4 sm:w-5 sm:h-5"
              />
            </button>
          </div>

          @if (password?.touched && password?.invalid) {
            <p class="text-xs text-red-400 mt-1">
              La contraseña es obligatoria
            </p>
          }
        </div>

        <!-- Submit -->
        <button
          type="submit"
          [disabled]="form.invalid || loading"
          class="w-full bg-amber-500 hover:bg-amber-400
                 disabled:bg-zinc-700 disabled:text-zinc-400
                 text-zinc-900 font-bold py-2.5 sm:py-3
                 rounded-xl text-sm sm:text-base transition"
        >
          {{ loading ? 'Ingresando...' : 'Ingresar' }}
        </button>

        <!-- Register -->
        <p class="text-xs sm:text-sm text-center text-zinc-400 mt-4">
          ¿No tienes cuenta?
          <a
            routerLink="/auth/sign-up"
            class="text-amber-400 hover:text-amber-300 font-semibold ml-1"
          >
            Regístrate
          </a>
        </p>

        <p class="text-[10px] sm:text-xs text-center text-zinc-400 mt-4">
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

  showPassword = false;
  loading = false;

  alertMessage: string | null = null;
  alertType: 'success' | 'error' | null = null;

  form = this.fb.group<LogInForm>({
    email: this.fb.control(null, [Validators.required, Validators.email]),
    password: this.fb.control(null, Validators.required),
  });

  // getters
  get email() {
    return this.form.get('email');
  }

  get password() {
    return this.form.get('password');
  }

  // 👉 reemplazo de ngClass
  get alertClasses(): string {
    if (this.alertType === 'success') {
      return 'bg-green-600/20 text-green-400';
    }
    if (this.alertType === 'error') {
      return 'bg-red-600/20 text-red-400';
    }
    return '';
  }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  async submit() {
    if (this.form.invalid) return;

    this.loading = true;
    this.alertMessage = null;
    this.alertType = null;

    try {
      const { error } = await this.authService.logIn({
        email: this.form.value.email ?? '',
        password: this.form.value.password ?? '',
      });

      if (error) throw error;

      this.alertType = 'success';
      this.alertMessage = 'Inicio de sesión exitoso ✅';

      setTimeout(() => {
        this.router.navigateByUrl('/');
      }, 800);
    } catch (error) {
      this.alertType = 'error';
      this.alertMessage = 'Correo o contraseña incorrectos';
    } finally {
      this.loading = false;
    }
  }
}
