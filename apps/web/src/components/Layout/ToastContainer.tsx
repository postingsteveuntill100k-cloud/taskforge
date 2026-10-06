import React from 'react';
import { useToast } from '../../context/ToastContext.js';
import { CheckCircle2, AlertTriangle, Info, XCircle, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map((t) => {
        const Icon =
          t.type === 'success'
            ? CheckCircle2
            : t.type === 'error'
            ? XCircle
            : t.type === 'warning'
            ? AlertTriangle
            : Info;

        return (
          <div key={t.id} className={`toast toast-${t.type}`}>
            <Icon size={18} />
            <div style={{ flex: 1 }}>
              {t.title && <div style={{ fontWeight: 600, fontSize: 13 }}>{t.title}</div>}
              <div>{t.message}</div>
            </div>
            <button
              onClick={() => removeToast(t.id)}
              style={{ color: 'rgba(255, 255, 255, 0.8)', padding: 2 }}
            >
              <X size={16} />
            </button>
          </div>
        );
      })}
    </div>
  );
};
