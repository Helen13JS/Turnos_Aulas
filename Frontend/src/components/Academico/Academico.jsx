import CurriculumModal from './CurriculumModal';
import PlanCurricularModal from './PlanCurricularModal';
import { configuracionService } from '../../services/configuracion.service';
import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, BookOpen, Building2, CheckCircle2, ChevronRight, Download, FileText, Loader2, Plus, Search, Users, X } from 'lucide-react';
import { apiService } from '../../services/api.service';
import { authService } from '../../services/auth.service';
import ModuleSidebar from '../Layout/ModuleSidebar';
import './Academico.css';
import { useAuth } from '../../context/AuthContext';

const tabs = [
  { id: 'carreras', label: 'Carreras y Planes de Estudio', icon: Building2 },
  { id: 'materias', label: 'Materias y Malla Curricular', icon: BookOpen },
  { id: 'docentes', label: 'Directorio de Personal y Docentes', icon: Users },
];

const getName = (item, fallback = 'Sin nombre') => item?.nombre || item?.nombre_carrera || item?.nombre_materia || item?.descripcion || fallback;

function Header({ user }) {
  const label = user?.nombre_completo || user?.nombre || user?.email || 'Usuario';
  const initials = label.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
  return (
    <header className="academic-header">
      <div>
        <div className="academic-kicker"><span />Módulo Académico · Gestión Curricular</div>
        <h1>Gestión Académica e Institucional</h1>
        <p>Administración centralizada de carreras, planes curriculares, catálogo de materias y cuerpo docente.</p>
      </div>
      <div className="academic-user">
        <b>{initials}</b>
        <div><small>Bienvenido</small><strong>{label}</strong></div>
        <i />
      </div>
    </header>
  );
}

function KpiGrid({ counts }) {
  const cards = [
    { label: 'Carreras Activas', value: counts.carreras, suffix: 'Programas', note: 'Facultad de Tecnología', icon: Building2, color: 'blue' },
    { label: 'Planes de Estudio', value: counts.planes, suffix: 'registrados', note: 'Planes asociados a carreras', icon: FileText, color: 'purple' },
    { label: 'Catálogo de Materias', value: counts.materias, suffix: 'Materias', note: 'Asignaturas registradas', icon: BookOpen, color: 'indigo' },
    { label: 'Cuerpo Docente', value: counts.docentes, suffix: 'Profesores', note: 'Personal disponible', icon: Users, color: 'green' },
  ];
  return (
    <div className="academic-kpis">
      {cards.map(({ label, value, suffix, note, icon: Icon, color }) => (
        <div className="academic-kpi" key={label}>
          <div>
            <small>{label}</small>
            <strong>{value} <em>{suffix}</em></strong>
            <span className={`tone-${color}`}><CheckCircle2 size={12} />{note}</span>
          </div>
          <i className={`kpi-icon tone-${color}`}><Icon size={20} /></i>
        </div>
      ))}
    </div>
  );
}

function TabHeader({ title, description, action, onAction, secondary }) {
  const { isSuperAdmin: canManage } = useAuth();
  return (
    <div className="tab-heading">
      <div><h2>{title}</h2><p>{description}</p></div>
      <div className="tab-actions">
        {secondary && <button className="button button-light" onClick={secondary.onClick}><Download size={14} />{secondary.label}</button>}
        <button className="button button-primary" disabled={!canManage} onClick={onAction}><Plus size={16} />{action}</button>
      </div>
    </div>
  );
}

