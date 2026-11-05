import React, { useEffect, useState } from 'react';
import { aulasService } from '../../services/aulas.service';

export default function RecursosModal({ aula, onClose, onUpdated }) {
  const [tipos, setTipos] = useState([]);
  const [recursos, setRecursos] = useState([]);
  const [form, setForm] = useState({ id_tipo_recurso: '', descripcion: '', nro_serie: '' });
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const reload = async () => {
    const current = await aulasService.getRecursos(aula.id_aula);
    setRecursos(current); onUpdated(aula.id_aula, current);
  };
  useEffect(() => {
    Promise.all([aulasService.getTiposRecurso(), aulasService.getRecursos(aula.id_aula)])
      .then(([types, resources]) => { setTipos(types); setRecursos(resources); })
      .catch(() => setError('No se pudo cargar el equipamiento.')).finally(() => setBusy(false));
  }, [aula.id_aula]);
  const run = async (action) => {
    setError(''); setBusy(true);
    try { await action(); await reload(); }
    catch (err) { setError(err.response?.data?.error || err.message); }
    finally { setBusy(false); }
  };
  const submit = (event) => {
    event.preventDefault();
    run(async () => { await aulasService.addRecurso(aula.id_aula, form); setForm({ id_tipo_recurso: '', descripcion: '', nro_serie: '' }); });
  };
  return <div className="academic-modal-backdrop"><div className="academic-modal" role="dialog" aria-modal="true" aria-label={`Recursos de ${aula.nombre_codigo}`}>
    <div className="academic-modal-header"><h2>Recursos de {aula.nombre_codigo}</h2><button type="button" disabled={busy} onClick={onClose} aria-label="Cerrar recursos">×</button></div>
    {error && <p role="alert" className="academic-error">{error}</p>}
    <ul>{recursos.map((r) => <li key={r.id_rec_aula} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: 8 }}>
      <span>{r.descripcion} <small>({r.tipo_recurso})</small></span>
      <button className="button button-light" disabled={busy} onClick={() => { if (window.confirm('¿Retirar este recurso del aula?')) run(() => aulasService.removeRecurso(aula.id_aula, r.id_rec_aula)); }}>Retirar</button>
    </li>)}</ul>
    <form onSubmit={submit}><div className="academic-form-grid">
      <label>Tipo de recurso<select required disabled={busy} value={form.id_tipo_recurso} onChange={(e) => setForm({ ...form, id_tipo_recurso: e.target.value })}><option value="">Seleccionar...</option>{tipos.map((t) => <option key={t.id_tipo_recurso} value={t.id_tipo_recurso}>{t.nombre_tipo}</option>)}</select></label>
      <label>Descripción del recurso<input required disabled={busy} maxLength={150} value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} /></label>
      <label>Número de serie (opcional)<input disabled={busy} maxLength={80} value={form.nro_serie} onChange={(e) => setForm({ ...form, nro_serie: e.target.value })} /></label>
    </div><div className="academic-modal-actions"><button type="submit" className="button button-primary" disabled={busy}>Instalar recurso</button></div></form>
  </div></div>;
}
