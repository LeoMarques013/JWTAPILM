const { z } = require('zod');
const service = require('./auth.service');
const { route } = require('../shared/http');
const cookieName = 'biblioteca_refresh';
function getCookie(req) {
  const value = (req.headers.cookie || '').split(';').map(part => part.trim()).find(part => part.startsWith(cookieName + '='));
  return value ? decodeURIComponent(value.slice(cookieName.length + 1)) : null;
}
function setCookie(res, token) {
  res.cookie(cookieName, token, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/v1/auth', maxAge: 7 * 86400000 });
}
module.exports = {
  login: route(async (req, res) => {
    const data = z.object({ email: z.email(), password: z.string().min(1) }).parse(req.body);
    const result = await service.login(data.email, data.password);
    setCookie(res, result.refreshToken);
    res.json({ accessToken: result.accessToken, user: result.user });
  }),
  refresh: route(async (req, res) => {
    const result = await service.refresh(getCookie(req));
    setCookie(res, result.refreshToken);
    res.json({ accessToken: result.accessToken, user: result.user });
  }),
  logout: route(async (req, res) => {
    await service.logout(getCookie(req));
    res.clearCookie(cookieName, { path: '/v1/auth', sameSite: 'lax', secure: process.env.NODE_ENV === 'production' });
    res.json({ message: 'Sessão encerrada.' });
  }),
  me: route(async (req, res) => res.json(service.publicUser(req.user)))
};
