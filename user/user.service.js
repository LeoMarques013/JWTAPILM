const bcrypt = require('bcrypt');
const { User } = require('../models');
const { fail } = require('../shared/http');
const { publicUser } = require('../auth/auth.service');
async function create(data) {
  const user = await User.create({ ...data, password: await bcrypt.hash(data.password, 10), isAdmin: false });
  return publicUser(user);
}
async function update(id, data) {
  const user = await User.findByPk(id);
  if (!user) fail(404, 'Atendente não encontrado.');
  if (data.password) data.password = await bcrypt.hash(data.password, 10);
  await user.update(data);
  return publicUser(user);
}
module.exports = { create, update };
