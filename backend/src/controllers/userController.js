const mongoose = require('mongoose');
const User = require('../models/User');
const { hashPassword } = require('../utils/password');

const ALLOWED_ROLES = ['ADMIN', 'MANAGER', 'VIEWER'];

function resolveRole(role) {
  if (!role) {
    return 'VIEWER';
  }
  const normalized = String(role).toUpperCase();
  if (!ALLOWED_ROLES.includes(normalized)) {
    return 'VIEWER';
  }
  return normalized;
}

function formatAdAccount(value) {
  if (!value) {
    return undefined;
  }
  const trimmed = String(value).trim();
  return trimmed || undefined;
}

exports.listUsers = async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.json(users.map((user) => user.toJSON()));
  } catch (error) {
    console.error('listUsers error', error);
    res.status(500).json({ message: 'No se pudo obtener la lista de usuarios.' });
  }
};

exports.createUser = async (req, res) => {
  try {
    const { name, email, password, role, adAccount } = req.body;

    const trimmedName = typeof name === 'string' ? name.trim() : '';
    const trimmedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

    if (!trimmedName || !trimmedEmail || !password) {
      return res
        .status(400)
        .json({ message: 'Nombre, correo y contraseña son obligatorios.' });
    }

    const existingUser = await User.findOne({ email: trimmedEmail });
    if (existingUser) {
      return res.status(409).json({ message: 'El correo ya está registrado.' });
    }

    const passwordHash = hashPassword(password);
    const resolvedRole = resolveRole(role);

    const user = await User.create({
      name: trimmedName,
      email: trimmedEmail,
      passwordHash,
      role: resolvedRole,
      adAccount: formatAdAccount(adAccount),
    });

    res.status(201).json({ user: user.toJSON() });
  } catch (error) {
    console.error('createUser error', error);
    res.status(500).json({ message: 'No se pudo crear la cuenta.' });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { role, adAccount, password } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado.' });
    }

    if (role !== undefined) {
      const nextRole = resolveRole(role);
      if (user.role === 'ADMIN' && nextRole !== 'ADMIN') {
        const adminCount = await User.countDocuments({ role: 'ADMIN' });
        if (adminCount <= 1) {
          return res
            .status(400)
            .json({ message: 'Debe existir al menos un administrador activo.' });
        }
      }
      user.role = nextRole;
    }

    if (adAccount !== undefined) {
      user.adAccount = formatAdAccount(adAccount);
    }

    if (password) {
      user.passwordHash = hashPassword(password);
    }

    await user.save();

    res.json({ user: user.toJSON() });
  } catch (error) {
    console.error('updateUser error', error);
    res
      .status(500)
      .json({ message: 'No se pudieron actualizar los datos del usuario.' });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Identificador de usuario inválido.' });
    }

    if (req.user && req.user._id && req.user._id.equals(id)) {
      return res
        .status(400)
        .json({ message: 'No puedes eliminar tu propia cuenta de acceso.' });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado.' });
    }

    if (user.role === 'ADMIN') {
      const remainingAdmins = await User.countDocuments({
        role: 'ADMIN',
        _id: { $ne: user._id },
      });

      if (remainingAdmins === 0) {
        return res
          .status(400)
          .json({ message: 'Debe existir al menos un administrador activo.' });
      }
    }

    await user.deleteOne();

    res.json({ message: 'Cuenta eliminada correctamente.' });
  } catch (error) {
    console.error('deleteUser error', error);
    res.status(500).json({ message: 'No se pudo eliminar la cuenta.' });
  }
};
