const dotenv = require('dotenv');
const app = require('./app');
const { sequelize } = require('./models');

dotenv.config();

const DEFAULT_PORT = 4000;
const MAX_PORT_RETRIES = 5;

const PORT = parseInt(process.env.PORT || DEFAULT_PORT, 10);

async function listenWithRetry(app, port, attempt = 0) {
  return new Promise((resolve, reject) => {
    const server = app.listen(port, () => resolve(server));

    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE' && attempt < MAX_PORT_RETRIES) {
        const nextPort = port + 1;
        console.warn(
          `Port ${port} is already in use. Retrying with port ${nextPort} (${attempt + 1}/${MAX_PORT_RETRIES}).`
        );
        resolve(listenWithRetry(app, nextPort, attempt + 1));
        return;
      }

      reject(error);
    });
  });
}

async function start() {
  try {
    await sequelize.authenticate();
    await sequelize.sync();
    console.log('Conexión a SQL Server establecida');

    const server = await listenWithRetry(app, PORT);
    const addressInfo = server.address();
    const activePort = typeof addressInfo === 'string' ? PORT : addressInfo.port;
    console.log(`Server running on port ${activePort}`);
  } catch (error) {
    console.error('Failed to start server', error);
    process.exit(1);
  }
}

start();
