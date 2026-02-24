import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../../auth/data-access/auth.services';

const routerInjection = () => inject(Router);

const authService = () => inject(AuthService);

export const privateGuard: CanActivateFn = async () => {
  const router = routerInjection();
  const platformId = inject(PLATFORM_ID);

  if (!isPlatformBrowser(platformId)) {
    return true; // Allow rendering on server to avoid redirect loop
  }

  const { data } = await authService().session();

  if (!data.session) {
    router.navigateByUrl('/auth/log-in');
  }

  return !!data.session;
};

export const publicGuard: CanActivateFn = async () => {
  const router = routerInjection();
  const platformId = inject(PLATFORM_ID);

  if (!isPlatformBrowser(platformId)) {
    return true; // Allow rendering on server
  }

  const { data } = await authService().session();

  if (data.session) {
    router.navigateByUrl('/');
  }

  return !data.session;
};
