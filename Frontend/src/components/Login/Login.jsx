import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Loader2, User } from 'lucide-react';
import { authService } from '../../services/auth.service';
import './Login.css';
import { useAuth } from '../../context/AuthContext';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { refreshUser } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!email || !password) {
      setError('Por favor, ingresa tu correo y contraseña.');
      return;
    }

    setLoading(true);
    try {
      await authService.login(email, password);
      await refreshUser();
      navigate('/asignacion');
    } catch (err) {
      setError(err.message || 'Error de autenticación. Verifica tus credenciales.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page-bg">
      <div className="login-glass-box">
        <div className="login-system-title-wrap">
          <p className="login-system-kicker">Sistema</p>
          <h1 className="login-system-title">Asignación de Aulas</h1>
        </div>
        
        <div className="login-header-simple">
          <div className="user-icon-circle">
            <User size={36} color="white" strokeWidth={1.5} />
          </div>
          <h2>INICIO DE SESIÓN</h2>
        </div>

        {error && (
          <div className="login-error-message">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form-transparent">
          
          <div className="input-line-group">
            <Mail className="input-line-icon" size={20} />
            <input
              type="email"
              placeholder="Email ID"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              disabled={loading}
              required
            />
          </div>

          <div className="input-line-group">
            <Lock className="input-line-icon" size={20} />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              disabled={loading}
              required
            />
          </div>

          <div className="login-options">
            <label className="checkbox-label">
              <input type="checkbox" />
              <span>Remember me</span>
            </label>
            <a href="#" className="forgot-link">Forgot Password?</a>
          </div>

          <button 
            type="submit" 
            className="login-solid-btn"
            disabled={loading}
          >
            {loading ? <Loader2 className="spinner" size={20} /> : 'LOGIN'}
          </button>
          
        </form>
      </div>
    </div>
  );
};

export default Login;

