import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { authService } from '../services/auth.service';
import { ROLE_SUPER_ADMIN, ROLE_DIRECTOR_CARRERA, ROLE_VISUALIZADOR } from '../utils/roles';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const refreshUser = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const profile = authService.getToken() ? await authService.getMe() : null;
      setUser(profile);
      return profile;
    } catch (err) {
      setUser(null);
      if (err.status === 401 || err.status === 403) authService.logout();
      else setError('No se pudo verificar la sesión. Intenta nuevamente.');
      throw err;
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { refreshUser().catch(() => {}); }, [refreshUser]);
  const logout = () => { authService.logout(); setUser(null); };
  const rol = user?.rol || ROLE_VISUALIZADOR;
  const isSuperAdmin = rol === ROLE_SUPER_ADMIN;
  const isDirector = rol === ROLE_DIRECTOR_CARRERA;
  const canManageGroup = useCallback((group) => !!group && (user?.rol === ROLE_SUPER_ADMIN ||
    (user?.rol === ROLE_DIRECTOR_CARRERA && Number(group.id_carrera) > 0 && (user.carreras_permitidas || []).some(id => Number(id) === Number(group.id_carrera)))), [user]);
  return <AuthContext.Provider value={{ user, rol, loading, error, refreshUser, logout, isSuperAdmin, isDirector,
    isViewer: rol === ROLE_VISUALIZADOR, canManage: isSuperAdmin || isDirector,
    canManageInfrastructure: isSuperAdmin, canManagePeriods: isSuperAdmin, canManageGroup }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
