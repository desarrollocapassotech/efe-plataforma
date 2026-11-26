import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { Providers } from './app/Providers';
import { router } from './app/router';
import './index.css';

const raiz = document.getElementById('root');
if (!raiz) throw new Error('Falta #root en index.html');

createRoot(raiz).render(
  <StrictMode>
    <Providers>
      <RouterProvider router={router} />
    </Providers>
  </StrictMode>,
);
