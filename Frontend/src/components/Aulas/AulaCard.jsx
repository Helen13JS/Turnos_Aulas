import React from 'react';
import { AirVent, Armchair, CalendarDays, ChevronRight, Edit3, Monitor, Wifi, Wrench, Package, Trash2 } from 'lucide-react';

const statusMap = {
  operativa: { label: 'Operativa', className: 'operativa' },
  libre: { label: 'Libre', className: 'operativa' },
  disponible: { label: 'Disponible', className: 'operativa' },
  mantenimiento: { label: 'Mantenimiento', className: 'mantenimiento' },
  inactiva: { label: 'Inactiva', className: 'mantenimiento' },
  inactivo: { label: 'Inactivo', className: 'mantenimiento' },
  ocupada: { label: 'Ocupada', className: 'ocupada' },
};

function equipmentIcon(description = '') {
  const value = description.toLowerCase();
  if (value.includes('proyector') || value.includes('pantalla') || value.includes('monitor')) return Monitor;
  if (value.includes('wifi') || value.includes('internet')) return Wifi;
  if (value.includes('clima') || value.includes('aire')) return AirVent;
  return Armchair;
}

export default function AulaCard({
  aula,
  recursos = [],
  loading,
  onSchedule,
  onEdit,
  onDelete,
  onReport,
  onResources,
  canManage = false
}) {
  const rawStatus = (aula.estado_aula || 'Operativa').toLowerCase();
  const status = statusMap[rawStatus] || {
    label: aula.estado_aula || 'Operativa',
    className: rawStatus.includes('mant') || rawStatus.includes('inact') ? 'mantenimiento' : 'operativa'
  };

  return (
    <article className="aula-card">
      <div>
        <div className="aula-card-heading">
          <div>
            <div className="aula-title">
              <h3>{aula.nombre_codigo}</h3>
              <span className={`aula-status ${status.className}`}><i />{status.label}</span>
            </div>
            <p>{aula.tipo_aula || 'Aula académica'} · Piso {aula.numero_piso ?? 'No registrado'}</p>
          </div>
          <strong className="capacity"><Armchair size={15} />{aula.capacidad_maxima ?? 'No registrada'} plazas</strong>
        </div>

        <div className={`aula-current ${status.className}`}>
          <span>
            <i />
            {status.className === 'mantenimiento'
              ? 'Fuera de servicio / Mantenimiento'
              : status.className === 'ocupada'
                ? 'En curso'
                : 'Disponible para asignación'}
          </span>
          <b>{aula.nombre_pabellon || 'Campus'}</b>
        </div>

        <div className="equipment">
          <small>Equipamiento instalado</small>
          <div>
            {recursos.length === 0 ? (
              <span className="equipment-pill muted">Sin recursos registrados</span>
            ) : (
              recursos.slice(0, 5).map((resource) => {
                const Icon = equipmentIcon(resource.descripcion || resource.tipo_recurso);
                return (
                  <span className="equipment-pill" key={resource.id_rec_aula || resource.id_recurso}>
                    <Icon size={14} />{resource.descripcion || resource.tipo_recurso}
                  </span>
                );
              })
            )}
          </div>
        </div>
      </div>

      <footer className="aula-card-actions">
        <button disabled={Boolean(loading)} onClick={() => onSchedule(aula)}>
          <CalendarDays size={14} />
          {loading === `schedule-${aula.id_aula}` ? 'Consultando...' : 'Ver Horario'}
        </button>
        {canManage && (
          <>
            <button
              className="icon-button"
              title="Gestionar recursos y equipamiento"
              aria-label={`Gestionar recursos de ${aula.nombre_codigo}`}
              onClick={() => onResources(aula)}
            >
              <Package size={15} />
            </button>
            <button
              className="icon-button"
              title="Editar datos del Aula"
              aria-label={`Editar aula ${aula.nombre_codigo}`}
              onClick={() => onEdit(aula)}
            >
              <Edit3 size={15} />
            </button>
            {onDelete && (
              <button
                className="icon-button danger"
                title="Eliminar o inhabilitar aula"
                aria-label={`Eliminar o inhabilitar aula ${aula.nombre_codigo}`}
                onClick={() => onDelete(aula)}
              >
                <Trash2 size={15} />
              </button>
            )}
            <button
              className={`icon-button ${status.className === 'mantenimiento' ? 'warning' : ''}`}
              title={status.className === 'mantenimiento' ? 'Finalizar mantenimiento y reactivar aula' : 'Reportar Falla o poner en mantenimiento'}
              aria-label={status.className === 'mantenimiento' ? `Finalizar mantenimiento del aula ${aula.nombre_codigo}` : `Reportar falla o mantenimiento del aula ${aula.nombre_codigo}`}
              onClick={() => onReport(aula)}
            >
              <Wrench size={15} />
            </button>
          </>
        )}
        <ChevronRight size={15} className="card-arrow" />
      </footer>
    </article>
  );
}
