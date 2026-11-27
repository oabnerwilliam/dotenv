import '@fontsource-variable/inter';
import '@fontsource-variable/jetbrains-mono';
import { QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { routes } from './app/router';
import './index.css';
import { AuthProvider } from './lib/auth';
import { createQueryClient } from './lib/queryClient';

const root = document.getElementById('root');
if (!root) throw new Error('Elemento #root não encontrado no index.html.');

const queryClient = createQueryClient();
const router = createBrowserRouter(routes);

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
);
