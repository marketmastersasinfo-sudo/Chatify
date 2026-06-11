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

function App() {
  return (
    <Router>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="crm-sales" element={<CrmSales />} />
          <Route path="crm-social" element={<CrmSocial />} />
          <Route path="/crm-logistics" element={<CrmLogistics />} />
          <Route path="/crm-remarketing-carts" element={<CrmRemarketingCarts />} />
          <Route path="/crm-remarketing-wa" element={<CrmRemarketingWa />} />
          <Route path="/database" element={<DB />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/stores" element={<Stores />} />
          <Route path="/comments" element={<Comments />} />
          <Route path="/broadcast" element={<Broadcast />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
