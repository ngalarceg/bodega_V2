import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { filterUsers, normalizeSearchTerm } from '../utils/search';

const ROLE_OPTIONS = [
  { value: 'ADMIN', label: 'Administrador' },
  { value: 'MANAGER', label: 'Encargado' },
  { value: 'VIEWER', label: 'Consulta' },
];

const INITIAL_FORM_STATE = {
  name: '',
  email: '',
  password: '',
  role: 'VIEWER',
  adAccount: '',
};

function AccountManagementPage() {
  const { request, hasRole, user: currentUser } = useAuth();
  const isAdmin = hasRole('ADMIN');

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const [formValues, setFormValues] = useState(INITIAL_FORM_STATE);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [creating, setCreating] = useState(false);

  const [draftChanges, setDraftChanges] = useState({});
  const [savingUserId, setSavingUserId] = useState(null);
  const [updateMessage, setUpdateMessage] = useState('');
  const [updateError, setUpdateError] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [deleteMessage, setDeleteMessage] = useState('');
  const [deletingUserId, setDeletingUserId] = useState(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    setUpdateMessage('');
    setUpdateError('');
    setDeleteError('');
    setDeleteMessage('');
    try {
      const data = await request('/users');
      setUsers(data);
    } catch (err) {
      setError(err.message || 'No se pudo obtener la lista de usuarios.');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [request]);

  useEffect(() => {
    if (isAdmin) {
      loadUsers();
    }
  }, [isAdmin, loadUsers]);

  const handleFormChange = (event) => {
    const { name, value } = event.target;
    setFormValues((prev) => ({ ...prev, [name]: value }));
    setFormError('');
    setFormSuccess('');
    setDeleteError('');
    setDeleteMessage('');
  };

  const handleCreateUser = async (event) => {
    event.preventDefault();
    setFormError('');
    setFormSuccess('');
    setUpdateMessage('');
    setUpdateError('');

    const trimmedName = formValues.name.trim();
    const trimmedEmail = formValues.email.trim();
    const trimmedPassword = formValues.password.trim();

    if (!trimmedName || !trimmedEmail || !trimmedPassword) {
      setFormError('Completa el nombre, correo y contraseña.');
      return;
    }

    setCreating(true);
    try {
      await request('/users', {
        method: 'POST',
        data: {
          name: trimmedName,
          email: trimmedEmail,
          password: trimmedPassword,
          role: formValues.role,
          adAccount: formValues.adAccount.trim(),
        },
      });
      setFormValues(INITIAL_FORM_STATE);
      setFormSuccess('Cuenta creada correctamente.');
      await loadUsers();
    } catch (err) {
      setFormError(err.message || 'No se pudo crear la cuenta.');
    } finally {
      setCreating(false);
    }
  };

  const handleDraftChange = (userId, field, value) => {
    setDraftChanges((prev) => ({
      ...prev,
      [userId]: {
        ...prev[userId],
        [field]: value,
      },
    }));
    setUpdateMessage('');
    setUpdateError('');
    setDeleteError('');
    setDeleteMessage('');
  };

  const handleSaveUser = async (user) => {
    const draft = draftChanges[user._id] || {};
    const roleValue = draft.role ?? user.role;
    const adAccountValue = draft.adAccount ?? (user.adAccount || '');

    const trimmedAdAccount = adAccountValue.trim();
    const originalAdAccount = (user.adAccount || '').trim();

    const payload = {};
    if (roleValue !== user.role) {
      payload.role = roleValue;
    }
    if (trimmedAdAccount !== originalAdAccount) {
      payload.adAccount = trimmedAdAccount;
    }

    if (Object.keys(payload).length === 0) {
      return;
    }

    setSavingUserId(user._id);
    setUpdateError('');
    setUpdateMessage('');
    setDeleteError('');
    setDeleteMessage('');

    try {
      const response = await request(`/users/${user._id}`, {
        method: 'PATCH',
        data: payload,
      });
      setUsers((prev) =>
        prev.map((item) => (item._id === user._id ? response.user : item))
      );
      setDraftChanges((prev) => {
        const next = { ...prev };
        delete next[user._id];
        return next;
      });
      setUpdateMessage('Cambios guardados correctamente.');
    } catch (err) {
      setUpdateError(err.message || 'No se pudo actualizar la cuenta.');
    } finally {
      setSavingUserId(null);
    }
  };

  const handleDeleteUser = async (user) => {
    if (!user) {
      return;
    }

    if (currentUser?._id === user._id) {
      setDeleteMessage('');
      setDeleteError('No puedes eliminar tu propia cuenta.');
      return;
    }

    const confirmed = window.confirm(
      `¿Eliminar la cuenta de ${user.name}? Esta acción no se puede deshacer.`
    );

    if (!confirmed) {
      return;
    }

    setDeletingUserId(user._id);
    setDeleteError('');
    setDeleteMessage('');
    setUpdateMessage('');
    setUpdateError('');

    try {
      await request(`/users/${user._id}`, { method: 'DELETE' });
      setUsers((prev) => prev.filter((item) => item._id !== user._id));
      setDeleteMessage('Cuenta eliminada correctamente.');
    } catch (err) {
      setDeleteError(err.message || 'No se pudo eliminar la cuenta.');
    } finally {
      setDeletingUserId(null);
    }
  };

  const filteredUsers = useMemo(
    () => filterUsers(users, searchTerm),
    [users, searchTerm]
  );
  const normalizedSearch = useMemo(() => normalizeSearchTerm(searchTerm), [searchTerm]);

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
  };

  if (!isAdmin) {
    return (
      <section className="dashboard-section">
        <div className="card">
          <h2>Administración de cuentas</h2>
          <p className="muted">Solo los administradores pueden gestionar cuentas de acceso.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="dashboard-section">
      <div className="section-header">
        <div>
          <h2>Administración de cuentas</h2>
          <p className="muted">Crea nuevas cuentas y administra los roles disponibles en el sistema.</p>
        </div>
        <div className="section-actions">
          <label className="inline-filter">
            Buscar
            <input
              type="search"
              value={searchTerm}
              onChange={handleSearchChange}
              placeholder="Nombre, correo, rol..."
            />
          </label>
          <button type="button" className="secondary" onClick={loadUsers} disabled={loading}>
            {loading ? 'Actualizando...' : 'Actualizar'}
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3>Crear nueva cuenta</h3>
          <p className="muted">Registra usuarios adicionales y define su rol inicial.</p>
        </div>
        <form className="form-grid" onSubmit={handleCreateUser}>
          <label>
            Nombre
            <input
              name="name"
              value={formValues.name}
              onChange={handleFormChange}
              placeholder="Nombre y apellido"
              required
            />
          </label>
          <label>
            Correo electrónico
            <input
              type="email"
              name="email"
              value={formValues.email}
              onChange={handleFormChange}
              placeholder="usuario@organizacion.cl"
              required
            />
          </label>
          <label>
            Contraseña temporal
            <input
              type="password"
              name="password"
              value={formValues.password}
              onChange={handleFormChange}
              placeholder="Define una contraseña provisoria"
              required
            />
          </label>
          <label>
            Rol
            <select name="role" value={formValues.role} onChange={handleFormChange}>
              {ROLE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Cuenta de directorio activo (opcional)
            <input
              name="adAccount"
              value={formValues.adAccount}
              onChange={handleFormChange}
              placeholder="usuario.ad"
            />
          </label>
          {formError && <p className="error">{formError}</p>}
          {formSuccess && <p className="success-text">{formSuccess}</p>}
          <div className="actions">
            <button type="submit" className="primary" disabled={creating}>
              {creating ? 'Creando...' : 'Crear cuenta'}
            </button>
          </div>
        </form>
      </div>

      <div className="card">
        <div className="card-header">
          <h3>Cuentas registradas</h3>
          <p className="muted">Actualiza roles, cuentas de directorio y revisa la última modificación.</p>
        </div>
        {error && <p className="error">{error}</p>}
        {updateError && <p className="error">{updateError}</p>}
        {updateMessage && <p className="success-text">{updateMessage}</p>}
        {deleteError && <p className="error">{deleteError}</p>}
        {deleteMessage && <p className="success-text">{deleteMessage}</p>}
        <div className="table-responsive">
          <table className="data-table compact">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Correo</th>
                <th>Rol</th>
                <th>Cuenta AD</th>
                <th>Actualizado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={6} className="muted">
                    Cargando cuentas...
                  </td>
                </tr>
              )}
              {!loading && filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={6} className="muted">
                    {normalizedSearch
                      ? 'No hay cuentas que coincidan con la búsqueda.'
                      : 'Aún no hay usuarios registrados.'}
                  </td>
                </tr>
              )}
              {filteredUsers.map((user) => {
                const draft = draftChanges[user._id] || {};
                const roleValue = draft.role ?? user.role;
                const adAccountValue = draft.adAccount ?? (user.adAccount || '');
                const trimmedOriginalAd = (user.adAccount || '').trim();
                const trimmedDraftAd = adAccountValue.trim();
                const hasChanges =
                  roleValue !== user.role || trimmedDraftAd !== trimmedOriginalAd;
                const isSaving = savingUserId === user._id;
                const isCurrentUser = currentUser?._id === user._id;
                const updatedLabel = user.updatedAt
                  ? new Date(user.updatedAt).toLocaleDateString('es-CL')
                  : '—';

                return (
                  <tr key={user._id}>
                    <td>
                      <strong>{user.name}</strong>
                      {isCurrentUser && <div className="muted small-text">Tu cuenta actual</div>}
                    </td>
                    <td>{user.email}</td>
                    <td>
                      <select
                        value={roleValue}
                        onChange={(event) =>
                          handleDraftChange(user._id, 'role', event.target.value)
                        }
                      >
                        {ROLE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        value={adAccountValue}
                        onChange={(event) =>
                          handleDraftChange(user._id, 'adAccount', event.target.value)
                        }
                        placeholder="Sin cuenta"
                      />
                    </td>
                    <td>{updatedLabel}</td>
                    <td>
                      <div className="table-action-buttons">
                        <button
                          type="button"
                          className="secondary compact"
                          onClick={() => handleSaveUser(user)}
                          disabled={!hasChanges || isSaving}
                        >
                          {isSaving ? 'Guardando...' : 'Guardar cambios'}
                        </button>
                        <button
                          type="button"
                          className="danger compact"
                          onClick={() => handleDeleteUser(user)}
                          disabled={
                            isSaving ||
                            deletingUserId === user._id ||
                            isCurrentUser
                          }
                        >
                          {deletingUserId === user._id
                            ? 'Eliminando...'
                            : 'Eliminar cuenta'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

export default AccountManagementPage;
