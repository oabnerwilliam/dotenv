import '@fontsource-variable/inter';
import '@fontsource-variable/jetbrains-mono';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { lazy, StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { StatusPage } from './pages/StatusPage';

const root = document.getElementById('root');
if (!root) throw new Error('Elemento #root não encontrado no index.html.');

const queryClient = new QueryClient();

// Vitrine de componentes: só em desenvolvimento. Com `import.meta.env.DEV` falso, o build de
// produção descarta o `import()` e a página nem é empacotada. A rota vai para o router depois.
const Vitrine = import.meta.env.DEV
  ? lazy(async () => ({ default: (await import('./pages/dev/Vitrine')).Vitrine }))
  : null;
const showVitrine = window.location.pathname === '/dev/componentes';

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      {Vitrine && showVitrine ? (
        <Suspense>
          <Vitrine />
        </Suspense>
      ) : (
        <StatusPage />
      )}
    </QueryClientProvider>
  </StrictMode>,
);
