import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Loader2, Search } from 'lucide-react';
import { apiService } from '../../services/api.service';
import ModuleSidebar from '../Layout/ModuleSidebar';
import '../Academico/Academico.css';
import GridSemanal from './GridSemanal';
import { normalizarTexto } from '../../utils/horarioSlots';
import './Horarios.css';

const days = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

const normalizar = normalizarTexto;

function ScheduleGrid({ entries, emptyMessage }) {
  return <GridSemanal entries={entries} dias={days} detallado emptyMessage={emptyMessage} />;
}

export default function Horarios({ portal = false }) {
  const [periodo, setPeriodo] = useState(null);
  const [groups, setGroups] = useState([]);
  const [groupSchedules, setGroupSchedules] = useState([]);
  const [docentes, setDocentes] = useState([]);
  const [selectedSemester, setSelectedSemester] = useState('Todos');
  const [selectedCareer, setSelectedCareer] = useState('Todas');
  const [selectedDocente, setSelectedDocente] = useState('');
  const [view, setView] = useState('carrera');
  const [loading, setLoading] = useState(true);
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    Promise.all([apiService.getPeriodoActivo(), apiService.getDocentes()]).then(async ([periodoResponse, docentesResponse]) => {
      if (!mounted) return;
      const active = periodoResponse.periodo || null;
      setPeriodo(active);
      setDocentes(docentesResponse.docentes || []);
      if (active) {
        const groupResponse = await apiService.getGruposPeriodo(active.id_periodo);
        if (mounted) setGroups(groupResponse.grupos || []);
      }
    }).catch((requestError) => { if (mounted) setError(requestError.message || 'No se pudo cargar el horario institucional.'); }).finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!groups.length) { setGroupSchedules([]); return; }
    let mounted = true;
    setLoadingSchedule(true);
    Promise.all(groups.map(async (group) => {
      try {
        const [scheduleResponse, teachersResponse] = await Promise.all([apiService.getHorarioGrupo(group.id_grupo), apiService.getDocentesGrupo(group.id_grupo)]);
        return (scheduleResponse.horarios || []).map((schedule) => ({ ...schedule, id_grupo: group.id_grupo, nombre_materia: group.nombre_materia, sigla_materia: group.sigla_materia, nombre_grupo: group.nombre_grupo, nombre_docente: teachersResponse.docentes?.map((teacher) => `${teacher.nombres} ${teacher.apellidos}`).join(', ') || 'Docente no asignado', semestre: group.semestre, nombre_carrera: group.nombre_carrera }));
      } catch { return []; }
    })).then((schedules) => { if (mounted) setGroupSchedules(schedules.flat()); }).finally(() => { if (mounted) setLoadingSchedule(false); });
    return () => { mounted = false; };
  }, [groups]);

  const careers = useMemo(() => ['Todas', ...new Set(groups.map((group) => group.nombre_carrera).filter(Boolean))], [groups]);
  const semesters = useMemo(() => ['Todos', ...new Set(groups.map((group) => group.semestre).filter(Boolean))], [groups]);
  const filteredEntries = useMemo(() => groupSchedules.filter((entry) => (selectedCareer === 'Todas' || entry.nombre_carrera === selectedCareer) && (selectedSemester === 'Todos' || normalizar(entry.semestre) === normalizar(selectedSemester))), [groupSchedules, selectedCareer, selectedSemester]);
  const teacherEntries = useMemo(() => { if (!selectedDocente) return []; return groupSchedules.filter((entry) => entry.nombre_docente?.includes(selectedDocente)); }, [groupSchedules, selectedDocente]);

  if (loading) return <div className="academic-loading"><CalendarDays size={30} className="spin" /><span>Cargando horarios institucionales...</span></div>;
  return <div className="academic-page schedules-page"><div className="academic-shell"><ModuleSidebar activeModule="horarios" periodo={periodo} /><main className="academic-main"><header className="academic-header"><div><div className="academic-kicker"><span />Módulo de Horarios · Planificación Académica</div><h1>{portal ? 'Portal estudiantil' : 'Horarios Institucionales'}</h1><p>Consulta la distribución semanal por carrera, semestre o docente.</p></div><div className="academic-user"><b><CalendarDays size={17} /></b><div><small>Periodo activo</small><strong>{periodo?.gestion || 'No disponible'}</strong></div><i /></div></header><div className="schedule-tabs"><button className={view === 'carrera' ? 'active' : ''} onClick={() => setView('carrera')}>Carrera y semestre</button><button className={view === 'docente' ? 'active' : ''} onClick={() => setView('docente')}>Vista por docente</button></div>{error && <div className="academic-error">{error}</div>}{view === 'carrera' ? <section className="schedule-panel"><div className="schedule-toolbar"><label>Carrera<select value={selectedCareer} onChange={(event) => setSelectedCareer(event.target.value)}>{careers.map((career) => <option key={career}>{career}</option>)}</select></label><div className="semester-tabs">{semesters.map((semester) => <button className={selectedSemester === semester ? 'active' : ''} onClick={() => setSelectedSemester(semester)} key={semester}>{semester}</button>)}</div></div>{loadingSchedule ? <div className="schedule-loading"><Loader2 className="spin" /> Cargando bloques...</div> : <ScheduleGrid entries={filteredEntries} emptyMessage="Sin asignación" />}</section> : <section className="schedule-panel"><div className="teacher-picker"><Search size={16} /><select value={selectedDocente} onChange={(event) => setSelectedDocente(event.target.value)}><option value="">Seleccionar docente...</option>{docentes.map((docente) => <option key={docente.id_docente} value={`${docente.nombres} ${docente.apellidos}`}>{docente.nombres} {docente.apellidos}</option>)}</select></div>{selectedDocente ? <ScheduleGrid entries={teacherEntries} emptyMessage="Este docente no tiene horarios asignados" /> : <div className="schedule-empty-state">Selecciona un docente para ver su horario semanal.</div>}</section>}</main></div></div>;
}
