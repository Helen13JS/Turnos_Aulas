import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, CheckCircle2, Info, Loader2, MapPin, Search, X } from 'lucide-react';
import { apiService } from '../../services/api.service';
import { fullName } from './useDistributivo';
import GridSemanal from '../Horarios/GridSemanal';
import { useAuth } from '../../context/AuthContext';
import OcupacionDetalle, { textoClase } from './OcupacionDetalle';

const normalizeDay = (value) => (value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const slotLabel = (b) => `${b.hora_inicio.substring(0, 5)} - ${b.hora_fin.substring(0, 5)}`;
const slotKey = (b) => `${b.hora_inicio.substring(0, 5)}-${b.hora_fin.substring(0, 5)}`;

export default function TabPlanificacionHorarios({ periodo, docentes, asignaciones, cargaPorMateria, onAsignarMaterias }) {
  const { canManage, canManageGroup } = useAuth();
  const [detalleAulas, setDetalleAulas] = useState({});
  const [inspeccion, setInspeccion] = useState(null);
  const [disponibilidadError, setDisponibilidadError] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [docenteId, setDocenteId] = useState(null);
  const [selectedGrupoId, setSelectedGrupoId] = useState(null);
  const [tipoClaseId, setTipoClaseId] = useState('');
  const [selectedDay, setSelectedDay] = useState('');
  const [pabellonId, setPabellonId] = useState('');
  const [selectedSlots, setSelectedSlots] = useState([]);

  const [dias, setDias] = useState([]);
  const [bloques, setBloques] = useState([]);
  const [pabellones, setPabellones] = useState([]);
  const [aulas, setAulas] = useState([]);
  const [horarios, setHorarios] = useState([]);
  const [ocupadas, setOcupadas] = useState({}); // id_bloque -> Set(id_aula)
  const [loadingHorarios, setLoadingHorarios] = useState(false);
  const [loadingDisp, setLoadingDisp] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    Promise.all([apiService.getDias(), apiService.getBloques(), apiService.getPabellones()])
      .then(([d, b, p]) => {
        const days = d.dias || [];
        setDias(days);
        setBloques(b.bloques || []);
        setPabellones(p.pabellones || []);
        if (days.length) setSelectedDay(days[0].nombre_dia);
      })
      .catch((e) => setErrorMsg(e.message || 'No se pudieron cargar los catálogos de horarios.'));
  }, []);

  const loadHorariosDocente = useCallback(async (id) => {
    setLoadingHorarios(true);
    try { setHorarios((await apiService.getHorariosDocente(id)).horarios || []); }
    catch { setHorarios([]); }
    finally { setLoadingHorarios(false); }
  }, []);

  useEffect(() => {
    if (docenteId) loadHorariosDocente(docenteId); else setHorarios([]);
  }, [docenteId, loadHorariosDocente]);

  useEffect(() => {
    if (!pabellonId) { setAulas([]); return; }
    apiService.getAulasPabellon(pabellonId).then((r) => setAulas(r.aulas || [])).catch(() => setAulas([]));
  }, [pabellonId]);

  const dia = useMemo(() => dias.find((d) => d.nombre_dia === selectedDay), [dias, selectedDay]);

  const loadDisponibilidad = useCallback(async () => {
    if (!periodo || !dia || !bloques.length) { setOcupadas({}); return; }
    setLoadingDisp(true);
    setDisponibilidadError(false);
    try {
      const results = await Promise.all(bloques.map((b) => apiService.getAulasDisponibles({ dia: dia.id_dia, bloque: b.id_bloque, periodo: periodo.id_periodo })));
      const map = {};
      bloques.forEach((b, i) => { map[b.id_bloque] = new Set((results[i].aulas || []).filter((a) => a.ocupada || a.no_disponible).map((a) => a.id_aula)); });
      setOcupadas(map);
      setDetalleAulas(Object.fromEntries(bloques.map((b, i) => [b.id_bloque, Object.fromEntries((results[i].aulas || []).map((a) => [a.id_aula, a.ocupaciones || a.clases || []]))])));
    } catch (e) { setDisponibilidadError(true); setOcupadas({}); setDetalleAulas({}); setErrorMsg(e.message || 'No fue posible consultar la disponibilidad.'); }
    finally { setLoadingDisp(false); }
  }, [periodo, dia, bloques]);

  useEffect(() => { if (selectedGrupoId) loadDisponibilidad(); }, [selectedGrupoId, loadDisponibilidad]);

  // ─── Derivados ───
  const selectedDocente = docentes.find((d) => d.id_docente === docenteId);
  const filteredDocentes = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    return term ? docentes.filter((d) => fullName(d).toLowerCase().includes(term)) : [];
  }, [docentes, searchTerm]);

  // Materias del docente según el distributivo (Tab 1)
  const materiasDocente = useMemo(() => asignaciones.filter((a) => a.id_docente === docenteId), [asignaciones, docenteId]);
  const selectedAsig = materiasDocente.find((a) => a.grupo.id_grupo === selectedGrupoId);
  const grupo = selectedAsig?.grupo;
  const puedePlanificar = canManageGroup(grupo);
  const tiposSesion = useMemo(() => (grupo ? cargaPorMateria[grupo.id_materia] || [] : []), [grupo, cargaPorMateria]);
  const tipoClase = tiposSesion.find((t) => String(t.id_tipo_clase) === String(tipoClaseId));

  // Franjas de 30 min planificadas por grupo y tipo de sesión (2 franjas = 1 hora)
  const planificadas = useMemo(() => {
    const m = {};
    horarios.forEach((h) => { const k = `${h.id_grupo}-${h.id_tipo_clase}`; m[k] = (m[k] || 0) + 1; });
    return m;
  }, [horarios]);
  const horasPlan = (idGrupo, idTipo) => (planificadas[`${idGrupo}-${idTipo}`] || 0) / 2;
  const estadoSesion = (g, tipo) => {
    if (!tipo?.id_tipo_clase) return { label: 'Sin carga', cls: 'bg-slate-100 text-slate-500' };
    if (loadingHorarios) return { label: 'Cargando...', cls: 'bg-slate-100 text-slate-500' };
    const plan = horasPlan(g.id_grupo, tipo.id_tipo_clase);
    const req = Number(tipo.horas_semana);
    if (plan > req) return { label: 'Excedida', cls: 'bg-red-100 text-red-700' };
    if (plan >= req) return { label: 'Completa', cls: 'bg-emerald-100 text-emerald-700' };
    return { label: 'Incompleta', cls: 'bg-amber-100 text-amber-700' };
  };
  const requeridas = tipoClase?.horas_semana || 0;
  const planTipo = tipoClase ? horasPlan(grupo?.id_grupo, tipoClase.id_tipo_clase) : 0;
  const pendientes = Math.max(0, requeridas - planTipo);
  const pendientesSlots = Math.round(pendientes * 2);

  const aulasOrdenadas = useMemo(() => {
    const name = (tipoClase?.nombre_tipo || '').toLowerCase();
    const lab = name.includes('lab');
    const pract = name.includes('pract') || name.includes('práct');
    const score = (a) => {
      const t = (a.tipo_aula || '').toLowerCase();
      const special = t.includes('lab') || t.includes('comput') || t.includes('taller');
      return (lab || pract) ? (special ? 0 : 1) : (special ? 1 : 0);
    };
    return [...aulas].sort((l, r) => score(l) - score(r));
  }, [aulas, tipoClase]);

  const docenteBusy = useMemo(() => {
    const set = new Set();
    horarios.forEach((h) => set.add(`${normalizeDay(h.nombre_dia || h.dia)}-${h.hora_inicio.substring(0, 5)}-${h.hora_fin.substring(0, 5)}`));
    return set;
  }, [horarios]);
  const scheduleMap = useMemo(() => {
    const map = {};
    horarios.forEach((h) => {
      const key = `${normalizeDay(h.nombre_dia || h.dia)}-${h.hora_inicio.substring(0, 5)}-${h.hora_fin.substring(0, 5)}`;
      (map[key] ||= []).push(h);
    });
    return map;
  }, [horarios]);

  const resetSeleccion = () => setSelectedSlots([]);

  const handleSelectDocente = (d) => {
    setDocenteId(d.id_docente); setSelectedGrupoId(null); setTipoClaseId(''); resetSeleccion();
    setSearchTerm(''); setErrorMsg(''); setSuccessMsg('');
  };

  const handleSelectMateria = (asig, tipo) => {
    if (!tipo?.id_tipo_clase || saving || deleting) return;
    setSelectedGrupoId(asig.grupo.id_grupo);
    setTipoClaseId(String(tipo.id_tipo_clase));
    resetSeleccion(); setErrorMsg(''); setSuccessMsg('');
  };

  const handleCellClick = (aula, bloque) => {
    if (!puedePlanificar || saving || deleting || loadingDisp || loadingHorarios || disponibilidadError) return;
    setErrorMsg(''); setSuccessMsg('');
    const selected = selectedSlots.some((slot) => slot.id_aula === aula.id_aula && slot.id_bloque === bloque.id_bloque);
    if (selected) {
      setSelectedSlots((actuales) => actuales.filter((slot) => !(slot.id_aula === aula.id_aula && slot.id_bloque === bloque.id_bloque)));
      return;
    }
    if (ocupadas[bloque.id_bloque]?.has(aula.id_aula) || docenteBusy.has(`${normalizeDay(selectedDay)}-${slotKey(bloque)}`)) return;
    // Una sola aula por docente y franja: cambiarla no selecciona otras horas.
    const otros = selectedSlots.filter((slot) => slot.id_bloque !== bloque.id_bloque);
    if (otros.length + 1 > pendientesSlots) {
      setErrorMsg(`Solo quedan ${pendientes} h por planificar para este tipo de sesión (${planTipo}/${requeridas} h).`);
      return;
    }
    setSelectedSlots([...otros, { id_aula: aula.id_aula, id_bloque: bloque.id_bloque }]);
  };

  const handleRemoveHorario = async (clase) => {
    if (!canManageGroup(clase) || saving || deleting) return;
    if (!window.confirm('¿Estás segura de eliminar este horario? Se quitarán todos los bloques de esta tarjeta para el grupo.')) return;
    setDeleting(true);
    setErrorMsg(''); setSuccessMsg('');

    try {
      await apiService.eliminarHorariosLote(clase.ids);
      setHorarios(actuales => actuales.filter(h => !clase.ids.includes(h.id_horario)));
      resetSeleccion();
      setSuccessMsg('Horario eliminado correctamente.');
    } catch (err) {
      setErrorMsg(`No se pudo eliminar el horario: ${err.message}`);
    } finally {
      await Promise.all([loadHorariosDocente(docenteId), loadDisponibilidad()]);
      setDeleting(false);
    }
  };

  const handleConfirm = async () => {
    if (!puedePlanificar || disponibilidadError) return;
    setErrorMsg(''); setSuccessMsg('');
    if (!docenteId || !grupo || !tipoClase || !dia || !selectedSlots.length) {
      setErrorMsg('Completa docente, materia, tipo de sesión, día, aula y la hora de inicio.');
      return;
    }
    setSaving(true);

    try {
      await apiService.crearHorariosLote(selectedSlots.map(({ id_aula, id_bloque }) => ({
          id_docente: docenteId,
          id_materia: grupo.id_materia,
          id_grupo: grupo.id_grupo,
          id_aula,
          id_dia: dia.id_dia,
          id_bloque,
          id_tipo_clase: tipoClase.id_tipo_clase,
      })));
      await Promise.all([loadHorariosDocente(docenteId), loadDisponibilidad()]);
      resetSeleccion();
      setSuccessMsg('Asignación guardada correctamente y horario del docente actualizado.');
    } catch (err) {
      const data = err.response?.data || {};
      const detalle = data.error || err.message;
      if (err.status === 409) {
        const titulo = data.conflictCode === 'HORAS_EXCEDIDAS' ? 'Horas excedidas' : data.conflictCode === 'CHOQUE_DOCENTE' ? 'Choque de horario del docente' : data.conflictCode === 'CHOQUE_AULA' ? 'Choque de aula' : 'Conflicto de horario';
        setErrorMsg(`${titulo}: ${detalle}`);
      } else if (err.status === 400) setErrorMsg(`El backend rechazó los datos: ${detalle}`);
      else setErrorMsg(`No se pudo guardar la asignación: ${detalle || 'Error de red'}`);

      loadDisponibilidad();
    } finally { setSaving(false); }
  };

  const showPlanner = Boolean(grupo);
  const slots = useMemo(() => {
    const seen = new Set();
    return bloques.filter((b) => { const k = slotKey(b); if (seen.has(k)) return false; seen.add(k); return true; });
  }, [bloques]);

  return (
    <section className="assignment-planner space-y-5 text-slate-800">
      {!canManage && <p className="academic-notice">Modo consulta: puedes explorar horarios y motivos de ocupación. La planificación está reservada a Administrador y Director.</p>}
      {errorMsg && <div className="rounded-xl border border-red-200 bg-red-100 p-3 text-sm text-red-700" role="alert">{errorMsg}</div>}
      {successMsg && <div className="rounded-xl border border-emerald-200 bg-emerald-100 p-3 text-sm text-emerald-700" role="status">{successMsg}</div>}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        {/* Docente + materias del distributivo */}
        <div className={`${docenteId ? 'xl:col-span-6' : 'xl:col-span-12 max-w-3xl'} bg-white rounded-3xl border border-slate-200/80 p-6`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-slate-900">Búsqueda de Docente</h2>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-600 border border-blue-100/70">{docentes.length} Registrados</span>
          </div>
          <div className="relative mb-4">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={19} />
            <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Escribe el nombre del docente..." className="w-full bg-slate-50 border border-slate-200/80 rounded-2xl pl-10 pr-10 py-2.5 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
            {searchTerm && <button type="button" onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"><X size={17} /></button>}
          </div>
          {searchTerm && (filteredDocentes.length > 0
            ? <div className="mb-4 space-y-1 rounded-2xl border border-slate-200 bg-white p-2 shadow-lg max-h-48 overflow-y-auto">
              {filteredDocentes.map((d) => (
                <button type="button" key={d.id_docente} onClick={() => handleSelectDocente(d)} className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-xs hover:bg-blue-50">
                  <b className="text-slate-800">{fullName(d)}</b><small className="text-slate-400">{d.nombre_contrato || 'Docente'}</small>
                </button>
              ))}
            </div>
            : <div className="mb-4 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center text-sm text-slate-500">No se encontraron docentes con "{searchTerm}"</div>)}

          {selectedDocente && (
            <>
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 mb-4">
                <p className="text-xs font-bold text-slate-800">{fullName(selectedDocente)}</p>
                <p className="text-[11px] text-slate-400">{selectedDocente.nombre_contrato || 'Docente'}</p>
              </div>
              <p className="text-xs font-semibold text-slate-500 mb-2">Materias asignadas (distributivo)</p>
              {materiasDocente.length === 0
                ? <div className="py-6 text-center text-xs text-slate-400">
                  <p>Este docente no tiene materias asignadas.</p>
                  {canManage && <button type="button" onClick={() => onAsignarMaterias?.(selectedDocente.id_docente)} className="mt-3 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700">+ Asignar materias</button>}
                </div>
                : <table className="w-full text-left text-xs">
                  <thead><tr className="text-slate-400 border-b border-slate-100"><th className="py-2 px-2">Materia</th><th className="py-2 px-2">Grupo</th><th className="py-2 px-2">Sesión</th><th className="py-2 px-2">Horas</th><th className="py-2 px-2">Estado</th><th className="py-2 px-2 text-right">Acción</th></tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {materiasDocente.flatMap((a) => {
                      const carga = cargaPorMateria[a.grupo.id_materia] || [];
                      const tipos = carga.length ? carga : [{ id_tipo_clase: null, nombre_tipo: 'Sin carga' }];
                      return tipos.map((tipo) => {
                        const active = a.grupo.id_grupo === selectedGrupoId && String(tipo.id_tipo_clase) === String(tipoClaseId);
                        const estado = estadoSesion(a.grupo, tipo);
                        return (
                          <tr key={`${a.id_asig_doc}-${tipo.id_tipo_clase ?? 'sin-carga'}`} onClick={() => handleSelectMateria(a, tipo)} className={`${tipo.id_tipo_clase ? 'cursor-pointer' : ''} ${active ? 'bg-blue-50/60' : 'hover:bg-slate-50'}`}>
                            <td className={`py-3 px-2 font-semibold ${active ? 'text-blue-600' : 'text-slate-800'}`}>{a.grupo.sigla_materia} · {a.grupo.nombre_materia}</td>
                            <td className="py-3 px-2">{a.grupo.nombre_grupo}</td>
                            <td className="py-3 px-2 font-semibold whitespace-nowrap">{tipo.nombre_tipo}</td>
                            <td className="py-3 px-2 text-slate-500 whitespace-nowrap">{!tipo.id_tipo_clase ? 'N/D' : loadingHorarios ? '...' : `${horasPlan(a.grupo.id_grupo, tipo.id_tipo_clase).toFixed(1)} / ${tipo.horas_semana} h`}</td>
                            <td className="py-3 px-2"><span className={`rounded-full px-2 py-1 text-[10px] font-semibold whitespace-nowrap ${estado.cls}`}>{estado.label}</span></td>
                            <td className="py-3 px-2 text-right"><button type="button" aria-label={`${canManageGroup(a.grupo) ? 'Planificar' : 'Consultar'} ${tipo.nombre_tipo} de ${a.grupo.sigla_materia}, grupo ${a.grupo.nombre_grupo}`} aria-pressed={active} disabled={!tipo.id_tipo_clase || loadingHorarios || saving || deleting} onClick={(event) => { event.stopPropagation(); handleSelectMateria(a, tipo); }} className={`rounded-lg px-2.5 py-1.5 text-[11px] font-semibold disabled:opacity-50 disabled:cursor-not-allowed ${active ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-600'}`}>{active ? 'Seleccionada' : canManageGroup(a.grupo) ? 'Planificar' : 'Consultar'}</button></td>
                          </tr>
                        );
                      });
                    })}
                  </tbody>
                </table>}
            </>
          )}
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-1.5 text-xs text-slate-400">
            <Info size={15} className="text-blue-500" />{docenteId ? 'Selecciona una materia para elegir aula, día y hora de inicio' : 'Busca y selecciona un docente para comenzar'}
          </div>
        </div>

        {/* Horario del docente */}
        {docenteId && (
          <div className="xl:col-span-6 bg-white rounded-3xl border border-slate-200/80 p-6">
            <h2 className="text-base font-bold text-slate-900 mb-4">Horario Global del Docente</h2>
            {loadingHorarios
              ? <div className="flex min-h-[200px] items-center justify-center text-sm text-slate-400"><Loader2 className="mr-2 animate-spin" size={18} />Cargando horario...</div>
              : horarios.length === 0
                ? <div className="flex min-h-[200px] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-8 text-center text-sm text-slate-400">El docente aún no tiene horarios asignados.</div>
                : <GridSemanal entries={horarios} dias={dias.map((d) => d.nombre_dia)} onRemove={canManage ? handleRemoveHorario : undefined} canRemove={canManageGroup} removing={deleting || saving} />}
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-1.5 text-xs text-slate-400"><CheckCircle2 size={15} className="text-emerald-500" />{horarios.length / 2} h semanales asignadas</div>
          </div>
        )}
      </div>

      <OcupacionDetalle detalle={inspeccion} onClose={() => setInspeccion(null)} />

      {/* Planificador de aula/día/bloques */}
      {showPlanner && (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 space-y-5">
          <div className="flex flex-wrap items-center gap-4">
            <label className="text-xs font-semibold text-slate-600">Tipo de sesión
              <select value={tipoClaseId} onChange={(e) => { setTipoClaseId(e.target.value); resetSeleccion(); }} className="ml-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs">
                <option value="">Seleccionar tipo...</option>
                {tiposSesion.map((t) => <option key={t.id_tipo_clase} value={t.id_tipo_clase}>{t.nombre_tipo} · {t.horas_semana} h/sem</option>)}
              </select>
            </label>
            <span className="text-xs text-slate-500">{puedePlanificar ? 'Cada celda equivale a 30 min. Haz clic para seleccionar o desmarcar.' : 'Pasa el cursor o haz clic en una celda para consultar su ocupación.'}</span>
            <span className="text-xs text-slate-500">Grupo <b>{grupo.nombre_grupo}</b> · {grupo.nombre_carrera}</span>
          </div>

          <div className="flex flex-wrap items-center gap-5 pb-3 border-b border-slate-100 text-xs sm:text-sm font-medium text-slate-600">
            {dias.map((d) => (
              <label key={d.id_dia} className={`flex items-center gap-2 cursor-pointer ${selectedDay === d.nombre_dia ? 'text-blue-600 font-bold' : ''}`}>
                <input type="radio" name="day-selection" checked={selectedDay === d.nombre_dia} onChange={() => { setSelectedDay(d.nombre_dia); resetSeleccion(); }} className="accent-blue-600" />{d.nombre_dia}
              </label>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <MapPin size={20} className="text-blue-600" />
            <select value={pabellonId} onChange={(e) => { setPabellonId(e.target.value); resetSeleccion(); }} className="text-sm font-bold text-slate-800 bg-transparent outline-none cursor-pointer">
              <option value="">Seleccionar pabellón...</option>
              {pabellones.map((p) => <option key={p.id_pabellon} value={p.id_pabellon}>{p.nombre_pabellon}</option>)}
            </select>
            {loadingDisp && <Loader2 size={16} className="animate-spin text-slate-400" />}
          </div>

          {!pabellonId || !tipoClase
            ? <div className="py-10 text-center text-sm text-slate-400">Selecciona el tipo de sesión y un pabellón para ver la disponibilidad de aulas</div>
            : aulasOrdenadas.length === 0
              ? <div className="py-10 text-center text-sm text-slate-400">No hay aulas en este pabellón</div>
              : <div className="planner-matrix-scroll" role="region" aria-label="Disponibilidad de aulas por bloque horario" tabIndex={0}>
                <table className="planner-matrix" data-testid="planner-matrix" style={{ width: 104 + aulasOrdenadas.length * 140, minWidth: '100%' }}>
                  <colgroup><col style={{ width: 104 }} />{aulasOrdenadas.map((aula) => <col key={aula.id_aula} style={{ width: 140 }} />)}</colgroup>
                  <thead><tr><th scope="col">Hora</th>{aulasOrdenadas.map((aula) => <th scope="col" key={aula.id_aula}>{aula.nombre_codigo}</th>)}</tr></thead>
                  <tbody>{slots.map((b) => {
                    const docenteOcupado = docenteBusy.has(`${normalizeDay(selectedDay)}-${slotKey(b)}`);
                    return (
                      <tr key={b.id_bloque} data-bloque={b.id_bloque}>
                        <th scope="row">{slotLabel(b)}</th>
                        {aulasOrdenadas.map((aula) => {
                          const aulaOcupada = ocupadas[b.id_bloque]?.has(aula.id_aula);
                          const blocked = aulaOcupada || docenteOcupado;
                          const selected = selectedSlots.some((slot) => slot.id_aula === aula.id_aula && slot.id_bloque === b.id_bloque);
                          const estado = aulaOcupada ? 'Ocupada' : docenteOcupado ? 'Docente ocupado' : selected ? 'Elegida' : 'Libre';
                          const detalle = {
                            aula: aula.nombre_codigo, franja: `${selectedDay} ${slotLabel(b)}`,
                            aulaClases: detalleAulas[b.id_bloque]?.[aula.id_aula] || [],
                            docenteClases: (scheduleMap[`${normalizeDay(selectedDay)}-${slotKey(b)}`] || []).map((h) => ({ ...h, nombre_docente: fullName(selectedDocente || {}) })),
                          };
                          const tooltip = [aulaOcupada ? 'Aula ocupada' : '', ...detalle.aulaClases.map(textoClase), docenteOcupado ? 'Docente ocupado' : '', ...detalle.docenteClases.map(textoClase)].filter(Boolean).join('\n') || 'Aula libre en este bloque';
                          return (
                            <td key={aula.id_aula} onMouseEnter={() => { if (blocked) setInspeccion(detalle); }}>
                              <button type="button" data-aula={aula.id_aula} title={tooltip} aria-label={`${aula.nombre_codigo}, ${slotLabel(b)}, ${estado}`} aria-pressed={selected} data-unavailable={blocked || !puedePlanificar} disabled={saving || deleting || loadingDisp || loadingHorarios || disponibilidadError} onFocus={() => { if (blocked) setInspeccion(detalle); }} onClick={() => blocked || !puedePlanificar ? setInspeccion(detalle) : handleCellClick(aula, b)}
                                className={`w-full rounded-xl py-3 px-2 text-center border transition-colors ${blocked ? 'bg-rose-50 border-rose-200 cursor-help' : selected ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-100' : 'bg-emerald-50/80 border-emerald-100 hover:bg-emerald-100/70'}`}>
                                <p className="text-xs font-bold text-slate-800">{aula.nombre_codigo}</p>
                                <p className={`text-[11px] font-semibold ${blocked ? 'text-rose-600' : selected ? 'text-blue-600' : 'text-emerald-600'}`}>{estado}</p>
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}</tbody>
                </table>
              </div>}

          <div className="pt-4 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4">
            <span className="text-xs text-slate-600">{puedePlanificar ? 'Asignando' : 'Consultando'} <strong>{grupo.nombre_materia}</strong> · {selectedDay}{puedePlanificar && <> · <strong className="text-blue-600">{selectedSlots.length / 2} h</strong></>}</span>
            {puedePlanificar && <div className="flex gap-2.5">
              <button type="button" onClick={resetSeleccion} className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100">Limpiar</button>
              <button type="button" onClick={handleConfirm} disabled={!tipoClase || !selectedSlots.length || saving || deleting || loadingDisp || disponibilidadError} className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed">
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={17} />}Confirmar Asignación
              </button>
            </div>}
          </div>
        </div>
      )}
    </section>
  );
}
