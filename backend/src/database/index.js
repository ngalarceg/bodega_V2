const { Sequelize } = require('sequelize');
const dotenv = require('dotenv');

dotenv.config();

const DEFAULTS = {
  database: 'bodega',
  username: 'sa',
  password: 'ChangeThisPassword!',
  host: '127.0.0.1',
  port: 1433,
};

const database = process.env.SQLSERVER_DATABASE || process.env.DB_NAME || DEFAULTS.database;
const username = process.env.SQLSERVER_USER || process.env.DB_USER || DEFAULTS.username;
const password = process.env.SQLSERVER_PASSWORD || process.env.DB_PASSWORD || DEFAULTS.password;
const host = process.env.SQLSERVER_HOST || process.env.DB_HOST || DEFAULTS.host;
const port = parseInt(process.env.SQLSERVER_PORT || process.env.DB_PORT || DEFAULTS.port, 10);

const sequelize = new Sequelize(database, username, password, {
  host,
  port,
  dialect: 'mssql',
  logging: false,
  dialectOptions: {
    options: {
      encrypt: false,
      trustServerCertificate: true,
    },
  },
});

module.exports = sequelize;
