import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import DashboardLayout from './layouts/DashboardLayout';
import Overview from './pages/Dashboard/Overview';
import Products from './pages/Dashboard/Products';
import Purchases from './pages/Dashboard/Purchases';
import Billing from './pages/Dashboard/Billing';
import Employees from './pages/Dashboard/Employees';
import Ledger from './pages/Dashboard/Ledger';
import ProtectedRoute from './components/ProtectedRoute';

export default function App() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />

      {/* Protected Dashboard Routes */}
      <Route 
        path="/dashboard" 
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Overview />} />
        <Route path="products" element={<Products />} />
        <Route path="purchases" element={<Purchases />} />
        <Route path="billing" element={<Billing />} />
        <Route path="employees" element={<Employees />} />
        <Route path="ledger" element={<Ledger />} />
        {/* Placeholder for Settings */}
        <Route path="settings" element={
          <div style={{ padding: '2rem' }}>
            <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.8rem', color: 'var(--clr-text)' }}>Settings</h1>
            <p style={{ color: 'var(--clr-text-muted)' }}>Platform configuration options.</p>
          </div>
        } />
      </Route>
      
      {/* Fallback 404 Route */}
      <Route path="*" element={<Home />} />
    </Routes>
  );
}
