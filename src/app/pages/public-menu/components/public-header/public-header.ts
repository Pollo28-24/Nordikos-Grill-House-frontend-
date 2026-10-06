import { Component, computed, inject, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { RouterLink } from '@angular/router';
import { AuthService } from '@auth/data-access/auth.services';

@Component({
  selector: 'app-public-header',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, RouterLink],
  templateUrl: './public-header.html',
})
export class PublicHeader {
  private authService = inject(AuthService);

  cartCount = input<number>(0);
  searchQuery = input<string>('');
  cartBumping = input<boolean>(false);
  /** Tema oscuro (fondo "Brasa nocturna"). false => estilos claros originales. */
  dark = input<boolean>(false);

  protected headerTheme = computed(() =>
    this.dark() ? 'bg-[#14100c]/75 border-white/10' : 'bg-[#F8F5EE]/90 border-[#E2D7B7]/50');
  protected iconLinkTheme = computed(() =>
    this.dark() ? 'text-[#b3a898] hover:text-orange-400 hover:bg-white/5' : 'text-gray-600 hover:text-orange-600 hover:bg-orange-50');
  protected logoTheme = computed(() => (this.dark() ? 'border-white/15' : 'border-[#E2D7B7]/80'));
  protected titleTheme = computed(() => (this.dark() ? 'text-[#f1e9da]' : 'text-gray-900'));
  protected searchIconTheme = computed(() => (this.dark() ? 'text-[#b3a898]' : 'text-gray-400'));
  protected searchTheme = computed(() =>
    this.dark()
      ? 'bg-[#1d1611] border-white/10 text-[#f1e9da] placeholder-[#b3a898]'
      : 'bg-white border-[#E2D7B7]/60 placeholder-gray-400');
  protected cartTheme = computed(() =>
    this.dark()
      ? 'bg-[#1d1611] border-white/10 text-[#f1e9da] hover:bg-[#2a1f17]'
      : 'bg-white border-[#E2D7B7]/80 hover:bg-gray-50 text-gray-700');
  protected badgeBorderTheme = computed(() => (this.dark() ? 'border-[#14100c]' : 'border-[#F8F5EE]'));

  onSearchChange = output<string>();
  onCartClick = output<void>();
  onUserClick = output<void>();

  get isAuthenticated() {
    return this.authService.isAuthenticated() ?? false;
  }

  handleSearch(event: Event) {
    const target = event.target as HTMLInputElement;
    this.onSearchChange.emit(target.value);
  }
}
