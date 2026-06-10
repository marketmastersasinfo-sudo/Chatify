import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { Dashboard } from './pages/Dashboard';
import { Settings } from './pages/Settings';
import { Stores } from './pages/Stores';
import { Crm } from './pages/Crm';
import { Database } from './pages/Database';
import { Orders } from './pages/Orders';
import { Comments } from './pages/Comments';

function App() {
  return (
    <Router>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/crm" element={<Crm />} />
          <Route path="/database" element={<Database />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/stores" element={<Stores />} />
          <Route path="/comments" element={<Comments />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
