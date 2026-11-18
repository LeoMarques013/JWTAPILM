const { z } = require('zod');
const service = require('./loan.service');
const { route } = require('../shared/http');
module.exports = {
  list: route(async (req, res) => res.json(await service.list(req.query))),
  create: route(async (req, res) => res.status(201).json(await service.create(z.object({ bookId: z.number().int().positive(), readerId: z.number().int().positive() }).parse(req.body), req.user.id))),
  returnBook: route(async (req, res) => res.json(await service.returnBook(req.params.id)))
};