function AcademicCreateModal({ type, record, carreras, areas, modalidades, onClose, onSubmit }) {
  const initial = type === 'carrera'
    ? { id_facultad: '1', id_modalidad: '', id_direccion: '', nombre_carrera: '', sigla: '' }
    : type === 'plan'
      ? { id_carrera: record?.id_carrera || '', nombre_plan: '', resolucion: '', vigente: true }
      : { id_area: record?.id_area || '', nombre_materia: record?.nombre_materia || '', sigla: record?.sigla || '' };

  const [form, setForm] = useState(initial);
  const [direcciones, setDirecciones] = useState([]);
  const [facultades, setFacultades] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (type === 'carrera') {
      configuracionService.getDirecciones().then(setDirecciones).catch(err => setError(err.message));
      apiService.getAreas().catch(() => {});
    }
  }, [type]);

  const update = (key, value) => setForm((previous) => ({ ...previous, [key]: value }));
  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await onSubmit(form);
      onClose();
    } catch (requestError) {
      setError(requestError.message || 'No se pudo guardar el registro.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="academic-modal-backdrop">
      <form className="academic-modal" onSubmit={submit}>
        <div className="academic-modal-header">
          <div>
            <h2>{type === 'carrera' ? 'Nueva Carrera' : type === 'plan' ? 'Nuevo Plan de Estudio' : 'Registrar Materia'}</h2>
            <p>Los datos se guardarán en la base institucional.</p>
          </div>
          <button type="button" onClick={onClose}><X size={18} /></button>
        </div>
        {error && <div className="academic-error"><AlertCircle size={16} />{error}</div>}
        <div className="academic-form-grid">
          {type === 'carrera' && <>
            <label>Dirección Académica
              <select required value={form.id_direccion} onChange={event => update('id_direccion', event.target.value)}>
                <option value="">Seleccionar...</option>
                {direcciones.map(d => <option key={d.id_direccion} value={d.id_direccion}>{d.codigo} - {d.nombre_direccion}</option>)}
              </select>
            </label>
            <label>ID Facultad
              <input required value={form.id_facultad} onChange={(event) => update('id_facultad', event.target.value)} placeholder="1" />
            </label>
            <label>Modalidad
              <select required value={form.id_modalidad} onChange={(event) => update('id_modalidad', event.target.value)}>
                <option value="">Seleccionar...</option>
                {modalidades.map((item) => <option key={item.id_modalidad} value={item.id_modalidad}>{item.nombre_modalidad}</option>)}
              </select>
            </label>
            <label>Nombre de la Carrera
              <input required value={form.nombre_carrera} onChange={(event) => update('nombre_carrera', event.target.value)} />
            </label>
            <label>Sigla
              <input value={form.sigla} onChange={(event) => update('sigla', event.target.value)} placeholder="Ej. SIS" />
            </label>
          </>}
          {type === 'plan' && <>
            <label>Carrera
              <select required value={form.id_carrera} onChange={(event) => update('id_carrera', event.target.value)}>
                <option value="">Seleccionar...</option>
                {carreras.map((item) => <option key={item.id_carrera} value={item.id_carrera}>{item.nombre_carrera}</option>)}
              </select>
            </label>
            <label>Nombre del Plan
              <input required value={form.nombre_plan} onChange={(event) => update('nombre_plan', event.target.value)} placeholder="Ej. Plan 2026" />
            </label>
            <label>Resolución
              <input value={form.resolucion} onChange={(event) => update('resolucion', event.target.value)} placeholder="Ej. HCU N° 12/2026" />
            </label>
          </>}
          {type === 'materia' && <>
            <label>Área de Conocimiento
              <select required value={form.id_area} onChange={(event) => update('id_area', event.target.value)}>
                <option value="">Seleccionar...</option>
                {areas.map((item) => <option key={item.id_area} value={item.id_area}>{item.nombre_area}</option>)}
              </select>
            </label>
            <label>Nombre de la Materia
              <input required value={form.nombre_materia} onChange={(event) => update('nombre_materia', event.target.value)} />
            </label>
            <label>Sigla
              <input required value={form.sigla} onChange={(event) => update('sigla', event.target.value)} placeholder="Ej. SIS-101" />
            </label>
          </>}
        </div>
        <div className="academic-modal-actions">
          <button type="button" className="button button-light" onClick={onClose}>Cancelar</button>
          <button type="submit" className="button button-primary" disabled={saving}>
            {saving && <Loader2 size={15} className="spin" />}
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </form>
    </div>
  );
}

