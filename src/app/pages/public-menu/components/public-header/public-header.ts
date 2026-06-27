import { Component, inject, input, output } from '@angular/core';
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
