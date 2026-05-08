import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-public-header',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './public-header.html',
})
export class PublicHeader {
  cartCount = input<number>(0);
  searchQuery = input<string>('');
  cartBumping = input<boolean>(false);

  onSearchChange = output<string>();
  onCartClick = output<void>();

  handleSearch(event: Event) {
    const target = event.target as HTMLInputElement;
    this.onSearchChange.emit(target.value);
  }
}
