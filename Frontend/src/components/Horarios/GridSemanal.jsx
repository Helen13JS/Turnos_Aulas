import React from 'react';
import { X } from 'lucide-react';
import { agruparSlots, minutosDe, normalizarTexto } from '../../utils/horarioSlots';

const INICIO = 7 * 60;
const FIN = 21 * 60;
const horas = Array.from({ length: (FIN - INICIO) / 60 }, (_, i) => INICIO + i * 60);
const fmt = (min) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
const COLORES = ['bg-blue-100 text-blue-800 border-blue-200', 'bg-emerald-100 text-emerald-800 border-emerald-200', 'bg-amber-100 text-amber-800 border-amber-200', 'bg-violet-100 text-violet-800 border-violet-200', 'bg-rose-100 text-rose-800 border-rose-200', 'bg-cyan-100 text-cyan-800 border-cyan-200'];
const colorDe = (txt) => COLORES[[...String(txt)].reduce((s, c) => s + c.charCodeAt(0), 0) % COLORES.length];

// Reparte en carriles las clases que se solapan dentro de un mismo día.
function conCarriles(bloques) {
  const orden = [...bloques].sort((a, b) => a.inicio - b.inicio);
  const carriles = [];
  orden.forEach((b) => {
    let i = carriles.findIndex((fin) => fin <= b.inicio);
    if (i < 0) { i = carriles.length; carriles.push(0); }
    carriles[i] = b.fin;
    b.carril = i;
  });
  orden.forEach((b) => { b.totalCarriles = Math.max(...orden.filter((o) => o.inicio < b.fin && o.fin > b.inicio).map((o) => o.carril)) + 1; });
  return orden;
}

/**
 * Cuadrícula semanal con franjas de 30 min. Cada tarjeta muestra sigla y tipo de sesión;
 * el detalle (materia, grupo, aula, docente, horas) va en el tooltip.
 */
