import { Routes } from '@angular/router';
import { privateGuard, publicGuard } from './shared/guards/auth-guard'; 

export const routes: Routes = [
  {
    path: 'menu',
    loadComponent: () => import('./pages/public-menu/public-menu').then((m) => m.PublicMenu),
  },
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
    path: 'profile',
    loadComponent: () => import('./pages/profile/profile').then((m) => m.Profile),
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
    path: 'manageModifiers/categories',
    loadComponent: () => import('./pages/manageModifiers/categories/categories').then(m => m.ManageModifierCategories),
    canActivate: [privateGuard],
  },
  {
    path: 'manageModifiers/items',
    loadComponent: () => import('./pages/manageModifiers/items/items').then(m => m.ManageModifiers),
    canActivate: [privateGuard],
  },
  {
    path: 'orders/new',
    loadComponent: () => import('./pages/orders/new-order/new-order').then(m => m.NewOrder),
    canActivate: [privateGuard],
    children: [
      {
        path: '',
        redirectTo: 'browse',
        pathMatch: 'full'
      },
      {
        path: 'browse',
        loadComponent: () => import('./pages/orders/new-order/products/products').then(m => m.NewOrderProducts),
        canActivate: [privateGuard],
      },
      {
        path: 'cart',
        loadComponent: () => import('./pages/orders/new-order/cart/cart').then(m => m.NewOrderCart),
        canActivate: [privateGuard],
      }
    ]
  },
  {
    path: 'orders/by-service',
    loadComponent: () => import('./pages/orders/orders-by-service/orders-by-service').then(m => m.OrdersByService),
    canActivate: [privateGuard],
  },
  {
    path: 'orders/:id',
    loadComponent: () => import('./pages/orders/order-detail/order-detail').then(m => m.OrderDetail),
    canActivate: [privateGuard],
  },
  {
    path: 'orders',
    redirectTo: 'orders/by-service',
    pathMatch: 'full',
  },
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
  },
];
