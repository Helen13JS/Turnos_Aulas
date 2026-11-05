import React, { useState } from 'react';
import { CheckCircle2, Eye, EyeOff, Laptop, LockKeyhole, ShieldCheck } from 'lucide-react';

export default function TabSeguridad({ user, onChangePassword }) {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [showCurrent, setShowCurrent] = useState(false);
  const [message, setMessage] = useState('');

  const update = (field, value) => setForm((previous) => ({ ...previous, [field]: value }));

  const submit = async (event) => {
    event.preventDefault();
    setMessage('');
    try {
      await onChangePassword(form);
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setMessage('Contraseña actualizada correctamente.');
    } catch (error) {
      setMessage(error.message);
    }
  };

  const label = user?.nombre_completo || `${user?.nombres || ''} ${user?.apellidos || ''}`.trim() || 'Usuario';

  return (
    <div className="security-grid">
      {/* ─── Tarjeta 1: Credenciales y Cambio de Contraseña ─── */}
      <section className="config-card">
        <div className="config-card-heading compact">
          <div className="config-heading-icon blue">
            <LockKeyhole size={20} />
          </div>
          <div>
            <h2>Credenciales de Acceso y Cambio de Contraseña</h2>
            <p>Actualiza tus credenciales personales para garantizar la integridad institucional.</p>
          </div>
        </div>

        <div className="security-profile">
          <b>{label.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()}</b>
          <div>
            <strong>{label}</strong>
            <small>{user?.email || 'Correo institucional'}</small>
          </div>
          <span>Usuario autenticado</span>
        </div>

        <form className="security-form" onSubmit={submit}>
          <label>
            Contraseña Actual
            <div className="password-input">
              <input
                required
                type={showCurrent ? 'text' : 'password'}
                value={form.currentPassword}
                onChange={(event) => update('currentPassword', event.target.value)}
                placeholder="Ingresa tu contraseña actual"
              />
              <button type="button" onClick={() => setShowCurrent((value) => !value)}>
                {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </label>

          <label>
            Nueva Contraseña
            <input
              required
              minLength="8"
              type="password"
              value={form.newPassword}
              onChange={(event) => update('newPassword', event.target.value)}
              placeholder="Mínimo 8 caracteres"
            />
          </label>

          <label>
            Confirmar Nueva Contraseña
            <input
              required
              minLength="8"
              type="password"
              value={form.confirmPassword}
              onChange={(event) => update('confirmPassword', event.target.value)}
              placeholder="Repite la nueva contraseña"
            />
          </label>

          {message && (
            <p className={message.includes('correctamente') ? 'security-success' : 'security-error'}>
              {message}
            </p>
          )}

          <button className="config-primary-button" type="submit">
            <LockKeyhole size={15} />
            Actualizar Contraseña
          </button>
        </form>
      </section>

      {/* ─── Tarjeta 2: Seguridad Institucional y 2FA (Blindada) ─── */}
      <section className="config-card security-advanced">
        <div className="config-card-heading compact">
          <div className="config-heading-icon green">
            <ShieldCheck size={20} />
          </div>
          <div>
            <h2>Seguridad Institucional y 2FA</h2>
            <p>Estado de autenticación, sesión activa y verificación.</p>
          </div>
        </div>

        <div className="two-factor">
          <div className="two-factor-title">
            <span>
              <CheckCircle2 size={18} />
              <strong>
                Autenticación en Dos Pasos (2FA){' '}
                <small style={{ color: '#64748b', fontWeight: 'normal' }}>(Próximamente)</small>
              </strong>
            </span>
            <button
              className="config-switch"
              disabled
              style={{ opacity: 0.5, cursor: 'not-allowed' }}
              title="Próximamente: Integración con TOTP / Google Authenticator"
              aria-label="Activar autenticación de dos pasos (Próximamente)"
            >
              <i />
            </button>
          </div>
          <p>
            La verificación mediante segundo factor TOTP (Google Authenticator / Authy) estará disponible en la siguiente fase de actualización institucional.
          </p>
        </div>

        <div className="sessions">
          <div>
            <h3>Sesión Actual</h3>
            <span>1 sesión conectada</span>
          </div>
          <div className="session-item">
            <Laptop size={18} />
            <div>
              <strong>Navegador Web Autorizado</strong>
              <small>Sesión activa vía JWT institucional</small>
            </div>
          </div>
        </div>

        <button
          className="config-secondary-button full-width"
          disabled
          style={{ opacity: 0.6, cursor: 'not-allowed' }}
          title="Próximamente: Revocación masiva de sesiones remotas"
        >
          Cerrar todas las demás sesiones (Próximamente)
        </button>
      </section>
    </div>
  );
}
