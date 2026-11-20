import { useState, useEffect } from 'react';
import api from '../api/client';

const FRONTEND_VERSION = '1.4.1';

export default function Footer() {
  const [backendVersion, setBackendVersion] = useState('...');

  useEffect(() => {
    const fetchVersion = async () => {
      try {
        const response = await api.get('/api/auth/version/');
        setBackendVersion(response.data.version);
      } catch (error) {
        console.error('Failed to fetch backend version:', error);
        setBackendVersion('Unknown');
      }
    };
    fetchVersion();
  }, []);

  return (
    <footer className="bg-white dark:bg-neutral-900 border-t border-slate-200 dark:border-neutral-800 transition-colors">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between h-auto py-2.5 sm:h-11 gap-2">
          <p className="text-xs text-slate-500 dark:text-neutral-400 flex items-center gap-1.5 order-2 sm:order-1 font-medium">
            <span>Made with</span>
            <svg
              className="w-3.5 h-3.5 text-rose-500 inline fill-current flex-shrink-0"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
            <span>by</span>
            <a
              href="https://sreedevss.in/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-slate-700 dark:text-neutral-200 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              MT
            </a>
            <span className="text-slate-300 dark:text-neutral-700">|</span>
            <a
              href="https://foss.ceal.in/chamber/303/train.html"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-slate-700 dark:text-neutral-200 hover:text-blue-600 dark:hover:text-blue-400 tracking-wide transition-colors"
            >
              TRAIN303
            </a>
          </p>

          <div className="text-[11px] font-mono text-slate-500 dark:text-neutral-400 order-1 sm:order-2 bg-slate-100 dark:bg-neutral-800 border border-slate-200/80 dark:border-neutral-700/80 px-2.5 py-0.5 rounded-full flex items-center gap-2.5">
            <span>
              FE: <span className="text-blue-600 dark:text-blue-400 font-bold">{FRONTEND_VERSION}</span>
            </span>
            <span className="text-slate-300 dark:text-neutral-700">|</span>
            <span>
              BE: <span className="text-blue-600 dark:text-blue-400 font-bold">{backendVersion}</span>
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
