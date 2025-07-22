import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import AppWrapper from './App'; // Make sure this points to App.jsx

console.log("index.jsx: Script is running"); // <-- ADD THIS
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<AppWrapper />); // Ensure you are rendering AppWrapper

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
