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
import { ToastService } from '../../../core/services/toast.service';

interface SignUpForm {
  name: FormControl<string | null>;
  email: FormControl<string | null>;
  telefono: FormControl<string | null>;
  curp: FormControl<string | null>;
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
         bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200
         text-gray-800 px-4"
>
  <form
    [formGroup]="form"
    (ngSubmit)="submit()"
    class="w-full max-w-md
           bg-white
           border border-gray-200
           p-8 rounded-3xl
           shadow-lg"
  >
    <div class="text-center mb-8">
      <h1 class="text-3xl font-bold text-gray-800">Crear Cuenta</h1>
    </div>

    <!-- Nombre -->
    <div class="mb-4">
      <label class="text-sm block mb-1 text-gray-600">Nombre</label>
      <div
        class="flex items-center gap-3
               bg-gray-50
               border border-gray-200
               focus-within:border-indigo-500
               px-4 py-3 rounded-2xl transition"
      >
        <lucide-icon name="user" class="w-5 h-5 text-gray-400" />
        <input
          formControlName="name"
          class="w-full bg-transparent outline-none text-sm text-gray-800 placeholder-gray-400"
          placeholder="Empleado"
        />
      </div>
    </div>

    <!-- Email -->
    <div class="mb-4">
      <label class="text-sm block mb-1 text-gray-600">Correo</label>
      <div
        class="flex items-center gap-3
               bg-gray-50
               border border-gray-200
               focus-within:border-indigo-500
               px-4 py-3 rounded-2xl transition"
      >
        <lucide-icon name="mail" class="w-5 h-5 text-gray-400" />
        <input
          type="email"
          formControlName="email"
          class="w-full bg-transparent outline-none text-sm text-gray-800 placeholder-gray-400"
          placeholder="correo@nordikos.com"
        />
      </div>
    </div>

    <!-- Teléfono -->
    <div class="mb-4">
      <label class="text-sm block mb-1 text-gray-600">Teléfono</label>
      <div
        class="flex items-center gap-3
               bg-gray-50
               border border-gray-200
               focus-within:border-indigo-500
               px-4 py-3 rounded-2xl transition"
      >
        <lucide-icon name="phone" class="w-5 h-5 text-gray-400" />
        <input
          formControlName="telefono"
          class="w-full bg-transparent outline-none text-sm text-gray-800"
          placeholder="5512345678"
        />
      </div>
    </div>

    <!-- CURP -->
    <div class="mb-4">
      <label class="text-sm block mb-1 text-gray-600">CURP</label>
      <div
        class="flex items-center gap-3
               bg-gray-50
               border border-gray-200
               focus-within:border-indigo-500
               px-4 py-3 rounded-2xl transition"
      >
        <lucide-icon name="file-text" class="w-5 h-5 text-gray-400" />
        <input
          formControlName="curp"
          class="w-full bg-transparent outline-none text-sm text-gray-800 uppercase"
          placeholder="AAAA000000XXXXXX00"
        />
      </div>
    </div>

    <!-- Password -->
    <div class="mb-4">
      <label class="text-sm block mb-1 text-gray-600">Contraseña</label>
      <div
        class="flex items-center gap-3
               bg-gray-50
               border border-gray-200
               focus-within:border-indigo-500
               px-4 py-3 rounded-2xl transition"
      >
        <lucide-icon name="lock" class="w-5 h-5 text-gray-400" />
        <input
          [type]="showPassword() ? 'text' : 'password'"
          formControlName="password"
          class="w-full bg-transparent outline-none text-sm text-gray-800"
          placeholder="••••••••"
        />
        <button
          type="button"
          (click)="togglePassword()"
          class="text-gray-400 hover:text-indigo-500 transition"
        >
          <lucide-icon
            [name]="showPassword() ? 'eye-off' : 'eye'"
            class="w-5 h-5"
          />
        </button>
      </div>
    </div>

    <!-- Confirm Password -->
    <div class="mb-6">
      <label class="text-sm block mb-1 text-gray-600">Confirmar contraseña</label>
      <div
        class="flex items-center gap-3
               bg-gray-50
               border border-gray-200
               focus-within:border-indigo-500
               px-4 py-3 rounded-2xl transition"
      >
        <lucide-icon name="lock" class="w-5 h-5 text-gray-400" />
        <input
          [type]="showConfirmPassword() ? 'text' : 'password'"
          formControlName="confirmPassword"
          class="w-full bg-transparent outline-none text-sm text-gray-800"
          placeholder="••••••••"
        />
        <button
          type="button"
          (click)="toggleConfirmPassword()"
          class="text-gray-400 hover:text-indigo-500 transition"
        >
          <lucide-icon
            [name]="showConfirmPassword() ? 'eye-off' : 'eye'"
            class="w-5 h-5"
          />
        </button>
      </div>
    </div>

    <button
      type="submit"
      [disabled]="form.invalid || loading()"
      class="w-full bg-indigo-500 hover:bg-indigo-600
             disabled:bg-gray-300 disabled:text-gray-500
             text-white font-bold py-3
             rounded-2xl transition"
    >
      {{ loading() ? 'Creando cuenta...' : 'Registrar' }}
    </button>

    <p class="text-sm text-center text-gray-500 mt-6">
      ¿Ya tienes cuenta?
      <a
        routerLink="/auth/log-in"
        class="text-indigo-500 hover:text-indigo-600 font-semibold ml-1"
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
      telefono: this.fb.control(null, [
        Validators.required,
        Validators.pattern(/^[0-9]{10}$/),
      ]),
      curp: this.fb.control(null, [
        Validators.required,
        Validators.minLength(18),
        Validators.maxLength(18),
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

  get telefono() {
    return this.form.get('telefono');
  }

  get curp() {
    return this.form.get('curp');
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
        telefono: this.form.value.telefono!,
        curp: this.form.value.curp!,
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
