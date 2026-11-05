import React, { useEffect, useState, useMemo } from 'react';
import { AlertCircle, BookOpen, Clock, Loader2, Plus, Trash2, X, Edit3, CheckCircle2 } from 'lucide-react';
import { apiService } from '../../services/api.service';
import { useAuth } from '../../context/AuthContext';

export default function PlanCurricularModal({ plan, allMaterias = [], semestres = [], tiposClase = [], onClose, onUpdated }) {
  const { isSuperAdmin, isDirector } = useAuth();
  const canManage = isSuperAdmin || isDirector;

  const [materiasPlan, setMateriasPlan] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  // Modo vincular / editar materia en el plan
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formMateriaId, setFormMateriaId] = useState('');
  const [formSemestreId, setFormSemestreId] = useState('');
  const [cargas, setCargas] = useState({});

  const reloadPlanMaterias = async () => {
    try {
      const res = await apiService.getMateriasPlan(plan.id_plan);
      setMateriasPlan(res.materias || []);
    } catch (e) {
      setError(e.message || 'No se pudieron cargar las materias del plan.');
    }
  };

  useEffect(() => {
    setLoading(true);
    reloadPlanMaterias().finally(() => setLoading(false));
  }, [plan.id_plan]);

  const openVincular = () => {
    setEditingItem(null);
    setFormMateriaId('');
    setFormSemestreId(semestres[0]?.id_semestre ? String(semestres[0].id_semestre) : '');
    const initialCargas = {};
    tiposClase.forEach(tc => { initialCargas[tc.id_tipo_clase] = ''; });
    setCargas(initialCargas);
    setError('');
    setNotice('');
    setShowForm(true);
  };

  const openEditItem = (item) => {
    setEditingItem(item);
    setFormMateriaId(String(item.id_materia));
    setFormSemestreId(String(item.id_semestre));
    const initialCargas = {};
    tiposClase.forEach(tc => {
      const found = (item.cargas || []).find(c => Number(c.id_tipo_clase) === Number(tc.id_tipo_clase));
      initialCargas[tc.id_tipo_clase] = found ? String(found.horas_semana) : '';
    });
    setCargas(initialCargas);
    setError('');
    setNotice('');
    setShowForm(true);
  };

  // Cargar cargas de materia seleccionada si no está en modo edición
  const handleMateriaChange = async (materiaId) => {
    setFormMateriaId(materiaId);
    if (!materiaId) return;
    try {
      const res = await apiService.getMateriaCarga(materiaId);
      const currentCargas = {};
      tiposClase.forEach(tc => {
        const found = (res.carga || []).find(c => Number(c.id_tipo_clase) === Number(tc.id_tipo_clase));
        currentCargas[tc.id_tipo_clase] = found ? String(found.horas_semana) : '';
      });
      setCargas(currentCargas);
    } catch {
      // Ignorar error de carga previa
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formMateriaId || !formSemestreId) {
      setError('Selecciona una materia y un semestre');
      return;
    }

    const cargasArray = Object.entries(cargas)
      .filter(([, h]) => h !== '' && Number(h) > 0)
      .map(([idTipo, h]) => ({
        id_tipo_clase: Number(idTipo),
        horas_semana: Number(h)
      }));

    if (cargasArray.length === 0) {
      setError('Debes configurar al menos una sesión con horas semanales mayor a 0');
      return;
    }

    setSaving(true);
    setError('');
    setNotice('');
    try {
      await apiService.vincularMateriaPlanConCarga({
        id_materia: Number(formMateriaId),
        id_plan: Number(plan.id_plan),
        id_semestre: Number(formSemestreId),
        cargas: cargasArray,
      });

      setNotice(editingItem ? 'Configuración de materia actualizada correctamente.' : 'Materia vinculada y carga configurada exitosamente.');
      setShowForm(false);
      await reloadPlanMaterias();
      if (onUpdated) await onUpdated();
    } catch (err) {
      setError(err.message || 'Error al guardar la configuración académica.');
    } finally {
      setSaving(false);
    }
  };

  const handleDesvincular = async (item) => {
    const confirmed = window.confirm(`¿Estás seguro de desvincular ${item.sigla} - ${item.nombre_materia} de este plan de estudio?`);
    if (!confirmed) return;

    setSaving(true);
    setError('');
    setNotice('');
    try {
      await apiService.desvincularMateriaPlan(item.id_mat_plan);
      setNotice(`Materia ${item.sigla} desvinculada exitosamente.`);
      await reloadPlanMaterias();
      if (onUpdated) await onUpdated();
    } catch (err) {
      setError(err.message || 'No se pudo desvincular la materia del plan.');
    } finally {
      setSaving(false);
    }
  };

  // Materias no vinculadas todavía (para opción nueva)
  const materiasDisponibles = useMemo(() => {
    const idsVinculadas = new Set(materiasPlan.map(m => m.id_materia));
    return allMaterias.filter(m => !idsVinculadas.has(m.id_materia) || (editingItem && m.id_materia === editingItem.id_materia));
  }, [allMaterias, materiasPlan, editingItem]);

  return (
    <div className="academic-modal-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget && !saving) onClose(); }}>
      <div className="academic-modal" style={{ width: 'min(820px, 96%)', maxHeight: '92vh' }}>
        <div className="academic-modal-header">
          <div>
            <div className="academic-kicker" style={{ marginBottom: 4 }}>
              <span></span>{plan.nombre_carrera || 'Carrera'} · Plan de Estudio
            </div>
            <h2>Malla Curricular: {plan.nombre_plan}</h2>
            <p>
              {plan.resolucion ? `Resolución: ${plan.resolucion} · ` : ''}
              {materiasPlan.length} materia(s) vinculada(s)
            </p>
          </div>
          <button type="button" onClick={onClose} disabled={saving} aria-label="Cerrar modal">
            <X size={18} />
          </button>
        </div>

        {notice && <div className="academic-notice" style={{ marginBottom: 12 }}>{notice}</div>}
        {error && <div className="academic-error" style={{ marginBottom: 12 }}><AlertCircle size={16} />{error}</div>}

        {/* Barra de acción: Vincular Materia */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <strong>Asignaturas en la Malla</strong>
          {canManage && !showForm && (
            <button type="button" className="button button-primary" onClick={openVincular}>
              <Plus size={15} /> Vincular Materia al Plan
            </button>
          )}
        </div>

        {/* Formulario desplegable para vincular o editar */}
        {showForm && (
          <form onSubmit={handleSubmit} style={{ background: '#f8fafc', padding: 16, borderRadius: 12, border: '1px solid #e2e8f0', marginBottom: 16 }}>
            <h3 style={{ margin: '0 0 10px 0', fontSize: 14, color: '#0f172a' }}>
              {editingItem ? `Editar Vinculación y Carga: ${editingItem.sigla}` : 'Vincular Materia y Configurar Cargas Horarias'}
            </h3>

            <div className="academic-form-grid" style={{ marginTop: 0 }}>
              <label>
                Materia
                <select
                  required
                  disabled={saving || Boolean(editingItem)}
                  value={formMateriaId}
                  onChange={(e) => handleMateriaChange(e.target.value)}
                >
                  <option value="">Seleccionar materia del catálogo...</option>
                  {materiasDisponibles.map(m => (
                    <option key={m.id_materia} value={m.id_materia}>
                      {m.sigla} · {m.nombre_materia}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Nivel / Semestre
                <select
                  required
                  disabled={saving}
                  value={formSemestreId}
                  onChange={(e) => setFormSemestreId(e.target.value)}
                >
                  <option value="">Seleccionar semestre...</option>
                  {semestres.map(s => (
                    <option key={s.id_semestre} value={s.id_semestre}>
                      {s.descripcion}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div style={{ marginTop: 14 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#334155', marginBottom: 8 }}>
                Cargas Horarias Semanales por Tipo de Sesión
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 10 }}>
                {tiposClase.map(tc => (
                  <div key={tc.id_tipo_clase} style={{ background: '#fff', padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                    <small style={{ fontWeight: 600, color: '#475569', display: 'block' }}>{tc.nombre_tipo}</small>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                      <input
                        type="number"
                        min="0"
                        max="30"
                        step="1"
                        placeholder="0"
                        value={cargas[tc.id_tipo_clase] ?? ''}
                        onChange={(e) => setCargas({ ...cargas, [tc.id_tipo_clase]: e.target.value })}
                        style={{ padding: '6px 8px', width: '70px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                        disabled={saving}
                      />
                      <span style={{ fontSize: 11, color: '#64748b' }}>Hrs/sem</span>
                    </div>
                  </div>
                ))}
              </div>
              <small style={{ display: 'block', color: '#64748b', marginTop: 8 }}>
                Indica las horas semanales para las sesiones correspondientes (teoría, laboratorio, etc.).
              </small>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14 }}>
              <button type="button" className="button button-light" onClick={() => setShowForm(false)} disabled={saving}>
                Cancelar
              </button>
              <button type="submit" className="button button-primary" disabled={saving}>
                {saving && <Loader2 size={14} className="spin" />}
                {saving ? 'Guardando...' : editingItem ? 'Actualizar Vinculación' : 'Guardar y Vincular al Plan'}
              </button>
            </div>
          </form>
        )}

        {/* Tabla de Materias del Plan */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '24px 0', color: '#64748b' }}>
            <Loader2 size={24} className="spin" style={{ display: 'inline-block', marginBottom: 8 }} />
            <p>Cargando materias del plan...</p>
          </div>
        ) : materiasPlan.length === 0 ? (
          <div className="empty-state" style={{ padding: 28, background: '#f8fafc', borderRadius: 12 }}>
            <BookOpen size={24} />
            <span>Este plan de estudio aún no tiene materias vinculadas.</span>
            {canManage && (
              <button type="button" className="button button-primary" onClick={openVincular} style={{ marginTop: 10 }}>
                <Plus size={15} /> Vincular la primera materia
              </button>
            )}
          </div>
        ) : (
          <div className="table-card" style={{ maxHeight: '45vh', overflow: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Sigla</th>
                  <th>Materia</th>
                  <th>Semestre</th>
                  <th>Carga Horaria</th>
                  {canManage && <th style={{ textAlign: 'center', width: '90px' }}>Acciones</th>}
                </tr>
              </thead>
              <tbody>
                {materiasPlan.map((m) => {
                  const totalHoras = (m.cargas || []).reduce((sum, c) => sum + Number(c.horas_semana || 0), 0);
                  return (
                    <tr key={m.id_mat_plan}>
                      <td><b className="code-pill">{m.sigla}</b></td>
                      <td><strong>{m.nombre_materia}</strong></td>
                      <td><span className="status neutral">{m.semestre}</span></td>
                      <td>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {(m.cargas && m.cargas.length > 0) ? (
                            m.cargas.map(c => (
                              <span key={c.id_tipo_clase || c.id_carga} className="equipment-pill" style={{ fontSize: 9 }}>
                                <Clock size={11} /> {c.nombre_tipo}: {c.horas_semana}h
                              </span>
                            ))
                          ) : (
                            <span style={{ color: '#94a3b8', fontSize: 10 }}>Sin carga configurada</span>
                          )}
                          {totalHoras > 0 && (
                            <strong style={{ fontSize: 10, color: '#1e293b', alignSelf: 'center', marginLeft: 4 }}>
                              ({totalHoras} hrs/sem)
                            </strong>
                          )}
                        </div>
                      </td>
                      {canManage && (
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'inline-flex', gap: 4 }}>
                            <button
                              type="button"
                              className="icon-button"
                              title="Editar vinculación y carga"
                              onClick={() => openEditItem(m)}
                              disabled={saving}
                            >
                              <Edit3 size={14} />
                            </button>
                            <button
                              type="button"
                              className="icon-button danger"
                              title="Desvincular materia del plan"
                              onClick={() => handleDesvincular(m)}
                              disabled={saving}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="academic-modal-actions" style={{ marginTop: 16 }}>
          <button type="button" className="button button-light" onClick={onClose} disabled={saving}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

