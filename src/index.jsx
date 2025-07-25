/*
================================================================================
File: murrow-nrcs-app.git/src/index.jsx
Description: Main entry point for the application.
================================================================================
*/
import React from 'react';
import ReactDOM from 'react-dom/client';
import AppWrapper from './App';
import './index.css'; // Assuming you have this CSS file for Tailwind directives

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <AppWrapper />
  </React.StrictMode>
);
