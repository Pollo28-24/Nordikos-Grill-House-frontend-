import { Routes } from '@angular/router';

export default[
  {
    path: 'log-in',
    loadComponent: () => import('../log-in/log-in').then(m => m.default),
  },
  {
    path: 'sign-up',
    loadComponent: () => import('../sign-up/sign-up').then(m => m.default),
  },
  {
    path: '**',
    redirectTo: 'log-in',
  }
  

] as Routes;
