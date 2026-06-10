import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { Dashboard } from './pages/Dashboard';
import { Products } from './pages/Products';
import { Finance } from './pages/Finance';
import { Settings } from './pages/Settings';
import { Stores } from './pages/Stores';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/products" element={<Products />} />
          <Route path="/stores" element={<Stores />} />
          <Route path="/finance" element={<Finance />} />
          <Route path="/chats" element={<div className="text-gray-900 dark:text-white">Chats e IA - En construcción</div>} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