function GroupCreateModal({ materia, periodo, estados, onClose, onSubmit }) {
  const [form, setForm] = useState({ nombre_grupo: 'G1', id_mat_plan: '', id_estado_grupo: estados[0]?.id_estado_grupo || '' });
  const [links, setLinks] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    apiService.getConfiguracionMateria(materia.id_materia).then(c => {
      setLinks(c.planes || []);
      setForm(f => ({
        ...f,
        id_mat_plan: c.planes?.some(p => p.id_mat_plan === materia.id_mat_plan)
          ? materia.id_mat_plan
          : c.planes?.[0]?.id_mat_plan || ''
      }));
    }).catch(e => setError(e.message));
  }, [materia]);

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await onSubmit({
        id_mat_plan: Number(form.id_mat_plan),
        id_periodo: periodo.id_periodo,
        id_estado_grupo: Number(form.id_estado_grupo),
        nombre_grupo: form.nombre_grupo
      });
      onClose();
    } catch (requestError) {
      setError(requestError.message || 'No se pudo crear el grupo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="academic-modal-backdrop">
      <form className="academic-modal" onSubmit={submit}>
        <div className="academic-modal-header">
          <div>
            <h2>Crear grupo</h2>
            <p>{materia.nombre_materia} · Periodo {periodo.gestion}</p>
          </div>
          <button type="button" onClick={onClose}><X size={18} /></button>
        </div>
        {error && <div className="academic-error"><AlertCircle size={16} />{error}</div>}
        <div className="academic-form-grid">
          <label>Plan vinculado
            <select required value={form.id_mat_plan} onChange={e => setForm(f => ({ ...f, id_mat_plan: e.target.value }))}>
              <option value="">Seleccionar...</option>
              {links.map(p => <option key={p.id_mat_plan} value={p.id_mat_plan}>{p.nombre_plan}</option>)}
            </select>
          </label>
          <label>Nombre del grupo
            <input required value={form.nombre_grupo} onChange={(event) => setForm((previous) => ({ ...previous, nombre_grupo: event.target.value }))} placeholder="Ej. G1" />
          </label>
          <label>Estado
            <select required value={form.id_estado_grupo} onChange={(event) => setForm((previous) => ({ ...previous, id_estado_grupo: event.target.value }))}>
              <option value="">Seleccionar...</option>
              {estados.map((estado) => <option value={estado.id_estado_grupo} key={estado.id_estado_grupo}>{estado.nombre_estado}</option>)}
            </select>
          </label>
        </div>
        <div className="academic-modal-actions">
          <button type="button" className="button button-light" onClick={onClose}>Cancelar</button>
          <button type="submit" className="button button-primary" disabled={saving || !form.id_mat_plan}>
            {saving && <Loader2 size={15} className="spin" />}
            {saving ? 'Guardando...' : 'Crear grupo'}
          </button>
        </div>
      </form>
    </div>
  );
}

