/**
 * Express Type Extensions
 * Extends Express Request interface to include user information
 */

import { Role } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: Role;
        email: string;
      };
    }
  }
}

export {};

