import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import { useAuth } from './hooks/useAuth';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import InventoryPage from './pages/InventoryPage';
import AssignmentsPage from './pages/AssignmentsPage';
import ProductEntryPage from './pages/ProductEntryPage';
import DispatchGuidesPage from './pages/DispatchGuidesPage';
import ProductDecommissionPage from './pages/ProductDecommissionPage';
import StockConsultPage from './pages/StockConsultPage';
import ProductCatalogPage from './pages/ProductCatalogPage';
import AccountManagementPage from './pages/AccountManagementPage';
import ExternalDecommissionActsPage from './pages/ExternalDecommissionActsPage';

function App() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />}
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      >
        <Route index element={<InventoryPage />} />
        <Route path="stock" element={<StockConsultPage />} />
        <Route path="asignaciones" element={<AssignmentsPage />} />
        <Route path="productos/nuevo" element={<ProductEntryPage />} />
        <Route path="productos/catalogo" element={<ProductCatalogPage />} />
        <Route path="guias" element={<DispatchGuidesPage />} />
        <Route path="bajas" element={<ProductDecommissionPage />} />
        <Route path="bajas/externas" element={<ExternalDecommissionActsPage />} />
        <Route path="administracion/cuentas" element={<AccountManagementPage />} />
      </Route>
      <Route
        path="*"
        element={<Navigate to={isAuthenticated ? '/' : '/login'} replace />}
      />
    </Routes>
  );
}

export default App;
