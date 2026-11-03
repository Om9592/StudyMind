import React from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/dm-sans';
import '@fontsource-variable/manrope';
import '@fontsource/noto-sans-devanagari/400.css';
import '@fontsource/noto-sans-devanagari/600.css';
import './styles.css';
import App from './App';
const root = document.getElementById('root');
// Public HTML remains server-indexable; mount the client app consistently across routes.
createRoot(root).render(<App/>);
