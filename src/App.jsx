import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppProvider } from './context/AppContext';
import { ErrorBoundary } from './components/ErrorBoundary';

// Componentes y Páginas
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';

import POSPage from './pages/POSPage';
import InventoryPage from './pages/InventoryPage';

import CreditPage from './pages/CreditPage';
import CashCutPage from './pages/CashCutPage';
import ReportsPage from './pages/ReportsPage';

// Componente para proteger las rutas privadas
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Layout>{children}</Layout>;
};

// Componente para proteger la ruta de Login (si ya está logueado va al Dashboard)
const PublicRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  if (isAuthenticated) return <Navigate to="/" replace />;
  return children;
};

function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <BrowserRouter>
          <Routes>
            {/* Rutas Públicas */}
            <Route 
              path="/login" 
              element={
                <PublicRoute>
                  <LoginPage />
                </PublicRoute>
              } 
            />
            <Route 
              path="/register" 
              element={
                <PublicRoute>
                  <ErrorBoundary>
                    <RegisterPage />
                  </ErrorBoundary>
                </PublicRoute>
              } 
            />

            {/* Rutas Privadas Reales */}
            <Route path="/" element={<ProtectedRoute><POSPage /></ProtectedRoute>} />
            <Route path="/inventario" element={<ProtectedRoute><InventoryPage /></ProtectedRoute>} />
            <Route path="/fiado" element={<ProtectedRoute><CreditPage /></ProtectedRoute>} />
            <Route path="/reportes" element={<ProtectedRoute><ReportsPage /></ProtectedRoute>} />
            <Route path="/corte" element={<ProtectedRoute><CashCutPage /></ProtectedRoute>} />
            
            {/* Fallback general */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AppProvider>
    </AuthProvider>
  );
}

export default App;
// Force Vite reload
