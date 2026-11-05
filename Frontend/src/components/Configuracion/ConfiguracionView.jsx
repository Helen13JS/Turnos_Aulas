import React, { useEffect, useState } from 'react';
import { BookOpen, LockKeyhole, ShieldCheck, Users } from 'lucide-react';
import { authService } from '../../services/auth.service';
import { configuracionService } from '../../services/configuracion.service';
import ModuleSidebar from '../Layout/ModuleSidebar';
import '../Academico/Academico.css';
import './Configuracion.css';
import TabCatalogos from './TabCatalogos';
import TabSeguridad from './TabSeguridad';
import TabUsuariosRBAC from './TabUsuariosRBAC';
import UsuarioRolModal from './UsuarioRolModal';
import DireccionesPanel from './DireccionesPanel';

const tabs = [
  { id: 'usuarios', label: '1. Usuarios y Roles (RBAC)', icon: Users },
  { id: 'catalogos', label: '2. Catálogos Institucionales', icon: BookOpen },
  { id: 'seguridad', label: '3. Mi Cuenta y Seguridad', icon: LockKeyhole },
];

export default function ConfiguracionView() {
  const user = authService.getCurrentUser();
  const [activeTab, setActiveTab] = useState('usuarios');
  const [usuarios, setUsuarios] = useState([]);
  const [editingUser, setEditingUser] = useState(null);
  const [catalogs, setCatalogs] = useState({ facultades: [], carreras: [], direcciones: [], planes: [] });
  const [periodoActivo, setPeriodoActivo] = useState(null);
  const [periodos, setPeriodos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = async () => {
    setLoading(true);
    const results = await Promise.allSettled([configuracionService.getUsuarios(), configuracionService.getFacultades(), configuracionService.getCarreras(), configuracionService.getPeriodos(), configuracionService.getPeriodoActivo(), configuracionService.getDirecciones()]);
    const [users, facultades, carreras, periods, active, directions] = results;
    if (directions.status === 'fulfilled') setCatalogs(previous => ({ ...previous, direcciones: directions.value }));
    if (users.status === 'fulfilled') setUsuarios(users.value);
    if (facultades.status === 'fulfilled') setCatalogs((previous) => ({ ...previous, facultades: facultades.value }));
    if (carreras.status === 'fulfilled') setCatalogs((previous) => ({ ...previous, carreras: carreras.value }));
    if (periods.status === 'fulfilled') setPeriodos(periods.value);
    if (active.status === 'fulfilled') setPeriodoActivo(active.value);
    if (results.every((result) => result.status === 'rejected')) setError('No se pudo cargar la configuración del sistema.');
    setLoading(false);
  };
  useEffect(() => { loadData(); }, []);
  const handlePassword = async (payload) => configuracionService.updatePassword(payload);
  const action = () => setError('Esta operación requiere un endpoint administrativo específico y no se ejecutó ninguna acción simulada.');
  if (loading) return <div className="academic-loading"><ShieldCheck size={30} className="spin" /><span>Cargando configuración...</span></div>;
  return <div className="academic-page configuration-page"><div className="academic-shell"><ModuleSidebar activeModule="configuración" periodo={periodoActivo} /><main className="academic-main"><header className="academic-header"><div><div className="academic-kicker"><span />Módulo Administrativo · Seguridad y Configuración</div><h1>Configuración del Sistema y Seguridad</h1><p>Control de acceso basado en roles, gestión de usuarios y catálogos institucionales.</p></div><div className="academic-user"><b>{(user?.email || 'US').slice(0, 2).toUpperCase()}</b><div><small>Bienvenido</small><strong>{user?.email || user?.nombre_completo || 'Usuario'}</strong></div><i /></div></header><div className="config-tabs"><div className="config-tab-buttons">{tabs.map(({ id, label, icon: Icon }) => <button className={activeTab === id ? 'active' : ''} key={id} onClick={() => setActiveTab(id)}><Icon size={16} /><span>{label}</span><b>{id === 'usuarios' ? usuarios.length : id === 'catalogos' ? 4 : 'Seg.'}</b></button>)}</div><div className="config-global-actions"><button className="config-secondary-button" disabled style={{ opacity: 0.6, cursor: 'not-allowed' }} title="Módulo de auditoría avanzada en desarrollo para la siguiente versión"><ShieldCheck size={14} />Auditoría de Seguridad (Próximamente)</button></div></div>{error && <div className="academic-error"><ShieldCheck size={17} />{error}</div>}{activeTab === 'usuarios' && <DireccionesPanel direcciones={catalogs.direcciones} carreras={catalogs.carreras} onSaved={loadData} />}{activeTab === 'usuarios' && <TabUsuariosRBAC usuarios={usuarios} onCreate={() => setEditingUser({})} onEditRole={setEditingUser} />}{activeTab === 'catalogos' && <TabCatalogos catalogs={catalogs} periodoActivo={periodoActivo} periodos={periodos} onRefresh={loadData} onPeriodChange={action} onAction={action} />}{activeTab === 'seguridad' && <TabSeguridad user={user} onChangePassword={handlePassword} />}{editingUser && <UsuarioRolModal usuario={editingUser} direcciones={catalogs.direcciones} onClose={() => setEditingUser(null)} onSaved={async () => { setEditingUser(null); await loadData(); }} />}</main></div></div>;
}
