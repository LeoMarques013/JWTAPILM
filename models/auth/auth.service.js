const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const db = require('../config/db');
const { User, RefreshToken } = require('../models');
const { fail } = require('../shared/http');
const publicUser = user => ({ id: user.id, name: user.name, username: user.username, email: user.email, isAdmin: user.isAdmin, active: user.active });
async function issue(user, transaction) {
  const accessToken = jwt.sign({ id: user.id, name: user.name, email: user.email, isAdmin: user.isAdmin }, process.env.JWT_SECRET, { expiresIn: process.env.ACCESS_TOKEN_TTL || '15m' });
  const refreshToken = crypto.randomBytes(48).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 86400000);
  await RefreshToken.create({ token: tokenHash(refreshToken), userId: user.id, expiresAt }, { transaction });
  return { accessToken, refreshToken, user: publicUser(user) };
}
async function login(email, password) {
  const user = await User.findOne({ where: { email } });
  if (!user || !await bcrypt.compare(password, user.password)) fail(401, 'E-mail ou senha inválidos.');
  if (!user.active) fail(403, 'Atendente desativado.');
  return issue(user);
}
function tokenHash(token) { return crypto.createHmac('sha256', process.env.JWT_REFRESH_SECRET).update(token).digest('hex'); }
async function refresh(token) {
  if (!token) fail(401, 'Refresh token ausente.');
  const previous = await RefreshToken.findOne({ where: { token: tokenHash(token) } });
  if (!previous) fail(401, 'Refresh token inválido.');
  if (previous.revoked) {
    await RefreshToken.update({ revoked: true }, { where: { userId: previous.userId } });
    fail(401, 'Refresh token reutilizado. Sessões revogadas.');
  }
  return db.transaction(async transaction => {
    const saved = await RefreshToken.findOne({ where: { token: tokenHash(token) }, transaction });
    if (!saved || saved.revoked) fail(401, 'Refresh token inválido.');
    if (saved.expiresAt <= new Date()) fail(401, 'Refresh token expirado.');
    const user = await User.findByPk(saved.userId, { transaction });
    if (!user || !user.active) fail(401, 'Usuário indisponível.');
    saved.revoked = true;
    await saved.save({ transaction });
    return issue(user, transaction);
  });
}
async function logout(token) {
  if (token) await RefreshToken.update({ revoked: true }, { where: { token: tokenHash(token) } });
}
module.exports = { login, refresh, logout, publicUser };
