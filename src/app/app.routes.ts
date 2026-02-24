import { Routes } from '@angular/router';
import { privateGuard, publicGuard } from './shared/guards/auth-guard'; 

export const routes: Routes = [
  {
    path: 'auth',
    loadChildren: () => import('./auth/features/auth-routing/auth-routing'),
  },
  {
    path: 'home',
    loadComponent: () => import('./pages/home/home').then((m) => m.Home),
    canActivate: [privateGuard],
  },
  {
    path: 'products',
    loadComponent: () => import('./pages/manageProducts/products/products').then((m) => m.Products),
    canActivate: [privateGuard],
  },
  {
    path: 'categories',
    loadComponent: () => import('./pages/manageCategories/manageCategories').then((m) => m.ManageCategories),
    canActivate: [privateGuard],
  },
  { 
    path: 'manage-products/edit/:id',
    loadComponent: () => import('./pages/manageProducts/editProducts/editProducts').then((m) => m.EditProducts),
    canActivate: [privateGuard],
  },
  {
    path: 'manage-products/createProducts',
    loadComponent: () => import('./pages/manageProducts/createProducts/createProducts').then((m) => m.CreateProducts),
    canActivate: [privateGuard],
  },	
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
  },
];
