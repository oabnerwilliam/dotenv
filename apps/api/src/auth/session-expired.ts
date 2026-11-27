import { AppError } from '../common/app-error';

// Uma resposta só para todo problema com o token: dizer qual foi ajudaria quem está tentando.
export function sessionExpired(): AppError {
  return new AppError('UNAUTHENTICATED', 'Sua sessão expirou. Entre novamente.');
}
