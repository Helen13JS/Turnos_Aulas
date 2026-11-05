import React, { useState } from 'react';
import { configuracionService } from '../../services/configuracion.service';

export default function DireccionesPanel({ direcciones, carreras, onSaved }) {
  const [codigo, setCodigo] = useState(''), [nombre, setNombre] = useState('');
  const [direccion, setDireccion] = useState(''), [carrera, setCarrera] = useState('');
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  async function save(event, create) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      if (create) await configuracionService.createDireccion({ codigo, nombre_direccion: nombre });
      else {
        if (!window.confirm('¿Cambiar la Dirección de esta carrera? Los permisos de sus directores se actualizarán inmediatamente en el servidor.')) return;
        await configuracionService.assignCarrera(direccion, carrera);
      }
      await onSaved();
    } catch (err) { setError(err.response?.data?.error || err.message); }
    finally { setBusy(false); }
  }
  return <section className="config-card" style={{ marginBottom: 20 }}><h2>Direcciones y carreras</h2><p>Un Director gestiona todas las carreras de su Dirección. Los cruces de aulas se validan entre todas las direcciones.</p>
    <div className="config-table-wrap"><table className="config-table"><thead><tr><th>Dirección</th><th>Carreras incluidas</th></tr></thead><tbody>{direcciones.map(d => <tr key={d.id_direccion}><td><b>{d.codigo}</b> · {d.nombre_direccion}</td><td>{d.carreras.map(c => `${c.nombre_carrera} (ID ${c.id_carrera})`).join(', ') || 'Sin carreras vinculadas'}</td></tr>)}</tbody></table></div>
    <form className="config-table-tools" onSubmit={e => save(e, true)}><input aria-label="Código de Dirección" placeholder="Código (ej. 6X)" required maxLength={30} value={codigo} onChange={e => setCodigo(e.target.value)} /><input aria-label="Nombre de Dirección" placeholder="Nombre de Dirección" required maxLength={150} value={nombre} onChange={e => setNombre(e.target.value)} /><button className="config-primary-button" disabled={busy}>Crear Dirección</button></form>
    <form className="config-table-tools" onSubmit={e => save(e, false)}><select aria-label="Carrera a vincular" required value={carrera} onChange={e => setCarrera(e.target.value)}><option value="">Seleccionar carrera</option>{carreras.map(c => <option key={c.id_carrera} value={c.id_carrera}>{c.nombre_carrera} · ID {c.id_carrera}</option>)}</select><select aria-label="Dirección de destino" required value={direccion} onChange={e => setDireccion(e.target.value)}><option value="">Seleccionar Dirección</option>{direcciones.map(d => <option key={d.id_direccion} value={d.id_direccion}>{d.codigo} · {d.nombre_direccion}</option>)}</select><button className="config-secondary-button" disabled={busy}>Vincular carrera</button></form>
    {error && <p role="alert" className="academic-error">{error}</p>}
  </section>;
}
