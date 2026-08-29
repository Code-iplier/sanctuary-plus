import { jsx as _jsx } from "react/jsx-runtime";
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/global.css';
const container = document.getElementById('root');
if (!container) {
    throw new Error('Root element #root not found');
}
const root = ReactDOM.createRoot(container);
root.render(_jsx(React.StrictMode, { children: _jsx(App, {}) }));
