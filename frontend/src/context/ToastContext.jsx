import { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);

/**
 * Toast notification types with their corresponding collegiate styles.
 */
const TOAST_STYLES = {
  success: {
    bg: 'bg-white dark:bg-neutral-900 border-emerald-500/30 dark:border-emerald-500/40',
    badge: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
    text: 'text-slate-800 dark:text-neutral-200',
    icon: '✓',
  },
  error: {
    bg: 'bg-white dark:bg-neutral-900 border-rose-500/30 dark:border-rose-500/40',
    badge: 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800',
    text: 'text-slate-800 dark:text-neutral-200',
    icon: '✕',
  },
  info: {
    bg: 'bg-white dark:bg-neutral-900 border-blue-500/30 dark:border-blue-500/40',
    badge: 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800',
    text: 'text-slate-800 dark:text-neutral-200',
    icon: 'ℹ',
  },
  warning: {
    bg: 'bg-white dark:bg-neutral-900 border-amber-500/30 dark:border-amber-500/40',
    badge: 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800',
    text: 'text-slate-800 dark:text-neutral-200',
    icon: '!',
  },
};

let toastId = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, message, type }]);

    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }

    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = {
    success: (msg, duration) => addToast(msg, 'success', duration),
    error: (msg, duration) => addToast(msg, 'error', duration),
    info: (msg, duration) => addToast(msg, 'info', duration),
    warning: (msg, duration) => addToast(msg, 'warning', duration),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}

      {/* Toast container — fixed to top-right */}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map((t) => {
          const style = TOAST_STYLES[t.type] || TOAST_STYLES.info;
          return (
            <div
              key={t.id}
              className={`pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-xl border shadow-md animate-slide-in ${style.bg}`}
              role="alert"
            >
              <span className={`w-5 h-5 rounded-full border flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5 ${style.badge}`}>
                {style.icon}
              </span>
              <p className={`text-xs sm:text-sm font-medium ${style.text} flex-1 leading-snug`}>{t.message}</p>
              <button
                onClick={() => removeToast(t.id)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-neutral-200 flex-shrink-0 text-sm font-medium transition-colors"
                aria-label="Dismiss toast"
              >
                ×
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
