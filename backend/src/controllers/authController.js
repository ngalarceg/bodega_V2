const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { hashPassword, verifyPassword } = require('../utils/password');

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key';
const JWT_EXPIRATION = '12h';

function generateToken(user) {
  return jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, {
    expiresIn: JWT_EXPIRATION,
  });
}

async function getRequestingUser(req) {
  const header = req.headers.authorization;
  if (!header) {
    return null;
  }

  const [type, token] = header.split(' ');
  if (type !== 'Bearer' || !token) {
    return null;
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(payload.id);
    return user;
  } catch (error) {
    return null;
  }
}

exports.register = async (req, res) => {
  try {
    const { name, email, password, role = 'VIEWER', adAccount } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Nombre, correo y contraseña son obligatorios.' });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({ message: 'El correo ya está registrado.' });
    }

    const totalUsers = await User.countDocuments();
    let resolvedRole = role;

    if (totalUsers === 0) {
      resolvedRole = 'ADMIN';
    } else {
      const requester = await getRequestingUser(req);
      if (!requester || requester.role !== 'ADMIN') {
        return res.status(403).json({ message: 'Solo los administradores pueden crear usuarios adicionales.' });
      }

      const allowedRoles = ['ADMIN', 'MANAGER', 'VIEWER'];
      if (!allowedRoles.includes(resolvedRole)) {
        resolvedRole = 'VIEWER';
      }
    }

    const passwordHash = hashPassword(password);

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      passwordHash,
      role: resolvedRole,
      adAccount,
    });

    res.status(201).json({ user: user.toJSON() });
  } catch (error) {
    console.error('register error', error);
    res.status(500).json({ message: 'No se pudo crear el usuario.' });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Correo y contraseña son obligatorios.' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ message: 'Credenciales inválidas.' });
    }

    const isValidPassword = verifyPassword(password, user.passwordHash);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Credenciales inválidas.' });
    }

    const token = generateToken(user);

    res.json({
      token,
      user: user.toJSON(),
    });
  } catch (error) {
    console.error('login error', error);
    res.status(500).json({ message: 'No se pudo iniciar sesión.' });
  }
};

exports.getProfile = async (req, res) => {
  res.json({ user: req.user });
};
