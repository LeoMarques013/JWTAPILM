const { z } = require('zod');
const service = require('./reservation.service');
const { route } = require('../shared/http');
module.exports = {
  list: route(async (req, res) => res.json(await service.list(req.query))),
  create: route(async (req, res) => res.status(201).json(await service.create(z.object({ bookId: z.number().int().positive(), readerId: z.number().int().positive() }).parse(req.body)))),
  cancel: route(async (req, res) => res.json(await service.cancel(req.params.id)))
};
