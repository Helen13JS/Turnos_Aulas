import React, { useMemo, useState } from 'react';
import { Plus, Search, Trash2 } from 'lucide-react';
import { fullName } from './useDistributivo';
import { useAuth } from '../../context/AuthContext';

export default function TabAsignacionMaterias({
  docentes,
  grupos,
  asignaciones,
  cargaPorMateria,
  asignarDocente,
  desasignarDocente,
  docenteInicial = ''
}) {
  const { canManage, canManageGroup } = useAuth();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState({ id_docente: docenteInicial, id_grupo: '' });
  const [filterDocente, setFilterDocente] = useState(docenteInicial);
  const [query, setQuery] = useState('');

  const selectedGrupo = grupos.find((g) => String(g.id_grupo) === form.id_grupo);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!canManageGroup(selectedGrupo)) return;
    setError('');
    setSuccess('');
    setSaving(true);
    try {
      await asignarDocente({ id_grupo: Number(form.id_grupo), id_docente: Number(form.id_docente) });
      setForm((f) => ({ ...f, id_grupo: '' }));
      setSuccess('Asignación docente registrada correctamente.');
    } catch (e) {
      setError(e.message || 'No se pudo registrar la asignación.');
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (r) => {
    if (!canManageGroup(r.grupoObj)) {
      setError('No tienes permiso para gestionar este grupo.');
      return;
    }
    const confirmed = window.confirm(`¿Estás seguro de desasignar al docente "${r.docente}" del grupo "${r.grupo}" de ${r.sigla}?`);
    if (!confirmed) return;

    setError('');
    setSuccess('');
    setSaving(true);
    try {
      if (desasignarDocente) {
        await desasignarDocente({
          id_docente: r.id_docente,
          id_grupo: r.id_grupo,
          id_asig_doc: r.id_asig_doc
        });
      }
      setSuccess(`Docente ${r.docente} desasignado del grupo ${r.grupo} exitosamente.`);
    } catch (e) {
      setError(e.message || 'No se pudo retirar la asignación docente.');
    } finally {
      setSaving(false);
    }
  };

  // Una fila por docente-grupo-tipo de sesión con su carga fija.
  const rows = useMemo(() => asignaciones.flatMap((a) => {
    const carga = cargaPorMateria[a.grupo.id_materia];
    const sesiones = carga?.length ? carga : [{ id_tipo_clase: 'nd', nombre_tipo: 'N/D', horas_semana: null }];
    return sesiones.map((s) => ({
      key: `${a.id_asig_doc || `${a.id_docente}-${a.grupo.id_grupo}`}-${s.id_tipo_clase}`,
      id_asig_doc: a.id_asig_doc,
      id_docente: a.id_docente,
      id_grupo: a.grupo.id_grupo,
      grupoObj: a.grupo,
      docente: a.docente,
      materia: a.grupo.nombre_materia,
      sigla: a.grupo.sigla_materia,
      grupo: a.grupo.nombre_grupo,
      tipo: s.nombre_tipo,
      horas: s.horas_semana,
    }));
  }), [asignaciones, cargaPorMateria]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return rows.filter((r) => (!filterDocente || String(r.id_docente) === filterDocente)
      && (!q || `${r.docente} ${r.materia} ${r.sigla} ${r.grupo}`.toLowerCase().includes(q)));
  }, [rows, filterDocente, query]);

  return (
    <section className="academic-tab">
      {error && <div className="academic-error">{error}</div>}
      {success && <div className="academic-notice">{success}</div>}

      {canManage && <form className="filter-panel assign-form" onSubmit={handleSubmit}>
        <label>Docente
          <select required value={form.id_docente} onChange={(e) => setForm({ ...form, id_docente: e.target.value })}>
            <option value="">Seleccionar docente...</option>
            {docentes.map((d) => <option key={d.id_docente} value={d.id_docente}>{fullName(d)}</option>)}
          </select>
        </label>
        <label>Materia y grupo
          <select required value={form.id_grupo} onChange={(e) => setForm({ ...form, id_grupo: e.target.value })}>
            <option value="">Seleccionar materia / grupo...</option>
            {grupos.filter(canManageGroup).map((g) => (
              <option key={g.id_grupo} value={g.id_grupo}>
                {g.sigla_materia} · {g.nombre_materia} · Grupo {g.nombre_grupo}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="button button-primary" disabled={saving || !form.id_docente || !form.id_grupo}>
          <Plus size={15} />{saving ? 'Guardando...' : 'Asignar Docente'}
        </button>
        {selectedGrupo && <small className="assign-hint">{selectedGrupo.nombre_carrera} · {selectedGrupo.semestre}. La carga horaria y el tipo de sesión provienen de la materia.</small>}
      </form>}

      <div className="filter-panel">
        <div className="filters">
          <label>Docente
            <select value={filterDocente} onChange={(e) => setFilterDocente(e.target.value)}>
              <option value="">Todos los docentes</option>
              {docentes.map((d) => <option key={d.id_docente} value={d.id_docente}>{fullName(d)}</option>)}
            </select>
          </label>
          <label className="search-field">Búsqueda rápida
            <div><Search size={15} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Docente, materia o grupo..." /></div>
          </label>
        </div>
      </div>

      <div className="table-card">
        <table>
          <thead>
            <tr>
              <th>Docente</th>
              <th>Materia</th>
              <th>Grupo</th>
              <th>Tipo de sesión</th>
              <th>Carga horaria</th>
              {canManage && <th style={{ textAlign: 'center', width: '100px' }}>Acción</th>}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0
              ? <tr><td colSpan={canManage ? 6 : 5}>No hay asignaciones registradas.</td></tr>
              : filtered.map((r) => (
                <tr key={r.key}>
                  <td><strong>{r.docente}</strong></td>
                  <td><b className="code-pill">{r.sigla}</b> {r.materia}</td>
                  <td><span className="status neutral">{r.grupo}</span></td>
                  <td>{r.tipo}</td>
                  <td>{r.horas != null ? `${r.horas} Hrs/semana` : 'No registrada'}</td>
                  {canManage && (
                    <td style={{ textAlign: 'center' }}>
                      <button
                        type="button"
                        className="icon-button danger"
                        disabled={saving || !canManageGroup(r.grupoObj)}
                        onClick={() => handleRemove(r)}
                        title="Desasignar docente del grupo"
                        aria-label={`Desasignar ${r.docente} del grupo ${r.grupo}`}
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
