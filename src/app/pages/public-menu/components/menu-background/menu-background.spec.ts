import { TestBed } from '@angular/core/testing';
import { MenuBackground } from './menu-background';

describe('MenuBackground', () => {
  it('es decorativo (aria-hidden) y renderiza 12 brasas', () => {
    const fixture = TestBed.createComponent(MenuBackground);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;

    expect(el.getAttribute('aria-hidden')).toBe('true');
    expect(el.querySelectorAll('.nk-ember').length).toBe(12);
  });
});
