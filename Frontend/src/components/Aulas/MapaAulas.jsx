import React, { useEffect, useMemo, useState } from 'react';
import ModuleSidebar from '../Layout/ModuleSidebar';
import { apiService } from '../../services/api.service';
import OcupacionDetalle, { textoClase } from '../Asignacion/OcupacionDetalle';
import '../Academico/Academico.css';
import '../Asignacion/Asignacion.css';

export default function MapaAulas() {
  const [dias, setDias] = useState([]), [bloques, setBloques] = useState([]);
  const [dia, setDia] = useState(''), [bloque, setBloque] = useState('');
  const [periodo, setPeriodo] = useState(null), [aulas, setAulas] = useState([]);
  const [detalle, setDetalle] = useState(null), [error, setError] = useState(''), [loading, setLoading] = useState(true);
  useEffect(() => {
    Promise.all([apiService.getDias(), apiService.getBloques(), apiService.getPeriodoActivo()])
      .then(([d, b, p]) => { setDias(d.dias); setBloques(b.bloques); setPeriodo(p.periodo); setDia(String(d.dias[0]?.id_dia || '')); setBloque(String(b.bloques[0]?.id_bloque || '')); })
      .catch((e) => { setError(e.message); setLoading(false); });
  }, []);
  useEffect(() => {
    if (!dia || !bloque || !periodo) return;
    let current = true;
    setLoading(true); setError(''); setDetalle(null);
    let pending = false;
    const refresh = async () => {
      if (pending || document.hidden) return;
      pending = true;
      try { const r = await apiService.getAulasDisponibles({ dia, bloque, periodo: periodo.id_periodo }); if (current) { setAulas(r.aulas); setError(''); } }
      catch (e) { if (current) setError(e.message); }
      finally { pending = false; if (current) setLoading(false); }
    };
    refresh();
    const timer = setInterval(refresh, 15000);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => { current = false; clearInterval(timer); window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', refresh); };
  }, [dia, bloque, periodo]);
  const grupos = useMemo(() => aulas.reduce((map, a) => {
    const name = `${a.nombre_facultad} · ${a.nombre_pabellon} · Piso ${a.numero_piso}`;
    (map[name] ||= []).push(a);
    return map;
  }, {}), [aulas]);
  const time = bloques.find((b) => String(b.id_bloque) === bloque);
  return <div className="academic-page"><div className="academic-shell"><ModuleSidebar activeModule="mapa" periodo={periodo} /><main className="academic-main">
    <header className="academic-header"><div><h1>Mapa esquemático de aulas</h1><p>Consulta de disponibilidad por pabellón y piso · Período {periodo?.gestion}</p></div></header>
    <div className="map-filters"><label>Día<select value={dia} onChange={(e) => setDia(e.target.value)}>{dias.map((d) => <option key={d.id_dia} value={d.id_dia}>{d.nombre_dia}</option>)}</select></label><label>Bloque horario<select value={bloque} onChange={(e) => setBloque(e.target.value)}>{bloques.map((b) => <option key={b.id_bloque} value={b.id_bloque}>{b.hora_inicio.slice(0, 5)}–{b.hora_fin.slice(0, 5)}</option>)}</select></label><span>Verde: libre · Rojo: ocupada · Amarillo: no disponible · Actualiza cada 15 s</span></div>
    {error && <p role="alert" className="academic-error">{error}</p>}
    {loading ? <p>Cargando mapa...</p> : Object.entries(grupos).map(([name, list]) => <section key={name} className="map-floor"><h2>{name}</h2><div className="map-rooms">{list.map((a) => <button key={a.id_aula} className={a.no_disponible ? 'map-room unavailable' : a.ocupada ? 'map-room occupied' : 'map-room'} title={(a.ocupaciones || a.clases).map(textoClase).join('\n') || 'Aula libre'} onClick={() => setDetalle({ aula: a.nombre_codigo, franja: time ? `${time.hora_inicio.slice(0, 5)}–${time.hora_fin.slice(0, 5)}` : '', aulaClases: a.ocupaciones || a.clases, docenteClases: [] })}><strong>{a.nombre_codigo}</strong><span>{a.no_disponible ? a.estado_aula : a.ocupada ? 'Ocupada' : 'Libre'}</span><small>{a.capacidad_maxima} plazas</small></button>)}</div></section>)}
    <OcupacionDetalle detalle={detalle} onClose={() => setDetalle(null)} />
  </main></div></div>;
}
