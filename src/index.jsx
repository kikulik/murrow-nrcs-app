import React from 'react';
import ReactDOM from 'react-dom/client';
import AppWrapper from './App';

// 1. Create the root only ONCE
const root = ReactDOM.createRoot(document.getElementById('root'));

// 2. Render your single top-level AppWrapper component
root.render(
  <React.StrictMode>
    <AppWrapper />
  </React.StrictMode>
);
