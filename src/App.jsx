/*
================================================================================
File: murrow-nrcs-app.git/src/App.jsx
Description: Main App component that wraps providers and handles routing.
================================================================================
*/
import React from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppProvider } from './context/AppContext';
import { CollaborationProvider } from './context/CollaborationContext';
import AuthPage from './features/auth/AuthPage';
import MurrowNRCS from './features/MurrowNRCS';
import GlobalStyles from './components/ui/GlobalStyles';

const AppWrapper = () => (
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
);

const App = () => {
  const { currentUser } = useAuth();
  return currentUser ? <MurrowNRCS /> : <AuthPage />;
};

export default AppWrapper;
