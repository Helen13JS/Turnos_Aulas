import React from 'react';
import { Building2, CheckCircle2, HardHat, Users } from 'lucide-react';

const cards = [
  { key: 'total', label: 'Total de Aulas', suffix: 'espacios', icon: Building2, tone: 'blue' },
  { key: 'operativas', label: 'Aulas Operativas', suffix: 'listas para uso', icon: CheckCircle2, tone: 'green' },
  { key: 'mantenimiento', label: 'En Mantenimiento', suffix: 'requieren atención', icon: HardHat, tone: 'amber' },
  { key: 'capacidad', label: 'Capacidad Total', suffix: 'plazas disponibles', icon: Users, tone: 'slate' },
];

export default function AulasStatsGrid({ stats }) {
  return <div className="aulas-stats-grid">{cards.map(({ key, label, suffix, icon: Icon, tone }) => <article className="aulas-stat-card" key={key}><div className="aulas-stat-top"><span>{label}</span><i className={`stat-icon ${tone}`}><Icon size={18} /></i></div><strong>{stats[key]} <small>{key === 'capacidad' ? 'plazas' : ''}</small></strong><p className={tone === 'green' ? 'positive' : tone === 'amber' ? 'warning' : ''}><span />{suffix}</p></article>)}</div>;
}
