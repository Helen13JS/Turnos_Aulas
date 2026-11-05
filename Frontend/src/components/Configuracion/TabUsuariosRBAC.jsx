import React, { useState } from 'react';
import { ROLE_LABELS } from '../../utils/roles';
const permissions = [
  ['Consultar portal, horarios y mapa', 'Sí', 'Sí', 'Sí'],
  ['Planificar y modificar distributivo', 'Todas las carreras', 'Su Dirección', 'No'],
  ['Gestionar infraestructura y recursos', 'Sí', 'No', 'No'],
  ['Abrir períodos y administrar usuarios', 'Sí', 'No', 'No'],
];
export default function TabUsuariosRBAC({ usuarios, onCreate, onEditRole }) {
  const [query, setQuery] = useState(''), [role, setRole] = useState('');
  const filtered = usuarios.filter(u => (!role || u.rol === role) && `${u.nombres} ${u.apellidos} ${u.email}`.toLowerCase().includes(query.toLowerCase()));
  return <div className="config-tab-stack"><section className="config-card"><div className="config-card-heading"><h2>Usuarios y roles</h2><span>{usuarios.length} cuentas</span></div>
    <div className="config-table-tools"><input aria-label="Buscar usuario" placeholder="Buscar usuario..." value={query} onChange={e => setQuery(e.target.value)} /><select aria-label="Filtrar rol" value={role} onChange={e => setRole(e.target.value)}><option value="">Todos los roles</option>{Object.entries(ROLE_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select><button className="config-primary-button" onClick={onCreate}>Nuevo Usuario</button></div>
    <div className="config-table-wrap"><table className="config-table"><thead><tr><th>Usuario</th><th>Rol</th><th>Dirección</th><th>Acciones</th></tr></thead><tbody>{filtered.map(u => <tr key={u.id_usuario}><td>{u.nombres} {u.apellidos}<small style={{ display: 'block' }}>{u.email}</small></td><td>{ROLE_LABELS[u.rol]}</td><td>{u.nombre_direccion || '—'}</td><td><button className="config-secondary-button" onClick={() => onEditRole(u)}>Cambiar rol</button></td></tr>)}</tbody></table></div></section>
    <section className="config-card"><h3>Permisos por rol</h3><div className="config-table-wrap"><table className="config-table"><thead><tr><th>Capacidad</th><th>Administrador General</th><th>Director de Carrera</th><th>Visualizador</th></tr></thead><tbody>{permissions.map(([name, ...values]) => <tr key={name}><td>{name}</td>{values.map((v, i) => <td key={i}>{v}</td>)}</tr>)}</tbody></table></div></section></div>;
}