export default function GridSemanal({ entries, dias, mostrarGrupo = false, detallado = false, emptyMessage = '', onRemove, canRemove = () => true, removing = false }) {
  const ALTO_HORA = detallado ? 84 : 44;
  const px = (min) => ((min - INICIO) / 60) * ALTO_HORA;
  const bloques = React.useMemo(() => agruparSlots(entries), [entries]);
  const columnas = dias.map((d) => ({ nombre: d, clave: normalizarTexto(d) }));
  const vacio = bloques.length === 0;

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[560px]">
        <div className={detallado ? 'grid text-center text-sm font-bold text-white rounded-t-2xl overflow-hidden' : 'grid text-center text-xs font-semibold text-slate-500 mb-1'} style={{ gridTemplateColumns: `${detallado ? 110 : 56}px repeat(${columnas.length}, minmax(0, 1fr))`, ...(detallado ? { backgroundColor: '#1e3a8a' } : {}) }}>
          <div className={detallado ? 'py-3' : ''}>{detallado ? 'Hora' : ''}</div>{columnas.map((c) => <div key={c.clave} className={detallado ? 'py-3 border-l border-white/20' : ''}>{detallado || c.nombre.length <= 4 ? c.nombre : c.nombre.substring(0, 3)}</div>)}
        </div>
        <div className={`grid border border-slate-200/80 overflow-hidden bg-white ${detallado ? 'rounded-b-2xl' : 'rounded-2xl'}`} style={{ gridTemplateColumns: `${detallado ? 110 : 56}px repeat(${columnas.length}, minmax(0, 1fr))` }}>
          <div className={`relative border-r border-slate-200/80 ${detallado ? 'bg-slate-50' : ''}`} style={{ height: px(FIN) }}>
            {detallado
              ? horas.map((h) => <span key={h} className="absolute inset-x-0 flex items-center justify-center text-xs font-bold text-slate-500" style={{ top: px(h), height: ALTO_HORA }}>{fmt(h)} - {fmt(h + 60)}</span>)
              : horas.map((h) => <span key={h} className="absolute right-1.5 -translate-y-1/2 text-[10px] text-slate-400" style={{ top: Math.max(px(h), 7) }}>{fmt(h)}</span>)}
          </div>
          {columnas.map((c) => {
            const delDia = conCarriles(bloques.filter((b) => b.dia === c.clave && minutosDe(b.hora_inicio) >= INICIO));
            return (
              <div key={c.clave} className="relative border-r border-slate-100 last:border-r-0" style={{ height: px(FIN), backgroundImage: `repeating-linear-gradient(to bottom, #e2e8f0 0, #e2e8f0 1px, transparent 1px, transparent ${ALTO_HORA}px)` }}>
                {delDia.map((b) => {
                  const ancho = 100 / b.totalCarriles;
                  const sigla = b.sigla_materia || b.nombre_materia || 'N/D';
                  const removable = onRemove && canRemove(b);
                  const tipoNormalizado = normalizarTexto(b.tipo_clase);
                  const sesion = tipoNormalizado.includes('lab') ? 'Lab' : tipoNormalizado.includes('teor') ? 'Teoría' : b.tipo_clase || 'Sin tipo';
                  const detalle = [b.nombre_materia, `Grupo ${b.nombre_grupo || 'N/D'}`, b.tipo_clase, `Aula ${b.aula || 'N/D'}`, b.nombre_docente, `${b.hora_inicio} - ${b.hora_fin} (${b.horas} h)`].filter(Boolean).join('\n');
                  if (detallado) {
                    return (
                      <div key={`${b.ids[0]}`} title={detalle} className="absolute overflow-hidden rounded-xl border-l-4 border-blue-600 bg-blue-50 px-2 py-1.5 shadow-sm flex flex-col justify-between" style={{ top: px(b.inicio) + 3, height: px(b.fin) - px(b.inicio) - 6, left: `calc(${b.carril * ancho}% + 3px)`, width: `calc(${ancho}% - 6px)` }}>
                        <div className="leading-tight">
                          <p className="text-xs font-bold text-blue-900">{b.nombre_materia || sigla}</p>
                          <p className="text-[11px] font-semibold text-blue-700">{b.tipo_clase || sesion}</p>
                          <p className="text-[11px] text-slate-600">{b.nombre_docente}</p>
                          <p className="text-[11px] text-slate-600">{b.aula} · {b.nombre_grupo}</p>
                        </div>
                        <p className="text-[11px] font-bold text-blue-600">{b.hora_inicio.substring(0, 5)} - {b.hora_fin.substring(0, 5)}</p>
                      </div>
                    );
                  }
                  return (
                    <div key={`${b.ids[0]}`} title={detalle} className={`absolute overflow-hidden rounded-lg border px-1 py-0.5 text-center leading-tight shadow-sm ${colorDe(sigla)}`} style={{ top: px(b.inicio) + 1, height: px(b.fin) - px(b.inicio) - 2, left: `calc(${b.carril * ancho}% + 2px)`, width: `calc(${ancho}% - 4px)` }}>
                      <div className={`${b.horas < 1 ? 'flex items-center gap-1' : ''} ${removable ? 'pr-4' : ''}`}>
                        <p className="text-[11px] font-bold truncate min-w-0">{sigla}</p>
                        <span className="block text-[9px] font-semibold whitespace-nowrap shrink-0">{sesion}</span>
                      </div>
                      {removable && <button type="button" aria-label={`Quitar ${sigla}, ${c.nombre}, ${b.hora_inicio} - ${b.hora_fin}`} title="Quitar horario" disabled={removing} onClick={(event) => { event.stopPropagation(); onRemove(b); }} className="absolute flex items-center justify-center rounded bg-white/90 text-red-600 hover:bg-red-100 disabled:opacity-50 disabled:cursor-wait" style={{ top: 1, right: 1, width: 14, height: 14 }}><X size={12} /></button>}
                      {mostrarGrupo && <p className="text-[9px] opacity-80 truncate">{b.nombre_grupo} · {b.aula}</p>}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
        {vacio && emptyMessage && <p className="mt-3 text-center text-xs text-slate-400">{emptyMessage}</p>}
      </div>
    </div>
  );
}
