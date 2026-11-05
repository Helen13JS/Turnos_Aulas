import React from 'react';
import { BookOpen, Building2, CalendarDays, ClipboardList, GraduationCap, LogOut, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const items = [
  { label: 'Portal estudiantil', icon: GraduationCap, path: '/portal' },
  { label: 'Mapa', icon: Building2, path: '/mapa' },
  { label: 'Académico', icon: GraduationCap, path: '/academico' },
  { label: 'Asignación', icon: ClipboardList, path: '/asignacion' },
  { label: 'Horarios', icon: CalendarDays, path: '/horarios' },
  { label: 'Aulas', icon: Building2, path: '/aulas' },
  { label: 'Configuración', icon: Settings, path: '/configuracion' },
];

export default function ModuleSidebar({ activeModule, periodo }) {
  const navigate = useNavigate();
  const { isSuperAdmin, logout } = useAuth();
  const visibleItems = items.filter((item) => item.label !== 'Configuración' || isSuperAdmin);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <aside className="academic-sidebar">
      <div>
        <div className="academic-brand">
          <span>
            <BookOpen size={20} />
          </span>
          <div>
            <strong>Aulas U</strong>
            <small>Gestión Académica</small>
          </div>
        </div>

        <nav className="academic-nav">
          {visibleItems.map(({ label, icon: Icon, path }) => (
            <button
              key={label}
              className={`academic-nav-item ${activeModule === label.toLowerCase() ? 'active' : ''}`}
              onClick={() => navigate(path)}
            >
              <Icon size={19} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
      </div>

      <div className="academic-sidebar-footer">
        <button className="academic-logout" onClick={handleLogout}>
          <LogOut size={16} />
          Cerrar sesión
        </button>
        <small>v2.4 · Periodo {periodo?.gestion || 'actual'}</small>
      </div>
    </aside>
  );
}
