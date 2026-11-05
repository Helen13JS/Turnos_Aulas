import React, { useEffect, useState } from 'react';
import { AlertCircle, Loader2, X } from 'lucide-react';
import { aulasService } from '../../services/aulas.service';

export default function AulaModal({
  aula = null,
  pabellones = [],
  tiposAula = [],
  estadosAula = [],
  defaultPabellon = '',
  defaultPiso = '',
  onClose,
  onSaved
}) {
  const isEditing = Boolean(aula);

  const [idPabellon, setIdPabellon] = useState(
    aula?.id_pabellon ? String(aula.id_pabellon) : defaultPabellon ? String(defaultPabellon) : (pabellones[0]?.id_pabellon ? String(pabellones[0].id_pabellon) : '')
  );
  const [pisos, setPisos] = useState([]);
  const [loadingPisos, setLoadingPisos] = useState(false);

  const [form, setForm] = useState({
    id_piso: aula?.id_piso ? String(aula.id_piso) : '',
    id_tipo_espacio: aula?.id_tipo_espacio ? String(aula.id_tipo_espacio) : (tiposAula[0]?.id_tipo_espacio ? String(tiposAula[0].id_tipo_espacio) : ''),
    id_estado_espacio: aula?.id_estado_espacio ? String(aula.id_estado_espacio) : (estadosAula[0]?.id_estado_espacio ? String(estadosAula[0].id_estado_espacio) : ''),
    nombre_codigo: aula?.nombre_codigo || '',
    capacidad_maxima: aula?.capacidad_maxima ? String(aula.capacidad_maxima) : '40',
    coord_x: aula?.coord_x != null ? String(aula.coord_x) : '',
    coord_y: aula?.coord_y != null ? String(aula.coord_y) : '',
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Cargar pisos cuando cambia el pabellón
  useEffect(() => {
    if (!idPabellon) {
      setPisos([]);
      return;
    }
    setLoadingPisos(true);
    aulasService.getPisos(idPabellon)
      .then((data) => {
        setPisos(data);
        if (!isEditing || (aula?.id_pabellon && String(aula.id_pabellon) !== String(idPabellon))) {
          if (data.length > 0) {
            setForm((f) => ({ ...f, id_piso: String(data[0].id_piso) }));
          } else {
            setForm((f) => ({ ...f, id_piso: '' }));
          }
        }
      })
      .catch(() => setPisos([]))
      .finally(() => setLoadingPisos(false));
  }, [idPabellon]);

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.id_piso) {
      setError('Debes seleccionar un piso para el aula');
      return;
    }
    if (!form.nombre_codigo.trim()) {
      setError('El nombre o código del aula es obligatorio');
      return;
    }
    const cap = Number(form.capacidad_maxima);
    if (!Number.isSafeInteger(cap) || cap <= 0) {
      setError('La capacidad debe ser un número entero mayor a 0');
      return;
    }

    setSaving(true);
    setError('');

    const payload = {
      id_piso: Number(form.id_piso),
      id_tipo_espacio: Number(form.id_tipo_espacio),
      id_estado_espacio: Number(form.id_estado_espacio),
      nombre_codigo: form.nombre_codigo.trim(),
      capacidad_maxima: cap,
      coord_x: form.coord_x !== '' ? Number(form.coord_x) : null,
      coord_y: form.coord_y !== '' ? Number(form.coord_y) : null,
    };

    try {
      if (isEditing) {
        await aulasService.updateAula(aula.id_aula, payload);
      } else {
        await aulasService.createAula(payload);
      }
      if (onSaved) await onSaved();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Error al guardar el aula');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="academic-modal-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget && !saving) onClose(); }}>
      <form className="academic-modal" onSubmit={handleSubmit} style={{ width: 'min(640px, 96%)' }}>
        <div className="academic-modal-header">
          <div>
            <h2>{isEditing ? `Editar Aula: ${aula.nombre_codigo}` : 'Nueva Aula o Espacio Físico'}</h2>
            <p>Registra las especificaciones físicas, capacidad y ubicación en la facultad.</p>
          </div>
          <button type="button" onClick={onClose} disabled={saving} aria-label="Cerrar modal">
            <X size={18} />
          </button>
        </div>

        {error && <div className="academic-error"><AlertCircle size={16} />{error}</div>}

        <div className="academic-form-grid">
          <label>
            Pabellón / Edificio
            <select
              required
              disabled={saving}
              value={idPabellon}
              onChange={(e) => setIdPabellon(e.target.value)}
            >
              <option value="">Seleccionar pabellón...</option>
              {pabellones.map((p) => (
                <option key={p.id_pabellon} value={p.id_pabellon}>
                  {p.nombre_pabellon} ({p.nombre_facultad || 'Facultad'})
                </option>
              ))}
            </select>
          </label>

          <label>
            Piso / Nivel
            <select
              required
              disabled={saving || loadingPisos}
              value={form.id_piso}
              onChange={(e) => update('id_piso', e.target.value)}
            >
              <option value="">{loadingPisos ? 'Cargando pisos...' : 'Seleccionar piso...'}</option>
              {pisos.map((pi) => (
                <option key={pi.id_piso} value={pi.id_piso}>
                  {pi.descripcion || `Piso ${pi.numero_piso}`} (Nivel {pi.numero_piso})
                </option>
              ))}
            </select>
          </label>

          <label>
            Código / Nombre del Aula
            <input
              required
              disabled={saving}
              value={form.nombre_codigo}
              onChange={(e) => update('nombre_codigo', e.target.value)}
              placeholder="Ej. Aula A-101, Lab B-201"
              maxLength={50}
            />
          </label>

          <label>
            Capacidad Máxima (plazas)
            <input
              type="number"
              min="1"
              max="500"
              required
              disabled={saving}
              value={form.capacidad_maxima}
              onChange={(e) => update('capacidad_maxima', e.target.value)}
            />
          </label>

          <label>
            Tipo de Aula / Espacio
            <select
              required
              disabled={saving}
              value={form.id_tipo_espacio}
              onChange={(e) => update('id_tipo_espacio', e.target.value)}
            >
              <option value="">Seleccionar tipo...</option>
              {tiposAula.map((t) => (
                <option key={t.id_tipo_espacio} value={t.id_tipo_espacio}>
                  {t.nombre_tipo}
                </option>
              ))}
            </select>
          </label>

          <label>
            Estado del Espacio
            <select
              required
              disabled={saving}
              value={form.id_estado_espacio}
              onChange={(e) => update('id_estado_espacio', e.target.value)}
            >
              <option value="">Seleccionar estado...</option>
              {estadosAula.map((es) => (
                <option key={es.id_estado_espacio} value={es.id_estado_espacio}>
                  {es.nombre_estado}
                </option>
              ))}
            </select>
          </label>

          <label>
            Coordenada X (Plano / Croquis - Opcional)
            <input
              type="number"
              step="0.01"
              disabled={saving}
              value={form.coord_x}
              onChange={(e) => update('coord_x', e.target.value)}
              placeholder="Ej. 120.50"
            />
          </label>

          <label>
            Coordenada Y (Plano / Croquis - Opcional)
            <input
              type="number"
              step="0.01"
              disabled={saving}
              value={form.coord_y}
              onChange={(e) => update('coord_y', e.target.value)}
              placeholder="Ej. 85.00"
            />
          </label>
        </div>

        <div className="academic-modal-actions">
          <button type="button" className="button button-light" onClick={onClose} disabled={saving}>
            Cancelar
          </button>
          <button type="submit" className="button button-primary" disabled={saving || !form.id_piso}>
            {saving && <Loader2 size={15} className="spin" />}
            {saving ? 'Guardando...' : isEditing ? 'Guardar Cambios' : 'Registrar Aula'}
          </button>
        </div>
      </form>
    </div>
  );
}

