import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App.js';
import { ToastProvider } from './context/ToastContext.js';
import { AuthProvider } from './context/AuthContext.js';
import { ProjectProvider } from './context/ProjectContext.js';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ToastProvider>
      <AuthProvider>
        <ProjectProvider>
          <App />
        </ProjectProvider>
      </AuthProvider>
    </ToastProvider>
  </React.StrictMode>
);
