import React, { useEffect, useState } from 'react';
import { ROLE_LABELS, ROLE_VISUALIZADOR, ROLE_DIRECTOR_CARRERA } from '../../utils/roles';
import { apiService } from '../../services/api.service';
import { configuracionService } from '../../services/configuracion.service';
export default function UsuarioRolModal({ usuario, direcciones, onClose, onSaved }) {
  const editing = !!usuario?.id_usuario;
  const [form, setForm] = useState({ nombres: '', apellidos: '', nro_documento: '', email: '', password: '', id_tipo_doc: '', id_nacionalidad: '', rol: usuario?.rol || ROLE_VISUALIZADOR, id_direccion: usuario?.id_direccion || '' });
  const [docs, setDocs] = useState([]), [nations, setNations] = useState([]);
  const [error, setError] = useState(''), [busy, setBusy] = useState(false);
  useEffect(() => { if (!editing) Promise.all([apiService.getTiposDocumento(), apiService.getNacionalidades()]).then(([d, n]) => { setDocs(d.tipos_documento || d.tipos || []); setNations(n.nacionalidades || []); }).catch(e => setError(e.message)); }, [editing]);
  const change = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  async function submit(e) {
    e.preventDefault(); setBusy(true); setError('');
    try {
      const payload = { ...form, id_direccion: form.rol === ROLE_DIRECTOR_CARRERA ? Number(form.id_direccion) : null };
      if (editing) await configuracionService.updateUserRole(usuario.id_usuario, { rol: payload.rol, id_direccion: payload.id_direccion });
      else await configuracionService.createUser(payload);
      await onSaved();
    } catch (err) { setError(err.response?.data?.error || err.message); } finally { setBusy(false); }
  }
  return <div style={{ position: 'fixed', inset: 0, background: '#0007', zIndex: 2000, display: 'grid', placeItems: 'center' }}><form onSubmit={submit} role="dialog" aria-modal="true" aria-label={editing ? 'Cambiar rol' : 'Nuevo usuario'} style={{ background: 'white', padding: 24, borderRadius: 12, width: 460, maxHeight: '90vh', overflow: 'auto', display: 'grid', gap: 12 }}><h2>{editing ? `Cambiar rol de ${usuario.email}` : 'Nuevo usuario'}</h2>
    {!editing && <>{[['nombres', 'Nombres'], ['apellidos', 'Apellidos'], ['nro_documento', 'Documento'], ['email', 'Correo'], ['password', 'Contraseña']].map(([name, label]) => <label key={name}>{label}<input style={{ display: 'block', width: '100%' }} name={name} value={form[name]} type={name === 'password' ? 'password' : name === 'email' ? 'email' : 'text'} minLength={name === 'password' ? 8 : undefined} required onChange={change} /></label>)}
      <label>Tipo de documento<select name="id_tipo_doc" value={form.id_tipo_doc} onChange={change} required><option value="">Seleccionar</option>{docs.map(d => <option key={d.id_tipo_doc} value={d.id_tipo_doc}>{d.nombre_documento}</option>)}</select></label>
      <label>Nacionalidad<select name="id_nacionalidad" value={form.id_nacionalidad} onChange={change} required><option value="">Seleccionar</option>{nations.map(n => <option key={n.id_nacionalidad} value={n.id_nacionalidad}>{n.nombre_pais || n.nombre_nacionalidad || n.descripcion || n.id_nacionalidad}</option>)}</select></label></>}
    <label>Rol<select name="rol" value={form.rol} onChange={change}>{Object.entries(ROLE_LABELS).map(([r, label]) => <option key={r} value={r}>{label}</option>)}</select></label>
    {form.rol === ROLE_DIRECTOR_CARRERA && <label>Dirección<select name="id_direccion" value={form.id_direccion} required onChange={change}><option value="">Seleccionar Dirección</option>{direcciones.map(c => <option key={c.id_direccion} value={c.id_direccion}>{c.nombre_direccion}</option>)}</select></label>}
    {error && <p role="alert">{error}</p>}<div><button type="button" disabled={busy} onClick={onClose}>Cancelar</button> <button className="config-primary-button" disabled={busy} type="submit">{busy ? 'Guardando...' : 'Guardar usuario'}</button></div>
  </form></div>;
}
