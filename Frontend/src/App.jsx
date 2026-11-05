import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login/Login';
import Academico from './components/Academico/Academico';
import AulasView from './components/Aulas/AulasView';
import ConfiguracionView from './components/Configuracion/ConfiguracionView';
import Horarios from './components/Horarios/Horarios';
import Asignacion from './components/Asignacion/Asignacion';
import MapaAulas from './components/Aulas/MapaAulas';
import { authService } from './services/auth.service';
import { useAuth } from './context/AuthContext';

const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { user, loading, isSuperAdmin, error, refreshUser } = useAuth();
  if (loading) return <div className="academic-loading">Verificando sesión...</div>;
  if (error) return <div className="academic-loading">{error}<button onClick={() => refreshUser().catch(() => {})}>Reintentar</button></div>;
  if (!user || !authService.isAuthenticated()) {
    return <Navigate to="/" replace />;
  }
  if (adminOnly && !isSuperAdmin) return <Navigate to="/horarios" replace />;
  return children;
};

const App = () => {
  return (
    <Router>
      <Routes>
        <Route 
          path="/" 
          element={<Login />} 
        />
        <Route path="/dashboard" element={<Navigate to="/asignacion" replace />} />
        <Route path="/portal" element={<ProtectedRoute><Horarios portal /></ProtectedRoute>} />
        <Route path="/mapa" element={<ProtectedRoute><MapaAulas /></ProtectedRoute>} />
        <Route
          path="/academico"
          element={
            <ProtectedRoute>
              <Academico />
            </ProtectedRoute>
          }
        />
        <Route
          path="/aulas"
          element={
            <ProtectedRoute>
              <AulasView />
            </ProtectedRoute>
          }
        />
        <Route
          path="/configuracion"
          element={
            <ProtectedRoute adminOnly>
              <ConfiguracionView />
            </ProtectedRoute>
          }
        />
        <Route
          path="/horarios"
          element={
            <ProtectedRoute>
              <Horarios />
            </ProtectedRoute>
          }
        />
        <Route
          path="/asignacion"
          element={
            <ProtectedRoute>
              <Asignacion />
            </ProtectedRoute>
          }
        />
        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
};

export default App;

