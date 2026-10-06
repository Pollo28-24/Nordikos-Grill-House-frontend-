import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-customizer-instructions-section',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './customizer-instructions-section.html'
})
export class CustomizerInstructionsSection {
  readonly note = input<string>('');
  readonly quickNotes: string[] = [
    'Sin cebolla',
    'Sin catsup',
    'Sin tomate',
    'Sin pepinillos',
    'Sin lechuga',
    'Sin mostaza',
    'Sin aderezo',
    'Sin ningún tipo de aderezo',
    'Sin verdura',
    'Sin queso amarillo',
    'Sin queso manchego',
    'Sin chile'
  ];

  readonly toggleQuickNote = output<string>();
  readonly noteChange = output<string>();

  isQuickNoteSelected(chip: string): boolean {
    const current = (this.note() || '').toLowerCase();
    return current.includes(chip.toLowerCase());
  }
}
