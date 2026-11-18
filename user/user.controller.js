const { z } = require('zod');
const { User } = require('../models');
const service = require('./user.service');
const { publicUser } = require('../auth/auth.service');
const { route, pagination, paged } = require('../shared/http');
const schema = z.object({ name: z.string().min(2), username: z.string().min(2), email: z.email(), password: z.string().min(6) });
module.exports = {
  list: route(async (req, res) => { const { page, limit, offset } = pagination(req.query); const result = await User.findAndCountAll({ limit, offset, order: [['id', 'ASC']] }); res.json({ ...paged(result, page, limit), data: result.rows.map(publicUser) }); }),
  create: route(async (req, res) => res.status(201).json(await service.create(schema.parse(req.body)))),
  update: route(async (req, res) => res.json(await service.update(req.params.id, schema.partial().parse(req.body)))),
  active: route(async (req, res) => { const { active } = z.object({ active: z.boolean() }).parse(req.body); res.json(await service.update(req.params.id, { active })); })
};