function CarrerasTab({ carreras, planesByCarrera, onCreate, onPlanCreate, onViewPlan }) {
  const { isSuperAdmin: canManage } = useAuth();
  return (
    <section className="academic-tab">
      <TabHeader
        title="Carreras de la Facultad y Planes Académicos"
        description="Gestión de carreras, modalidad académica y planes de estudio asociados."
        action="Nueva Carrera"
        onAction={onCreate}

      />
      <div className="career-grid">
        {carreras.length === 0 ? <EmptyState text="No hay carreras registradas." /> : carreras.map((career, index) => {
          const id = career.id_carrera || career.id;
          const plans = planesByCarrera[id] || [];
          return (
            <article className={`career-card accent-${index % 3}`} key={id || index}>
              <div>
                <div className="career-meta">
                  <span>COD: {career.codigo || career.sigla || id || 'N/D'}</span>
                  <b><i />{career.nombre_modalidad || career.modalidad || 'Presencial'}</b>
                </div>
                <h3>{getName(career)}</h3>
                <p>{career.descripcion || 'Carrera académica de la Facultad de Tecnología.'}</p>
                <div className="plan-list">
                  <div className="list-title">
                    <b>Planes de Estudio</b>
                    <button disabled={!canManage} onClick={() => onPlanCreate(career)}>+ Asociar Plan</button>
                  </div>
                  {plans.length === 0 ? (
                    <small className="muted">Sin planes asociados</small>
                  ) : plans.map((plan) => (
                    <div
                      className="plan-row"
                      key={plan.id_plan || plan.id}
                      style={{ cursor: 'pointer' }}
                      onClick={() => onViewPlan({ ...plan, nombre_carrera: career.nombre_carrera || career.nombre })}
                      title="Ver y configurar malla curricular"
                    >
                      <strong>P{plan.numero || plan.codigo || plan.id_plan || plan.id}</strong>
                      <div>
                        <b>{plan.nombre_plan || plan.nombre || 'Plan de estudio'}</b>
                        <small>{plan.vigente !== false ? 'Vigente' : 'Inactivo'} · Ver Malla Curricular</small>
                      </div>
                      <ChevronRight size={15} />
                    </div>
                  ))}
                </div>
              </div>
              <footer>
                <span>{career.docentes || 0} Docentes</span>
                <button
                  disabled={!plans.length}
                  onClick={() => onViewPlan({ ...plans[0], nombre_carrera: career.nombre_carrera || career.nombre })}
                >
                  Ver Malla Curricular <ChevronRight size={14} />
                </button>
              </footer>
            </article>
          );
        })}
      </div>
      <div className="curriculum-summary">
        <div>
          <h3>Estructura Curricular Institucional</h3>
          <p>Parámetros globales aplicados a las carreras de la Universidad.</p>
        </div>
        <div className="summary-grid">
          <Summary label="Régimen Académico" value="Semestral Regular" note="2 períodos por año lectivo" />
          <Summary label="Carga Horaria Promedio" value="Configurada por materia" note="Teoría, laboratorio y práctica" />
          <Summary label="Límite de Créditos" value="Según plan vigente" note="Validación automática" />
          <Summary label="Prerrequisitos" value="Estricto / Bloqueante" note="Control en inscripción" good />
        </div>
      </div>
    </section>
  );
}

function Summary({ label, value, note, good }) {
  return <div className="summary-item"><small>{label}</small><strong className={good ? 'good' : ''}>{value}</strong><span>{note}</span></div>;
}

