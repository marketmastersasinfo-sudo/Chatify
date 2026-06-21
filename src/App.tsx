import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { Dashboard } from './pages/Dashboard';
import { Settings } from './pages/Settings';
import { Stores } from './pages/Stores';
import { CrmSales } from './pages/CrmSales';
import { CrmSocial } from './pages/CrmSocial';
import { CrmLogistics } from './pages/CrmLogistics';
import { Database as DB } from './pages/Database';
import { Orders } from './pages/Orders';
import { Comments } from './pages/Comments';
import { Broadcast } from './pages/Broadcast';
import { CrmRemarketingCarts } from './pages/CrmRemarketingCarts';
import { CrmRemarketingWa } from './pages/CrmRemarketingWa';
import { TemplateBuilder } from './pages/TemplateBuilder';
import { SearchResults } from './pages/SearchResults';
import { Login } from './pages/Login';
import { UsersManagement } from './pages/UsersManagement';
import { Products } from './pages/Products';
import { Funnels } from './pages/Funnels';
import { AuthProvider, useAuth } from './lib/auth';
import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { token, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }
  
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
}
function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
            <Route path="/" element={<Dashboard />} />
            <Route path="crm-sales" element={<CrmSales />} />
            <Route path="crm-social" element={<CrmSocial />} />
            <Route path="/crm-logistics" element={<CrmLogistics />} />
            <Route path="/crm-remarketing-carts" element={<CrmRemarketingCarts />} />
            <Route path="/crm-remarketing-wa" element={<CrmRemarketingWa />} />
            <Route path="/database" element={<DB />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/stores" element={<Stores />} />
            <Route path="/products" element={<Products />} />
            <Route path="/funnels" element={<Funnels />} />
            <Route path="/comments" element={<Comments />} />
            <Route path="/broadcast" element={<Broadcast />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/templates" element={<TemplateBuilder />} />
            <Route path="/search" element={<SearchResults />} />
            <Route path="/users" element={<UsersManagement />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
