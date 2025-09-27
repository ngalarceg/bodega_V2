const dotenv = require('dotenv');
const { sequelize, User } = require('./models');
const { hashPassword } = require('./utils/password');

dotenv.config();

const DEFAULT_NAME = 'Administrador';
const DEFAULT_EMAIL = 'admin@bodega.com';
const DEFAULT_PASSWORD = 'Admin123!';

const name = process.env.SEED_ADMIN_NAME || DEFAULT_NAME;
const email = (process.env.SEED_ADMIN_EMAIL || DEFAULT_EMAIL).toLowerCase();
const password = process.env.SEED_ADMIN_PASSWORD || DEFAULT_PASSWORD;
const role = 'ADMIN';

async function main() {
  try {
    console.log('Conectando a SQL Server...');
    await sequelize.authenticate();
    await sequelize.sync();
    console.log('Conexión establecida.');

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      console.log('Ya existe un usuario con este correo. Se omite la creación.');
      return;
    }

    const passwordHash = hashPassword(password);

    const user = await User.create({
      name,
      email,
      passwordHash,
      role,
    });

    console.log('Usuario administrador creado exitosamente:');
    console.log(`  Nombre: ${user.name}`);
    console.log(`  Correo: ${user.email}`);
    console.log(`  Contraseña: ${password}`);
    console.log('¡Recuerda actualizar la contraseña después de iniciar sesión!');
  } catch (error) {
    console.error('Error al crear el usuario administrador:', error);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
    console.log('Conexión a SQL Server cerrada');
  }
}

main();
