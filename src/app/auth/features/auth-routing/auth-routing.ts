import { Routes } from '@angular/router';
import { publicGuard } from '@shared/guards/auth-guard';

export default[
  {
    path: 'log-in',
    loadComponent: () => import('../log-in/log-in').then(m => m.default),
    canActivate: [publicGuard],
  },
  {
    path: 'sign-up',
    loadComponent: () => import('../sign-up/sign-up').then(m => m.default),
    canActivate: [publicGuard],
  },
  {
    path: '**',
    redirectTo: 'log-in',
  }
  

] as Routes;