function MateriasTab({ materias, onCreate, onEdit, onGroupCreate }) {
  const { isSuperAdmin: canManage, canManageGroup } = useAuth();
  const [query, setQuery] = useState('');
  const [semester, setSemester] = useState('');
  const [groupMateriaId, setGroupMateriaId] = useState('');

  const filtered = materias.filter((item) =>
    `${item.nombre_materia || ''} ${item.sigla || ''} ${item.nombre_area || ''}`.toLowerCase().includes(query.toLowerCase()) &&
    (!semester || String(item.semestre || '') === semester)
  );
  const selectedGroupMateria = materias.find((item) => String(item.id_materia) === String(groupMateriaId));

  return (
    <section className="academic-tab">
      <div className="filter-panel">
        <TabHeader
          title="Catálogo de Materias y Malla Curricular"
          description="Asignaturas, semestre, área y carga horaria provenientes del catálogo institucional."
          action="Registrar Materia"
          onAction={onCreate}
        />
        <div className="filters">
          <label>Materia para grupo
            <select value={groupMateriaId} onChange={(event) => setGroupMateriaId(event.target.value)}>
              <option value="">Seleccionar materia...</option>
              {materias.map((item) => (
                <option key={item.id_materia} value={item.id_materia}>
                  {item.sigla || item.nombre_materia} · {item.nombre_materia}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="button button-primary"
            disabled={!canManageGroup(selectedGroupMateria)}
            onClick={() => onGroupCreate(selectedGroupMateria)}
          >
            <Plus size={15} />Crear grupo
          </button>
          <label>Semestre
            <select value={semester} onChange={(event) => setSemester(event.target.value)}>
              <option value="">Todos los semestres</option>
              {Array.from({ length: 10 }, (_, index) => <option value={`${index + 1}`} key={index}>{index + 1}° semestre</option>)}
            </select>
          </label>
          <label className="search-field">Búsqueda rápida
            <div>
              <Search size={15} />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Sigla, nombre o área..." />
              {query && <button onClick={() => setQuery('')}><X size={14} /></button>}
            </div>
          </label>
        </div>
      </div>
      <div className="table-card">
        <table>
          <thead>
            <tr>
              <th>Sigla / Código</th>
              <th>Nombre de la Materia</th>
              <th>Semestre</th>
              <th>Carga Horaria</th>
              <th>Área</th>
              <th>Grupos</th>
              <th>Acción</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan="7"><EmptyState text="No hay materias que coincidan con los filtros." /></td></tr>
            ) : filtered.map((item) => (
              <tr key={item.id_materia}>
                <td><b className="code-pill">{item.sigla || `MAT-${item.id_materia}`}</b></td>
                <td><strong>{item.nombre_materia}</strong><small>{item.id_plan ? `Plan ${item.id_plan}` : 'Plan no asociado'}</small></td>
                <td><span className="status neutral">{item.semestre || 'No registrado'}</span></td>
                <td><strong>{item.carga_horaria ?? 'No registrada'} Hrs/semana</strong></td>
                <td><span className="status success"><i />{item.nombre_area || 'No registrada'}</span></td>
                <td><span className={`status ${item.cantidad_grupos > 0 ? 'success' : 'neutral'}`}>{item.cantidad_grupos > 0 ? `${item.cantidad_grupos} grupo(s)` : 'Sin grupo'}</span></td>
                <td>
                  <button className="icon-button" title="Editar materia, plan y carga" disabled={!canManage} onClick={() => onEdit(item)}>
                    <FileText size={15} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function DocentesTab({ docentes, onRefresh }) {
  const { isSuperAdmin: canManage } = useAuth();
  const emptyForm = { id_tipo_doc: '', id_nacionalidad: '', nro_documento: '', nombres: '', apellidos: '', fecha_nacimiento: '', id_tipo_contrato: '' };
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [catalogs, setCatalogs] = useState({ tipos: [], nacionalidades: [], contratos: [] });
  const [saving, setSaving] = useState(false);
  const [loadingCatalogs, setLoadingCatalogs] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const filtered = docentes.filter((docente) =>
    `${docente.nombres || ''} ${docente.apellidos || ''} ${docente.nro_documento || ''} ${docente.nombre_contrato || ''}`.toLowerCase().includes(query.toLowerCase())
  );

  const openModal = async (docente = null) => {
    setEditingId(docente?.id_docente || null);
    setForm(docente?.id_docente ? { ...emptyForm, ...docente } : emptyForm);
    setError('');
    setNotice('');
    setOpen(true);
    setLoadingCatalogs(true);
    try {
      const [tipos, nacionalidades, contratos] = await Promise.all([
        apiService.getTiposDocumento(),
        apiService.getNacionalidades(),
        apiService.getTiposContrato()
      ]);
      setCatalogs({
        tipos: tipos.tipos || [],
        nacionalidades: nacionalidades.nacionalidades || [],
        contratos: contratos.tipos || []
      });
    } catch (requestError) {
      setError(requestError.message || 'No se pudieron cargar los catálogos del formulario.');
    } finally { setLoadingCatalogs(false); }
  };

  const update = (field, value) => setForm((previous) => ({ ...previous, [field]: value }));
  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    try {
      if (editingId) await apiService.actualizarDocente(editingId, {
        nombres: form.nombres,
        apellidos: form.apellidos,
        id_tipo_contrato: Number(form.id_tipo_contrato),
        activo: form.activo
      });
      else await apiService.crearDocente({
        ...form,
        id_tipo_doc: Number(form.id_tipo_doc),
        id_nacionalidad: Number(form.id_nacionalidad),
        id_tipo_contrato: Number(form.id_tipo_contrato)
      });
      setForm(emptyForm);
      setOpen(false);
      setNotice(editingId ? 'Docente actualizado correctamente.' : 'Docente registrado correctamente.');
      await onRefresh();
    } catch (requestError) {
      setError(requestError.message || 'No se pudo guardar el docente.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="academic-tab">
      <div className="filter-panel">
        <TabHeader title="Directorio de Personal y Docentes" description="Consulta y gestiona los datos del personal docente." action="Nuevo registro" onAction={() => openModal()} />
        <label className="directory-search">
          <Search size={16} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nombre, CI o contrato..." />
        </label>
        {notice && <div className="academic-notice">{notice}</div>}
      </div>
      <div className="teacher-grid">
        {filtered.length === 0 ? <EmptyState text="No hay docentes que coincidan con la búsqueda." /> : filtered.map((docente, index) => {
          const name = `${docente.nombres || ''} ${docente.apellidos || ''}`.trim() || 'Docente';
          return (
            <article className="teacher-card" key={docente.id_docente || docente.id || index}>
              <div className="teacher-avatar">{name.split(' ').slice(0, 2).map((part) => part[0]).join('').toUpperCase()}</div>
              <div>
                <h3>{name}</h3>
                <p>{docente.nro_documento || 'CI no registrado'} · {docente.nombre_contrato || 'Contrato no registrado'}</p>
                <span className={`status ${docente.activo ? 'success' : 'neutral'}`}><i />{docente.activo ? 'Activo' : 'Inactivo'}</span>
              </div>
              {canManage && <button className="icon-button" onClick={() => openModal(docente)} title={`Editar a ${name}`} aria-label={`Editar a ${name}`}>
                <ChevronRight size={16} />
              </button>}
            </article>
          );
        })}
      </div>
      {open && (
        <div className="academic-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) setOpen(false); }}>
          <form className="academic-modal" role="dialog" aria-modal="true" aria-labelledby="docente-modal-title" onSubmit={submit}>
            <div className="academic-modal-header">
              <div><h2 id="docente-modal-title">{editingId ? 'Editar Docente' : 'Registrar Docente'}</h2><p>Los datos se guardarán en la base institucional.</p></div>
              <button type="button" aria-label="Cerrar" onClick={() => setOpen(false)} disabled={saving}><X size={18} /></button>
            </div>
            {error && <div className="academic-error"><AlertCircle size={16} />{error}</div>}
            <div className="academic-form-grid">
              <label>Nombres<input required maxLength={100} value={form.nombres} onChange={(event) => update('nombres', event.target.value)} /></label>
              <label>Apellidos<input required maxLength={100} value={form.apellidos} onChange={(event) => update('apellidos', event.target.value)} /></label>
              {!editingId && <><label>Número de documento<input required value={form.nro_documento} onChange={(event) => update('nro_documento', event.target.value)} /></label>
              <label>Tipo de documento
                <select required value={form.id_tipo_doc} onChange={(event) => update('id_tipo_doc', event.target.value)}>
                  <option value="">Seleccionar...</option>
                  {catalogs.tipos.map((item) => <option value={item.id_tipo_doc} key={item.id_tipo_doc}>{item.sigla || item.nombre_documento}</option>)}
                </select>
              </label>
              <label>Nacionalidad
                <select required value={form.id_nacionalidad} onChange={(event) => update('id_nacionalidad', event.target.value)}>
                  <option value="">Seleccionar...</option>
                  {catalogs.nacionalidades.map((item) => <option value={item.id_nacionalidad} key={item.id_nacionalidad}>{item.nombre_pais}</option>)}
                </select>
              </label>
              </>}
              <label>Tipo de contrato
                <select required value={form.id_tipo_contrato} onChange={(event) => update('id_tipo_contrato', event.target.value)}>
                  <option value="">Seleccionar...</option>
                  {catalogs.contratos.map((item) => <option value={item.id_tipo_contrato} key={item.id_tipo_contrato}>{item.nombre_contrato}</option>)}
                </select>
              </label>
              {!editingId && <label>Fecha de nacimiento<input type="date" value={form.fecha_nacimiento} onChange={(event) => update('fecha_nacimiento', event.target.value)} /></label>}
              {editingId && <label>Estado del docente<select value={String(form.activo)} onChange={(event) => update('activo', event.target.value === 'true')}><option value="true">Activo</option><option value="false">Inactivo</option></select></label>}
            </div>
            <div className="academic-modal-actions">
              <button type="button" className="button button-light" onClick={() => setOpen(false)} disabled={saving}>Cancelar</button>
              <button type="submit" className="button button-primary" disabled={saving || loadingCatalogs || !catalogs.contratos.length}>
                {saving && <Loader2 size={15} className="spin" />}
                {saving ? 'Guardando...' : 'Guardar docente'}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}

function EmptyState({ text }) {
  return <div className="empty-state"><BookOpen size={22} /><span>{text}</span></div>;
}

export default function Academico() {
  const user = authService.getCurrentUser();
  const [activeTab, setActiveTab] = useState('carreras');
  const [periodo, setPeriodo] = useState(null);
  const [carreras, setCarreras] = useState([]);
  const [materias, setMaterias] = useState([]);
  const [docentes, setDocentes] = useState([]);
  const [planesByCarrera, setPlanesByCarrera] = useState({});
  const [areas, setAreas] = useState([]);
  const [modalidades, setModalidades] = useState([]);
  const [semestres, setSemestres] = useState([]);
  const [tiposClase, setTiposClase] = useState([]);
  const [modalType, setModalType] = useState('');
  const [editingMateria, setEditingMateria] = useState(null);
  const [planCareer, setPlanCareer] = useState(null);
  const [viewPlan, setViewPlan] = useState(null);
  const [groupMateria, setGroupMateria] = useState(null);
  const [groupStates, setGroupStates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    Promise.allSettled([
      apiService.getPeriodoActivo(),
      apiService.getCarreras(),
      apiService.getMaterias(),
      apiService.getDocentes(),
      apiService.getAreas(),
      apiService.getModalidades(),
      apiService.getEstadosGrupo(),
      apiService.getSemestres(),
      apiService.getTiposClase()
    ]).then(async ([periodoRes, carrerasRes, materiasRes, docentesRes, areasRes, modalidadesRes, groupStatesRes, semestresRes, tiposClaseRes]) => {
      if (!mounted) return;
      if (periodoRes.status === 'fulfilled') setPeriodo(periodoRes.value.periodo || null);
      if (carrerasRes.status === 'fulfilled') {
        const list = carrerasRes.value.carreras || [];
        setCarreras(list);
        const pairs = await Promise.all(list.map(async (career) => {
          const id = career.id_carrera || career.id;
          try {
            const response = await apiService.getPlanesCarrera(id);
            return [id, response.planes || []];
          } catch {
            return [id, []];
          }
        }));
        if (mounted) setPlanesByCarrera(Object.fromEntries(pairs));
      }
      if (materiasRes.status === 'fulfilled') setMaterias(materiasRes.value.materias || []);
      if (docentesRes.status === 'fulfilled') setDocentes(docentesRes.value.docentes || []);
      if (areasRes.status === 'fulfilled') setAreas(areasRes.value.areas || []);
      if (modalidadesRes.status === 'fulfilled') setModalidades(modalidadesRes.value.modalidades || []);
      if (groupStatesRes.status === 'fulfilled') setGroupStates(groupStatesRes.value.estados || []);
      if (semestresRes.status === 'fulfilled') setSemestres(semestresRes.value.semestres || []);
      if (tiposClaseRes.status === 'fulfilled') setTiposClase(tiposClaseRes.value.tipos_clase || []);
      if ([carrerasRes, materiasRes, docentesRes].every((result) => result.status === 'rejected')) setError('No fue posible cargar el módulo académico.');
      setLoading(false);
    });
    return () => { mounted = false; };
  }, []);

  const counts = useMemo(() => ({
    carreras: carreras.length,
    planes: Object.values(planesByCarrera).flat().length,
    materias: materias.length,
    docentes: docentes.length
  }), [carreras, planesByCarrera, materias, docentes]);

  const reloadDocentes = async () => {
    const response = await apiService.getDocentes();
    setDocentes(response.docentes || []);
  };

  const refreshAcademic = async () => {
    const [careerResponse, materiaResponse] = await Promise.all([apiService.getCarreras(), apiService.getMaterias()]);
    setCarreras(careerResponse.carreras || []);
    setMaterias(materiaResponse.materias || []);
    const pairs = await Promise.all((careerResponse.carreras || []).map(async c => [c.id_carrera, (await apiService.getPlanesCarrera(c.id_carrera)).planes || []]));
    setPlanesByCarrera(Object.fromEntries(pairs));
  };

  const submitAcademic = async (type, form) => {
    if (type === 'carrera') await apiService.crearCarrera({ ...form, id_facultad: Number(form.id_facultad), id_modalidad: Number(form.id_modalidad) });
    if (type === 'plan') await apiService.crearPlan({ ...form, id_carrera: Number(form.id_carrera) });
    if (type === 'materia') {
      const payload = { ...form, id_area: Number(form.id_area) };
      if (editingMateria) await apiService.actualizarMateria(editingMateria.id_materia, payload);
      else await apiService.crearMateria(payload);
    }
    await refreshAcademic();
  };

  const submitGroup = async (form) => {
    await apiService.crearGrupo(form);
    await refreshAcademic();
  };

  if (loading) return <div className="academic-loading"><BookOpen size={30} className="spin" /><span>Cargando módulo académico...</span></div>;

  return (
    <div className="academic-page">
      <div className="academic-shell">
        <ModuleSidebar activeModule="académico" periodo={periodo} />
        <main className="academic-main">
          <Header user={user} />
          <KpiGrid counts={counts} />
          <div className="academic-tabs">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button key={id} className={activeTab === id ? 'active' : ''} onClick={() => setActiveTab(id)}>
                <Icon size={16} />
                <span>{label}</span>
                <b>{id === 'carreras' ? counts.carreras : id === 'materias' ? counts.materias : counts.docentes}</b>
              </button>
            ))}
          </div>

          {error && <div className="academic-error"><AlertCircle size={17} />{error}</div>}

          {activeTab === 'carreras' && (
            <CarrerasTab
              carreras={carreras}
              planesByCarrera={planesByCarrera}
              onCreate={() => setModalType('carrera')}
              onPlanCreate={career => { setPlanCareer(career); setModalType('plan'); }}
              onViewPlan={setViewPlan}
            />
          )}

          {activeTab === 'materias' && (
            <MateriasTab
              materias={materias}
              carreras={carreras}
              onCreate={() => { setEditingMateria(null); setModalType('materia'); }}
              onEdit={(materia) => { setEditingMateria(materia); setModalType('materia'); }}
              onGroupCreate={setGroupMateria}
            />
          )}

          {activeTab === 'docentes' && <DocentesTab docentes={docentes} onRefresh={reloadDocentes} />}

          {modalType === 'materia' && (
            <CurriculumModal
              record={editingMateria}
              areas={areas}
              onClose={() => { setModalType(''); setEditingMateria(null); }}
              onSaved={refreshAcademic}
            />
          )}

          {/* Modal interactivo de Malla Curricular del Plan */}
          {viewPlan && (
            <PlanCurricularModal
              plan={viewPlan}
              allMaterias={materias}
              semestres={semestres}
              tiposClase={tiposClase}
              onClose={() => setViewPlan(null)}
              onUpdated={refreshAcademic}
            />
          )}

          {modalType && modalType !== 'materia' && (
            <AcademicCreateModal
              type={modalType}
              record={modalType === 'plan' ? planCareer : editingMateria}
              carreras={carreras}
              areas={areas}
              modalidades={modalidades}
              onClose={() => { setModalType(''); setEditingMateria(null); }}
              onSubmit={(form) => submitAcademic(modalType, form)}
            />
          )}

          {groupMateria && periodo && (
            <GroupCreateModal
              materia={groupMateria}
              periodo={periodo}
              estados={groupStates}
              onClose={() => setGroupMateria(null)}
              onSubmit={submitGroup}
            />
          )}
        </main>
      </div>
    </div>
  );
}
