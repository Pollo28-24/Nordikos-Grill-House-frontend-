import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../../auth/data-access/auth.services';

/**
 * Guard for private routes.
 * Uses AuthService signal to check authentication state.
 */
export const privateGuard: CanActivateFn = () => {
  const router = inject(Router);
  const authService = inject(AuthService);
  const platformId = inject(PLATFORM_ID);

  if (!isPlatformBrowser(platformId)) {
    return true;
  }

  const isAuthenticated = authService.isAuthenticated();

  // If not authenticated, redirect to login
  if (isAuthenticated === false) {
    router.navigateByUrl('/auth/log-in');
    return false;
  }

  // If null, it means APP_INITIALIZER hasn't finished (shouldn't happen with APP_INITIALIZER)
  // but as a fallback we allow it or handle it.
  return isAuthenticated === true;
};

/**
 * Guard for public routes (like Login).
 * Redirects to home if already authenticated.
 */
export const publicGuard: CanActivateFn = () => {
  const router = inject(Router);
  const authService = inject(AuthService);
  const platformId = inject(PLATFORM_ID);

  if (!isPlatformBrowser(platformId)) {
    return true;
  }

  const isAuthenticated = authService.isAuthenticated();

  if (isAuthenticated === true) {
    router.navigateByUrl('/');
    return false;
  }

  return true;
};
