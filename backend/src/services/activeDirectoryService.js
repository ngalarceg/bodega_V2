/**
 * Servicio simulado de Active Directory. En un entorno real este archivo debe
 * conectarse a la infraestructura corporativa mediante LDAP o Microsoft Graph.
 */
const defaultUsers = [
  {
    id: 'ad-001',
    displayName: 'Juan Pérez',
    email: 'juan.perez@empresa.com',
    adAccount: 'jperez',
    department: 'Operaciones',
  },
  {
    id: 'ad-002',
    displayName: 'María González',
    email: 'maria.gonzalez@empresa.com',
    adAccount: 'mgonzalez',
    department: 'Logística',
  },
  {
    id: 'ad-003',
    displayName: 'Luis Martínez',
    email: 'luis.martinez@empresa.com',
    adAccount: 'lmartinez',
    department: 'Tecnología',
  },
];

let cachedUsers = [...defaultUsers];

function loadUsersFromEnv() {
  try {
    if (process.env.AD_MOCK_USERS) {
      const parsed = JSON.parse(process.env.AD_MOCK_USERS);
      if (Array.isArray(parsed) && parsed.length) {
        cachedUsers = parsed;
      }
    }
  } catch (error) {
    console.warn('No se pudo cargar AD_MOCK_USERS, se utilizarán los usuarios por defecto.');
  }
}

loadUsersFromEnv();

function listUsers() {
  return cachedUsers;
}

function findUserByAccount(adAccount) {
  if (!adAccount) {
    return null;
  }
  const normalized = adAccount.toLowerCase();
  return cachedUsers.find((user) => user.adAccount.toLowerCase() === normalized) || null;
}

function syncMockUsers(users) {
  if (Array.isArray(users) && users.length) {
    cachedUsers = users;
  }
  return cachedUsers;
}

module.exports = {
  listUsers,
  findUserByAccount,
  syncMockUsers,
};
