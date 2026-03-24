import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { AuthService } from '../../auth/data-access/auth.services';
import { EncryptionService } from '../../core/services/encryption.service';
import { Navbar } from '../../componentes/shared/navbar/navbar';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, Navbar],
  template: `
    <app-navbar />
    <div class="min-h-screen bg-zinc-950 text-zinc-100 pt-24 px-4 pb-12">
      <div class="max-w-2xl mx-auto">
        <div class="bg-[#121212] border border-white/5 rounded-3xl p-8 shadow-2xl">
          <div class="flex items-center gap-6 mb-8">
            <div class="w-24 h-24 bg-amber-500 rounded-2xl flex items-center justify-center">
              <lucide-icon name="user" class="w-12 h-12 text-zinc-900" />
            </div>
            <div>
              <h1 class="text-3xl font-bold">{{ user()?.user_metadata?.['name'] || 'Usuario' }}</h1>
              <p class="text-zinc-400">{{ user()?.email }}</p>
            </div>
          </div>

          <div class="space-y-6">
            <h2 class="text-xl font-semibold border-b border-white/5 pb-2">Información Sensible (Descifrada)</h2>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <!-- Teléfono -->
              <div class="space-y-1">
                <label class="text-xs text-zinc-500 uppercase tracking-wider font-bold">Teléfono</label>
                <div class="flex items-center gap-3 bg-zinc-900/50 p-4 rounded-2xl border border-white/5">
                  <lucide-icon name="phone" class="w-5 h-5 text-amber-500" />
                  <span class="font-mono text-lg tracking-wider">{{ decryptedTelefono() }}</span>
                </div>
                <p class="text-[10px] text-zinc-600 italic">Dato original en DB: {{ user()?.user_metadata?.['telefono']?.substring(0, 15) }}...</p>
              </div>

              <!-- CURP -->
              <div class="space-y-1">
                <label class="text-xs text-zinc-500 uppercase tracking-wider font-bold">CURP</label>
                <div class="flex items-center gap-3 bg-zinc-900/50 p-4 rounded-2xl border border-white/5">
                  <lucide-icon name="file-text" class="w-5 h-5 text-amber-500" />
                  <span class="font-mono text-lg tracking-wider">{{ decryptedCurp() }}</span>
                </div>
                <p class="text-[10px] text-zinc-600 italic">Dato original en DB: {{ user()?.user_metadata?.['curp']?.substring(0, 15) }}...</p>
              </div>
            </div>

            <div class="mt-8 p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex gap-4 items-start">
              <lucide-icon name="shield-check" class="w-6 h-6 text-amber-500 shrink-0" />
              <div>
                <p class="text-sm font-semibold text-amber-400">Seguridad AES-256 Activa</p>
                <p class="text-xs text-zinc-400 mt-1">
                  Tus datos sensibles están cifrados en nuestra base de datos. Solo tú puedes verlos descifrados al iniciar sesión, ya que la llave secreta reside de forma segura en nuestro servidor.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class Profile implements OnInit {
  private authService = inject(AuthService);
  private encryptionService = inject(EncryptionService);

  user = signal<any>(null);
  decryptedTelefono = signal<string>('Cargando...');
  decryptedCurp = signal<string>('Cargando...');

  async ngOnInit() {
    const { data: { user } } = await this.authService.getUser();
    if (user) {
      this.user.set(user);
      
      const encryptedTel = user.user_metadata?.['telefono'];
      const encryptedCurp = user.user_metadata?.['curp'];

      console.log('--- DEBUG PERFIL ---');
      console.log('Dato Tel en DB:', encryptedTel);
      console.log('Dato CURP en DB:', encryptedCurp);

      if (encryptedTel) {
        const result = this.encryptionService.decrypt(encryptedTel);
        console.log('Resultado Descifrado Tel:', result);
        this.decryptedTelefono.set(result || 'Error: Llave incorrecta');
      } else {
        this.decryptedTelefono.set('No registrado');
      }

      if (encryptedCurp) {
        const result = this.encryptionService.decrypt(encryptedCurp);
        console.log('Resultado Descifrado CURP:', result);
        this.decryptedCurp.set(result || 'Error: Llave incorrecta');
      } else {
        this.decryptedCurp.set('No registrado');
      }
    }
  }
}
