import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { AuthService } from '../../../auth/data-access/auth.services';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-navbar',
  imports: [LucideAngularModule, RouterLink, RouterLinkActive],
  templateUrl: './navbar.html',
  styles: `
    :host {
      display: block;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Navbar {
  private authService = inject(AuthService);
  private router = inject(Router);
  private toastService = inject(ToastService);

  // State
  isAuthenticated = this.authService.user;
  menuOpen = signal(false);

  toggleMenu() {
    this.menuOpen.update(v => !v);
  }

  async logOut() {
    try {
      const { error } = await this.authService.signOut();
      if (error) throw error;
      
      this.toastService.show('Sesión cerrada correctamente', 'success');
      this.router.navigateByUrl('/auth/log-in');
    } catch (error: any) {
      this.toastService.show(error.message || 'Error al cerrar sesión', 'error');
    }
  }
}
