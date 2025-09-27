import { NavLink, Outlet } from 'react-router-dom';
import { useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';
import chileAtiendeLogo from '../assets/chileatiende-logo.svg';

const NAV_ITEMS = [
  { to: '.', label: 'Inventario', end: true },
  { to: 'stock', label: 'Consultar stock' },
  { to: 'asignaciones', label: 'Asignaciones', requiresManage: true },
  { to: 'productos/nuevo', label: 'Ingresar producto', requiresManage: true },
  { to: 'productos/catalogo', label: 'Catálogo de productos', requiresManage: true },
  { to: 'guias', label: 'Guías de despacho', requiresManage: true },
  { to: 'bajas', label: 'Bajas de inventario', requiresManage: true },
  { to: 'bajas/externas', label: 'Actas de bajas externas', requiresManage: true },
  { to: 'administracion/cuentas', label: 'Administrar cuentas', requiresAdmin: true },
];

function Dashboard() {
  const { user, logout, hasRole } = useAuth();
  const canManage = hasRole('ADMIN', 'MANAGER');
  const isAdmin = hasRole('ADMIN');

  const navItems = useMemo(
    () =>
      NAV_ITEMS.filter((item) => {
        if (item.requiresAdmin) {
          return isAdmin;
        }
        if (item.requiresManage) {
          return canManage;
        }
        return true;
      }),
    [canManage, isAdmin]
  );

  return (
    <div className="dashboard">
      <header className="dashboard-hero">
        <div className="dashboard-brand">
          <img src={chileAtiendeLogo} alt="ChileAtiende" className="dashboard-brand-logo" />
          <div>
            <p className="dashboard-brand-eyebrow">Red de atención ciudadana</p>
            <h1>Panel de gestión de bodega</h1>
          </div>
        </div>
        <div className="dashboard-user">
          <div>
            <span className="dashboard-user-hello">Hola,</span>
            <p className="dashboard-user-name">{user.name}</p>
            <span className="muted">Rol: {user.role}</span>
          </div>
          <button type="button" className="logout" onClick={logout}>
            Cerrar sesión
          </button>
        </div>
      </header>

      <nav className="dashboard-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              isActive ? 'dashboard-nav-link active' : 'dashboard-nav-link'
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      <main className="dashboard-content">
        <Outlet />
      </main>
    </div>
  );
}

export default Dashboard;
