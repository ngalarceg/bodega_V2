import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import chileAtiendeLogo from '../assets/chileatiende-logo.svg';

function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [formValues, setFormValues] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(formValues.email, formValues.password);
      const redirectPath = location.state?.from?.pathname || '/';
      navigate(redirectPath, { replace: true });
    } catch (err) {
      setError(err.message || 'No se pudo iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-layout">
      <div className="auth-card">
        <section className="auth-brand" aria-labelledby="auth-brand-title">
          <img src={chileAtiendeLogo} alt="ChileAtiende" className="auth-brand-logo" />
          <div className="auth-brand-copy">
            <p className="auth-brand-eyebrow">Red de atención ciudadana</p>
            <h1 id="auth-brand-title">Gestión de bodega ChileAtiende</h1>
            <p>
              Coordina la administración de recursos tecnológicos con la calidez y cercanía de la
              red ChileAtiende.
            </p>
          </div>
          <ul className="auth-brand-highlights">
            <li>Seguimiento transparente del inventario público.</li>
            <li>Asignaciones y guías alineadas con protocolos estatales.</li>
            <li>Soporte para equipos regionales y centrales.</li>
          </ul>
        </section>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-form-header">
            <h2>Iniciar sesión</h2>
            <p className="muted">Ingresa con tu correo corporativo y contraseña.</p>
          </div>
          <label>
            Correo electrónico
            <input
              type="email"
              name="email"
              value={formValues.email}
              onChange={handleChange}
              required
            />
          </label>
          <label>
            Contraseña
            <input
              type="password"
              name="password"
              value={formValues.password}
              onChange={handleChange}
              required
            />
          </label>
          {error && <p className="error">{error}</p>}
          <button type="submit" className="primary" disabled={loading}>
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
          <p className="muted small-text">
            Si es la primera vez que utilizas el sistema solicita a un administrador que cree tu
            cuenta o ejecuta el script de aprovisionamiento.
          </p>
        </form>
      </div>
    </div>
  );
}

export default LoginPage;
