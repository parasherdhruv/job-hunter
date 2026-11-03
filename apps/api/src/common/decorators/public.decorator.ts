import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Marks a route as reachable without an authenticated session. Everything else
 * is protected by the global session guard.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
