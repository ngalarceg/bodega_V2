const express = require('express');
const { authenticate, authorizeRoles } = require('../middleware/auth');
const { listUsers, syncMockUsers } = require('../services/activeDirectoryService');

const router = express.Router();

router.get(
  '/users',
  authenticate,
  authorizeRoles('ADMIN', 'MANAGER'),
  (req, res) => {
    res.json(listUsers());
  }
);

router.post(
  '/mock/sync',
  authenticate,
  authorizeRoles('ADMIN'),
  (req, res) => {
    const { users } = req.body;
    const updated = syncMockUsers(users);
    res.json(updated);
  }
);

module.exports = router;
