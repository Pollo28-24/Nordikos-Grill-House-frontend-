import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { AuthService } from '@auth/data-access/auth.services';
import { ToastService } from '@core/services/toast.service';
import { filter } from 'rxjs';

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

  user = this.authService.user;
  isAuthenticated = computed(() => !!this.user());
  menuOpen = signal(false);

  constructor() {
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => {
        this.menuOpen.set(false);
      });
  }

  toggleMenu() {
    this.menuOpen.update(v => !v);
  }

  async logOut() {
    try {
      const { error } = await this.authService.signOut();
      if (error) throw error;

      this.toastService.show('Sesión cerrada correctamente', 'success');
      this.router.navigateByUrl('/auth/log-in');
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Error al cerrar sesión';
      this.toastService.show(msg, 'error');
    } finally {
      this.menuOpen.set(false);
    }
  }
}