import { Component, inject, signal } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  ReactiveFormsModule,
  Validators,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { AuthService } from '../../data-access/auth.services';
import { ToastService } from '@core/services/toast.service';

interface SignUpForm {
  name: FormControl<string | null>;
  email: FormControl<string | null>;
  password: FormControl<string | null>;
  confirmPassword: FormControl<string | null>;
}

@Component({
  selector: 'app-sign-up',
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
        <div class="text-center mb-8">
          <img
            src="assets/logo/logo_Nordicos.webp"
            class="w-20 h-20 mx-auto mb-3"
            alt="logo"
          />
          <h1 class="text-3xl font-bold">Crear Cuenta</h1>
          <p class="text-sm text-zinc-400">Nordikos Grill House</p>
        </div>

        <!-- Nombre -->
        <div class="mb-4">
          <label class="text-sm block mb-1">Nombre</label>
          <div
            class="flex items-center gap-3
                   bg-zinc-800/70
                   border border-transparent
                   focus-within:border-amber-500
                   px-4 py-3 rounded-2xl transition"
          >
            <lucide-icon name="user" class="w-5 h-5 text-zinc-400" />
            <input
              formControlName="name"
              autocomplete="name"
              class="w-full bg-transparent outline-none text-sm"
              placeholder="Empleado"
            />
          </div>
          @if (name?.touched && name?.errors?.['required']) {
            <p class="text-xs text-red-400 mt-1">El nombre es obligatorio</p>
          }
          @if (name?.touched && name?.errors?.['minlength']) {
            <p class="text-xs text-red-400 mt-1">Mínimo 2 caracteres</p>
          }
        </div>
        <!-- Email -->
        <div class="mb-4">
          <label class="text-sm block mb-1">Correo</label>
          <div
            class="flex items-center gap-3
                   bg-zinc-800/70
                   border border-transparent
                   focus-within:border-amber-500
                   px-4 py-3 rounded-2xl transition"
          >
            <lucide-icon name="mail" class="w-5 h-5 text-zinc-400" />
            <input
              type="email"
              formControlName="email"
              autocomplete="email"
              class="w-full bg-transparent outline-none text-sm"
              placeholder="correo@nordikos.com"
            />
          </div>
          @if (email?.touched && email?.errors?.['required']) {
            <p class="text-xs text-red-400 mt-1">El correo es obligatorio</p>
          }
          @if (email?.touched && email?.errors?.['pattern']) {
            <p class="text-xs text-red-400 mt-1">Formato de correo inválido</p>
          }
        </div>

        <!-- Password -->
        <div class="mb-4">
          <label class="text-sm block mb-1">Contraseña</label>
          <div
            class="flex items-center gap-3
                   bg-zinc-800/70
                   border border-transparent
                   focus-within:border-amber-500
                   px-4 py-3 rounded-2xl transition"
          >
            <lucide-icon name="lock" class="w-5 h-5 text-zinc-400" />
            <input
              [type]="showPassword() ? 'text' : 'password'"
              formControlName="password"
              autocomplete="new-password"
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
            <p class="text-xs text-red-400 mt-1">Mínimo 8 caracteres</p>
          }
          @if (password?.touched && password?.errors?.['pattern']) {
            <p class="text-xs text-red-400 mt-1">
              Debe incluir mayúsculas, minúsculas, número y símbolo
            </p>
          }
        </div>

        <!-- Confirm Password -->
        <div class="mb-6">
          <label class="text-sm block mb-1">Confirmar contraseña</label>
          <div
            class="flex items-center gap-3
                   bg-zinc-800/70
                   border border-transparent
                   focus-within:border-amber-500
                   px-4 py-3 rounded-2xl transition"
          >
            <lucide-icon name="lock" class="w-5 h-5 text-zinc-400" />
            <input
              [type]="showConfirmPassword() ? 'text' : 'password'"
              formControlName="confirmPassword"
              autocomplete="new-password"
              class="w-full bg-transparent outline-none text-sm"
              placeholder="••••••••"
            />
            <button
              type="button"
              (click)="toggleConfirmPassword()"
              class="text-zinc-400 hover:text-amber-400 transition"
            >
              <lucide-icon
                [name]="showConfirmPassword() ? 'eye-off' : 'eye'"
                class="w-5 h-5"
              />
            </button>
          </div>
          @if (form.errors?.['passwordMismatch'] && confirmPassword?.touched) {
            <p class="text-xs text-red-400 mt-1">
              Las contraseñas no coinciden
            </p>
          }
        </div>

        <button
          type="submit"
          [disabled]="form.invalid || loading()"
          class="w-full bg-amber-500 hover:bg-amber-400
                 disabled:bg-zinc-700 disabled:text-zinc-400
                 text-zinc-900 font-bold py-3
                 rounded-2xl transition"
        >
          {{ loading() ? 'Creando cuenta...' : 'Registrar' }}
        </button>

        <p class="text-sm text-center text-zinc-400 mt-6">
          ¿Ya tienes cuenta?
          <a
            routerLink="/auth/log-in"
            class="text-amber-400 hover:text-amber-300 font-semibold ml-1"
          >
            Inicia sesión
          </a>
        </p>
      </form>
    </div>
  `,
})
export default class SignUp {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private toastService = inject(ToastService);
  private router = inject(Router);

  loading = signal(false);
  showPassword = signal(false);
  showConfirmPassword = signal(false);

  form = this.fb.group<SignUpForm>(
    {
      name: this.fb.control(null, [
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(60),
      ]),
      email: this.fb.control(null, [
        Validators.required,
        Validators.pattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-z]{2,}$/),
        Validators.maxLength(100),
      ]),
      password: this.fb.control(null, [
        Validators.required,
        Validators.minLength(8),
        Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/),
        Validators.maxLength(100),
      ]),
      confirmPassword: this.fb.control(null, Validators.required),
    },
    { validators: this.passwordMatchValidator },
  );

  passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.get('password')?.value;
    const confirmPassword = control.get('confirmPassword')?.value;
    if (!password || !confirmPassword) return null;
    return password === confirmPassword ? null : { passwordMismatch: true };
  }

  get name() {
    return this.form.get('name');
  }

  get email() {
    return this.form.get('email');
  }

  get password() {
    return this.form.get('password');
  }

  get confirmPassword() {
    return this.form.get('confirmPassword');
  }
  togglePassword() {
    this.showPassword.update((v) => !v);
  }
  toggleConfirmPassword() {
    this.showConfirmPassword.update((v) => !v);
  }
  async submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);

    try {
      const { data, error } = await this.authService.signUp({
        email: this.form.value.email!,
        password: this.form.value.password!,
        name: this.form.value.name!,
      });

      if (error) throw error;

      this.toastService.show(
        'Cuenta creada. Revisa tu correo para verificar.',
        'success',
      );

      this.router.navigate(['/auth/log-in']);
    } catch (error: any) {
      this.toastService.show(
        error.message || 'Error al registrar usuario',
        'error',
      );

      this.password?.reset();
      this.confirmPassword?.reset();
    } finally {
      this.loading.set(false);
    }
  }
}