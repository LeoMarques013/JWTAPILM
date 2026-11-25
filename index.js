require('dotenv').config();
const express = require('express');
const db = require('./models/config/db');
const { User } = require('./models');
const bcrypt = require('bcrypt');
const { authenticate } = require('./models/auth/auth.middleware');
const { spec } = require('./openapi');
const app = express();
app.use(express.json());
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', process.env.FRONT_URL || 'http://localhost:3001');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});
app.get('/v1/openapi.json', (req, res) => res.json(spec));
app.get('/v1/docs', (req, res) => res.type('html').send('<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Biblioteca API</title><link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css"></head><body><div id="swagger-ui"></div><script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script><script>SwaggerUIBundle({url:"/v1/openapi.json",dom_id:"#swagger-ui"})</script></body></html>'));
app.use('/v1/auth', require('./models/auth/auth.router'));
const routeModules = {
  user: './user/user.router',
  categories: './models/category/category.router',
  authors: './models/author/author.router',
  books: './models/book/book.router',
  readers: './reader/reader.router',
  loans: './models/loan/loan.router',
  reservations: './reservation/reservation.router',
  reports: './report/report.router',
};
for (const [path, modulePath] of Object.entries(routeModules)) {
  app.use('/v1/' + path, authenticate, require(modulePath));
}
app.use((error, req, res, next) => {
  if (error.name === 'ZodError') return res.status(400).json({ error: error.issues.map(item => item.path.join('.') + ': ' + item.message).join('; ') });
  if (error.name === 'SequelizeUniqueConstraintError') return res.status(409).json({ error: 'Já existe um registro com estes dados.' });
  res.status(error.status || 500).json({ error: error.status ? error.message : 'Erro interno do servidor.' });
});
async function start() {
  if (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET) throw new Error('Configure JWT_SECRET e JWT_REFRESH_SECRET no .env');
  await db.sync();
  if (!await User.findOne({ where: { isAdmin: true } })) {
    if (!process.env.ADMIN_PASSWORD) throw new Error('Configure ADMIN_PASSWORD para criar o administrador');
    await User.create({ name: 'Administrador', username: 'admin', email: process.env.ADMIN_EMAIL || 'admin@biblioteca.local', password: await bcrypt.hash(process.env.ADMIN_PASSWORD, 10), isAdmin: true, active: true });
  }
  app.listen(Number(process.env.PORT || 3000), () => console.log('API em http://localhost:' + (process.env.PORT || 3000)));
}
if (require.main === module) start().catch(error => { console.error(error); process.exit(1); });
module.exports = { app, start };
