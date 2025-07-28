// src/App.jsx
import React from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppProvider } from './context/AppContext';
import { CollaborationProvider } from './context/CollaborationContext';
import AuthPage from './features/auth/AuthPage';
import MurrowNRCS from './features/MurrowNRCS';
import GlobalStyles from './components/ui/GlobalStyles';
import ErrorBoundary from './components/common/ErrorBoundary';

const AppWrapper = () => (
  <ErrorBoundary>
    <AuthProvider>
      <AppProvider>
        <CollaborationProvider>
          <DndProvider backend={HTML5Backend}>
            <GlobalStyles />
            <App />
          </DndProvider>
        </CollaborationProvider>
      </AppProvider>
    </AuthProvider>
  </ErrorBoundary>
);

const App = () => {
  const { currentUser } = useAuth();
  
  try {
    return currentUser ? <MurrowNRCS /> : <AuthPage />;
  } catch (error) {
    console.error('Error in App component:', error);
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-xl font-bold text-red-600 mb-4">Application Error</h1>
          <p className="text-gray-600 mb-4">Something went wrong. Please refresh the page.</p>
          <button 
            onClick={() => window.location.reload()}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }
};

export default AppWrapper;
