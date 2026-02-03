import { ChangeDetectionStrategy, Component } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { Navbar } from "../../componentes/shared/navbar/navbar";

@Component({
  selector: 'app-home',
  imports: [LucideAngularModule, Navbar],
  templateUrl: './home.html',
  styles: `
    :host {
      display: block;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Home { }
