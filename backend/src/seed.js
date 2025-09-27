const dotenv = require('dotenv');
const mongoose = require('mongoose');
const User = require('./models/User');
const { hashPassword } = require('./utils/password');

dotenv.config();

const DEFAULT_NAME = 'Administrador';
const DEFAULT_EMAIL = 'admin@bodega.com';
const DEFAULT_PASSWORD = 'Admin123!';

const name = process.env.SEED_ADMIN_NAME || DEFAULT_NAME;
const email = (process.env.SEED_ADMIN_EMAIL || DEFAULT_EMAIL).toLowerCase();
const password = process.env.SEED_ADMIN_PASSWORD || DEFAULT_PASSWORD;
const role = 'ADMIN';

const MONGODB_URI =
  process.env.MONGODB_URI ||
  'mongodb+srv://Cesfam:Cesfam.2025@basededatos1.hwq53bl.mongodb.net/?retryWrites=true&w=majority&appName=Basededatos1';

async function main() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB connection established');

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log('A user with this email already exists. Skipping creation.');
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
    await mongoose.disconnect();
    console.log('Conexión a MongoDB cerrada');
  }
}

main();
