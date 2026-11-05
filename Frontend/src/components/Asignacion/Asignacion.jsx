import React, { useState } from 'react';
import { BookUser, CalendarClock, Loader2 } from 'lucide-react';
import ModuleSidebar from '../Layout/ModuleSidebar';
import TabAsignacionMaterias from './TabAsignacionMaterias';
import TabPlanificacionHorarios from './TabPlanificacionHorarios';
import { useDistributivo } from './useDistributivo';
import '../Academico/Academico.css';
import '../Horarios/Horarios.css';
import './Asignacion.css';

const TABS = [
  { id: 'materias', label: 'Asignación de Materias (Distributivo)', icon: BookUser },
  { id: 'horarios', label: 'Planificación de Horarios y Aulas', icon: CalendarClock },
];

export default function Asignacion() {
  const [activeTab, setActiveTab] = useState('materias');
  const [docentePreseleccionado, setDocentePreseleccionado] = useState('');
  const distributivo = useDistributivo();

  return (
    <div className="academic-page asignacion-page">
      <div className="academic-shell">
        <ModuleSidebar activeModule="asignación" periodo={distributivo.periodo} />
        <main className="academic-main">
          <header className="academic-header">
            <div>
              <div className="academic-kicker"><span />Módulo de Asignación</div>
              <h1>Asignación Académica</h1>
              <p>Paso 1: distributivo docente-materia. Paso 2: planificación de horarios y aulas.</p>
            </div>
          </header>

          <div className="schedule-tabs" role="tablist">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button key={id} role="tab" aria-selected={activeTab === id} className={activeTab === id ? 'active' : ''} onClick={() => setActiveTab(id)}>
                <Icon size={14} /> {label}
              </button>
            ))}
          </div>

          {distributivo.error && <div className="academic-error">{distributivo.error}</div>}
          {distributivo.loading
            ? <div className="schedule-loading"><Loader2 className="spin" /> Cargando distributivo...</div>
            : activeTab === 'materias'
              ? <TabAsignacionMaterias {...distributivo} docenteInicial={docentePreseleccionado} />
              : <TabPlanificacionHorarios {...distributivo} onAsignarMaterias={(idDocente) => { setDocentePreseleccionado(String(idDocente)); setActiveTab('materias'); }} />}
        </main>
      </div>
    </div>
  );
}
