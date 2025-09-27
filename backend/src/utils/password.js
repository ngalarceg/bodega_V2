const crypto = require('crypto');

const ITERATIONS = 310000;
const KEY_LENGTH = 32;
const DIGEST = 'sha256';

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto
    .pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, DIGEST)
    .toString('hex');
  return `${salt}:${derivedKey}`;
}

function verifyPassword(password, storedHash) {
  if (!storedHash) {
    return false;
  }

  const [salt, originalHash] = storedHash.split(':');
  if (!salt || !originalHash) {
    return false;
  }

  const derivedKey = crypto
    .pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, DIGEST)
    .toString('hex');

  const derivedBuffer = Buffer.from(derivedKey, 'hex');
  const originalBuffer = Buffer.from(originalHash, 'hex');
  if (derivedBuffer.length !== originalBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(derivedBuffer, originalBuffer);
}

module.exports = { hashPassword, verifyPassword };
