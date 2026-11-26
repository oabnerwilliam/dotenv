import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { StatusPage } from './pages/StatusPage';

const root = document.getElementById('root');
if (!root) throw new Error('Elemento #root não encontrado no index.html.');

const queryClient = new QueryClient();

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <StatusPage />
    </QueryClientProvider>
  </StrictMode>,
);
