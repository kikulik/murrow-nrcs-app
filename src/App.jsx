// src/App.jsx
import React from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppProvider } from './context/AppContext';
import AuthPage from './features/auth/AuthPage';
import MurrowNRCS from './features/MurrowNRCS';
import GlobalStyles from './components/ui/GlobalStyles';

const AppWrapper = () => (
  <AuthProvider>
    <AppProvider>
      <DndProvider backend={HTML5Backend}>
        <GlobalStyles />
        <App />
      </DndProvider>
    </AppProvider>
  </AuthProvider>
);

const App = () => {
  const { currentUser } = useAuth();
  return currentUser ? <MurrowNRCS /> : <AuthPage />;
};

export default AppWrapper;
