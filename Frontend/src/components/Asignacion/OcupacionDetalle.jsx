import React from 'react';

export const nombreDocentes = (clase) => clase.nombre_docente || clase.docentes?.map((d) => d.nombre_docente).join(', ') || 'Docente no asignado';
export const textoClase = (clase) => clase.tipo_ocupacion === 'reserva'
  ? `Reserva temporal · ${clase.fecha_reserva} · ${clase.motivo || 'Sin motivo registrado'} · Aula ${clase.aula}`
  : `${nombreDocentes(clase)} · ${clase.sigla_materia || ''} ${clase.nombre_materia || ''} · Grupo ${clase.nombre_grupo || 'N/D'} · ${clase.tipo_clase || 'Sin tipo'} · Aula ${clase.aula || 'N/D'}`;

export default function OcupacionDetalle({ detalle, onClose }) {
  if (!detalle) return null;
  return <aside className="ocupacion-detalle" aria-label="Detalle de ocupación">
    <header><strong>{detalle.aula} · {detalle.franja}</strong><button type="button" onClick={onClose} aria-label="Cerrar detalle">×</button></header>
    {[[ 'Aula ocupada', detalle.aulaClases ], [ 'Docente ocupado', detalle.docenteClases ]].map(([titulo, clases]) => clases?.length > 0 && <section key={titulo}>
      <h3>{titulo}</h3>
      {clases.map((clase) => clase.tipo_ocupacion === 'reserva' ? <article key={`reserva-${clase.id_reserva}`}>
        <strong>Reserva temporal · {clase.fecha_reserva}</strong>
        <p>{clase.motivo || 'Sin motivo registrado'}</p><p>Aula: {clase.aula}</p>
      </article> : <article key={clase.id_horario}>
        <strong>{clase.sigla_materia} · {clase.nombre_materia}</strong>
        <p>Docente: {nombreDocentes(clase)}</p>
        <p>Grupo: {clase.nombre_grupo} · {clase.tipo_clase}</p>
        <p>Aula: {clase.aula}</p>
      </article>)}
    </section>)}
    {!detalle.aulaClases?.length && !detalle.docenteClases?.length && <p>Aula libre en este bloque.</p>}
  </aside>;
}
