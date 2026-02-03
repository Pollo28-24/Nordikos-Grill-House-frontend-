import { Component, inject } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  ReactiveFormsModule,
  Validators,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { AuthService } from '../../data-access/auth.services';

interface SingUpForm {
  name: FormControl<string | null>;
  email: FormControl<string | null>;
  password: FormControl<string | null>;
  confirmPassword: FormControl<string | null>;
}

@Component({
  selector: 'app-sing-up',
  standalone: true,
  imports: [ReactiveFormsModule, LucideAngularModule, RouterLink],
  template: `
    <div
      class="min-h-screen flex items-center justify-center bg-zinc-950 text-zinc-100 px-4"
    >
      <form
        [formGroup]="form"
        (ngSubmit)="submit()"
        class="w-full max-w-md bg-zinc-900 p-8 rounded-2xl shadow-xl"
      >
        <!-- Header -->
        <div class="text-center mb-8">
          <h1 class="text-3xl font-bold">Crear Cuenta</h1>
          <img
            loading="lazy"
            src="assets/logo/logo.webp"
            alt="logo"
            class="w-16 h-16 mx-auto mb-2"
          />
          <p class="text-sm text-zinc-400">Nordikos Grill House</p>
        </div>

        <!-- Nombre -->
        <!-- Nombre -->
        <div class="mb-4">
          <label class="text-sm block mb-1">Nombre</label>
          <div class="flex items-center gap-2 bg-zinc-800 px-3 py-2 rounded-xl">
            <lucide-icon
              name="user"
              class="w-5 h-5 text-zinc-400"
            ></lucide-icon>
            <input
              formControlName="name"
              class="w-full bg-transparent outline-none text-sm"
              placeholder="Empleado"
            />
          </div>

          @if (
            form.get('name')?.touched && form.get('name')?.errors?.['required']
          ) {
            <p class="text-xs text-red-400 mt-1">El nombre es obligatorio</p>
          }
        </div>

        <!-- Email -->
        <!-- Email -->
        <div class="mb-4">
          <label class="text-sm block mb-1">Correo</label>
          <div class="flex items-center gap-2 bg-zinc-800 px-3 py-2 rounded-xl">
            <lucide-icon
              name="mail"
              class="w-5 h-5 text-zinc-400"
            ></lucide-icon>
            <input
              type="email"
              formControlName="email"
              class="w-full bg-transparent outline-none text-sm"
              placeholder="correo@nordikos.com"
            />
          </div>

          @if (
            form.get('email')?.touched &&
            form.get('email')?.errors?.['required']
          ) {
            <p class="text-xs text-red-400 mt-1">El correo es obligatorio</p>
          }

          @if (
            form.get('email')?.touched && form.get('email')?.errors?.['email']
          ) {
            <p class="text-xs text-red-400 mt-1">Correo no válido</p>
          }
        </div>

        <!-- Password -->
        <div class="mb-4">
          <label class="text-sm block mb-1">Contraseña</label>

          <div class="flex items-center gap-2 bg-zinc-800 px-3 py-2 rounded-xl">
            <lucide-icon
              name="lock"
              class="w-5 h-5 text-zinc-400"
            ></lucide-icon>

            <input
              [type]="showPassword ? 'text' : 'password'"
              formControlName="password"
              class="w-full bg-transparent outline-none text-sm"
              placeholder="••••••••"
            />

            <button
              type="button"
              (click)="togglePassword()"
              class="text-zinc-400 hover:text-zinc-200"
            >
              <lucide-icon
                [name]="showPassword ? 'eye-off' : 'eye'"
                class="w-5 h-5"
              ></lucide-icon>
            </button>
          </div>

          @if (password?.touched && password?.errors?.['required']) {
            <p class="text-xs text-red-400 mt-1">
              La contraseña es obligatoria
            </p>
          }

          @if (password?.touched && password?.errors?.['minlength']) {
            <p class="text-xs text-red-400 mt-1">Mínimo 6 caracteres</p>
          }
        </div>

        <!-- Confirm Password -->
        <div class="mb-6">
          <label class="text-sm block mb-1">Confirmar Contraseña</label>

          <div class="flex items-center gap-2 bg-zinc-800 px-3 py-2 rounded-xl">
            <lucide-icon
              name="lock"
              class="w-5 h-5 text-zinc-400"
            ></lucide-icon>

            <input
              [type]="showConfirmPassword ? 'text' : 'password'"
              formControlName="confirmPassword"
              class="w-full bg-transparent outline-none text-sm"
              placeholder="••••••••"
            />

            <button
              type="button"
              (click)="toggleConfirmPassword()"
              class="text-zinc-400 hover:text-zinc-200"
            >
              <lucide-icon
                [name]="showConfirmPassword ? 'eye-off' : 'eye'"
                class="w-5 h-5"
              ></lucide-icon>
            </button>
          </div>

          @if (form.errors?.['passwordMismatch'] && confirmPassword?.touched) {
            <p class="text-xs text-red-400 mt-1">
              Las contraseñas no coinciden
            </p>
          }
        </div>

        <!-- Submit -->
        <button
          type="submit"
          [disabled]="form.invalid"
          class="w-full bg-amber-500 hover:bg-amber-400
               disabled:bg-zinc-700 disabled:text-zinc-400
               text-zinc-900 font-bold py-2 rounded-xl transition"
        >
          Registrar
        </button>

        <p class="text-xs text-center text-zinc-400 mt-4">
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
export default class SingUp {
  private fb = inject(FormBuilder);
  private _authService = inject(AuthService);

  showPassword = false;
  showConfirmPassword = false;

  form = this.fb.group<SingUpForm>(
    {
      name: this.fb.control(null, Validators.required),
      email: this.fb.control(null, [Validators.required, Validators.email]),
      password: this.fb.control(null, [
        Validators.required,
        Validators.minLength(6),
      ]),
      confirmPassword: this.fb.control(null, Validators.required),
    },
    {
      validators: this.passwordMatchValidator,
    },
  );

  // ===== VALIDADOR GLOBAL =====
  passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.get('password')?.value;
    const confirmPassword = control.get('confirmPassword')?.value;

    if (!password || !confirmPassword) return null;

    return password === confirmPassword ? null : { passwordMismatch: true };
  }

  // ===== GETTERS =====
  get password() {
    return this.form.get('password');
  }

  get confirmPassword() {
    return this.form.get('confirmPassword');
  }

  // ===== UI ACTIONS =====
  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPassword() {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  // ===== SUBMIT =====
  async submit() {
    if (this.form.invalid) return;

    try {
      const { data, error } = await this._authService.signUp({
        email: this.form.value.email!,
        password: this.form.value.password!,
        name: this.form.value.name!,
      });

      if (error) throw error;

      if (data.user && !data.user.email_confirmed_at) {
        alert(
          'Registro exitoso ✅\nRevisa tu correo para verificar tu cuenta.',
        );
      } else {
        alert('Cuenta creada y verificada 🎉');
      }
    } catch (error: unknown) {
      alert('Error al registrar usuario');
      console.error(error);
    }
  }
}
