import type { Role } from '@env/shared';
import type { Request } from 'express';
import type { VerifiedToken } from './token-verifier';

export interface Member {
  userId: string;
  teamId: string;
  role: Role;
}

/** A requisição depois dos guards. */
export type AuthenticatedRequest = Request & {
  /** Preenchido pelo `AuthGuard`. */
  auth?: VerifiedToken;
  /** Preenchido pelo `TeamGuard`. */
  member?: Member;
};
