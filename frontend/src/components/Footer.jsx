import { useState, useEffect } from 'react';
import api from '../api/client';

const FRONTEND_VERSION = '1.1.9';

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
    <footer className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-t border-gray-200 dark:border-gray-800 transition-colors duration-200">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between h-auto py-2 sm:h-10 gap-2">
          <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1.5 order-2 sm:order-1">
            Made with
            <span className="text-red-500 animate-pulse">❤️</span>
            by
            <a href="https://sreedevss.in/" target="_blank" rel="noopener noreferrer"><span className="font-semibold text-gray-700 dark:text-gray-300">MT</span></a>
            <span className="text-gray-400 dark:text-gray-600">|</span>
            <a href="https://foss.ceal.in/chamber/303/train.html" target="_blank" rel="noopener noreferrer"><span className="font-semibold text-gray-700 dark:text-gray-300 tracking-wide">TRAIN303</span></a>
          </p>
          
          <div className="text-[10px] sm:text-xs font-mono text-gray-400 dark:text-gray-500 order-1 sm:order-2 bg-gray-100 dark:bg-gray-800/50 px-2 py-0.5 rounded-full flex items-center gap-3">
            <span>FE: <span className="text-primary-600 dark:text-primary-400 font-bold">{FRONTEND_VERSION}</span></span>
            <span className="text-gray-300 dark:text-gray-700">|</span>
            <span>BE: <span className="text-primary-600 dark:text-primary-400 font-bold">{backendVersion}</span></span>
          </div>
        </div>
      </div>
    </footer>
  );
}
