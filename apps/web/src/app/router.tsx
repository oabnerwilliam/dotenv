import { lazy, Suspense } from 'react';
import { Navigate, type RouteObject } from 'react-router';
import { AuthCallbackPage } from '../pages/AuthCallbackPage';
import { CreateTeamPage } from '../pages/CreateTeamPage';
import { HomePage } from '../pages/HomePage';
import { LoginPage } from '../pages/LoginPage';
import { NoAccessPage } from '../pages/NoAccessPage';
import { ProjectPlaceholderPage } from '../pages/ProjectPlaceholderPage';
import { StatusPage } from '../pages/StatusPage';
import { RequireMember, RequireState } from './RequireMember';

// Vitrine de componentes: só em desenvolvimento. Com `import.meta.env.DEV` falso, o build de
// produção descarta o `import()` e a página nem é empacotada.
const Vitrine = import.meta.env.DEV
  ? lazy(async () => ({ default: (await import('../pages/dev/Vitrine')).Vitrine }))
  : null;

const devRoutes: RouteObject[] = Vitrine
  ? [
      {
        path: '/dev/componentes',
        element: (
          <Suspense>
            <Vitrine />
          </Suspense>
        ),
      },
    ]
  : [];

// Uma lista só: o app monta o roteador do navegador e os testes, um em memória.
export const routes: RouteObject[] = [
  // Rota à parte, sem filhas: se um dia virar página pública de apresentação, basta trocar o
  // elemento, sem mexer nas outras.
  {
    path: '/',
    element: (
      <RequireMember>
        <HomePage />
      </RequireMember>
    ),
  },
  { path: '/login', element: <LoginPage /> },
  { path: '/auth/callback', element: <AuthCallbackPage /> },
  {
    path: '/onboarding/equipe',
    element: (
      <RequireState state="needs_team">
        <CreateTeamPage />
      </RequireState>
    ),
  },
  {
    path: '/sem-permissao',
    element: (
      <RequireState state="not_invited">
        <NoAccessPage />
      </RequireState>
    ),
  },
  {
    path: '/p/:projeto',
    element: (
      <RequireMember>
        <ProjectPlaceholderPage />
      </RequireMember>
    ),
  },
  { path: '/status', element: <StatusPage /> },
  ...devRoutes,
  { path: '*', element: <Navigate to="/" replace /> },
];
