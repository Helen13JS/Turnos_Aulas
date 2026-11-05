import React, { useState } from 'react';
import { AlertCircle, Loader2, X } from 'lucide-react';
import { aulasService } from '../../services/aulas.service';

export default function PabellonModal({ facultades = [], onClose, onSaved }) {
  const [form, setForm] = useState({
    id_facultad: facultades[0]?.id_facultad ? String(facultades[0].id_facultad) : '1',
    nombre_pabellon: '',
    cantidad_pisos: '2',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nombre_pabellon.trim()) {
      setError('El nombre del pabellón es obligatorio');
      return;
    }

    setSaving(true);
    setError('');

    try {
      // 1. Crear pabellón
      const res = await aulasService.createPabellon({
        id_facultad: Number(form.id_facultad),
        nombre_pabellon: form.nombre_pabellon.trim(),
      });

      const nuevoPabellon = res.pabellon;
      const numPisos = Number(form.cantidad_pisos) || 0;

      // 2. Crear pisos iniciales si se indicaron
      if (nuevoPabellon?.id_pabellon && numPisos > 0) {
        for (let i = 1; i <= numPisos; i++) {
          try {
            await aulasService.createPiso({
              id_pabellon: nuevoPabellon.id_pabellon,
              numero_piso: i,
              descripcion: i === 1 ? 'Planta Baja' : `Piso ${i}`,
            });
          } catch {
            // Continuar con los demás pisos si alguno ya existiese
          }
        }
      }

      if (onSaved) await onSaved(nuevoPabellon);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Error al registrar el pabellón');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="academic-modal-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget && !saving) onClose(); }}>
      <form className="academic-modal" onSubmit={handleSubmit} style={{ width: 'min(520px, 96%)' }}>
        <div className="academic-modal-header">
          <div>
            <h2>Nuevo Pabellón / Edificio</h2>
            <p>Registra un nuevo edificio o bloque físico dentro del campus universitario.</p>
          </div>
          <button type="button" onClick={onClose} disabled={saving} aria-label="Cerrar modal">
            <X size={18} />
          </button>
        </div>

        {error && <div className="academic-error"><AlertCircle size={16} />{error}</div>}

        <div className="academic-form-grid">
          <label>
            Facultad
            <select
              required
              disabled={saving}
              value={form.id_facultad}
              onChange={(e) => update('id_facultad', e.target.value)}
            >
              {facultades.map((f) => (
                <option key={f.id_facultad} value={f.id_facultad}>
                  {f.nombre_facultad}
                </option>
              ))}
            </select>
          </label>

          <label>
            Nombre del Pabellón
            <input
              required
              disabled={saving}
              value={form.nombre_pabellon}
              onChange={(e) => update('nombre_pabellon', e.target.value)}
              placeholder="Ej. Pabellón D, Edificio Central"
              maxLength={100}
            />
          </label>

          <label style={{ gridColumn: 'span 2' }}>
            Generar Pisos Iniciales (Niveles)
            <select
              disabled={saving}
              value={form.cantidad_pisos}
              onChange={(e) => update('cantidad_pisos', e.target.value)}
            >
              <option value="1">1 Piso (Planta Baja)</option>
              <option value="2">2 Pisos (Planta Baja y Piso 2)</option>
              <option value="3">3 Pisos</option>
              <option value="4">4 Pisos</option>
              <option value="5">5 Pisos</option>
            </select>
          </label>
        </div>

        <div className="academic-modal-actions">
          <button type="button" className="button button-light" onClick={onClose} disabled={saving}>
            Cancelar
          </button>
          <button type="submit" className="button button-primary" disabled={saving}>
            {saving && <Loader2 size={15} className="spin" />}
            {saving ? 'Guardando...' : 'Crear Pabellón'}
          </button>
        </div>
      </form>
    </div>
  );
}

