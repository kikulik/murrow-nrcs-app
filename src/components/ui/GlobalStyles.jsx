// src/components/ui/GlobalStyles.jsx
import React from 'react';

const GlobalStyles = () => (
    <style>{`
    .form-input { 
      @apply block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm; 
    }
    .btn-primary { 
      @apply inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 space-x-2 disabled:opacity-50 disabled:cursor-not-allowed; 
    }
    .btn-secondary { 
      @apply inline-flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-500 text-sm font-medium rounded-md shadow-sm text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 space-x-2 disabled:opacity-50 disabled:cursor-not-allowed; 
    }
  `}</style>
);

export default GlobalStyles;
