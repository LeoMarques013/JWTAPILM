const { route, pagination, paged, fail } = require('../shared/http');
const { Reader, Loan, Book } = require('../models');
const base = require('./reader.service').controller;
base.loans = route(async (req, res) => {
  if (!await Reader.findByPk(req.params.id)) fail(404, 'Leitor não encontrado.');
  const { page, limit, offset } = pagination(req.query);
  const result = await Loan.findAndCountAll({ where: { readerId: req.params.id }, include: [Book], limit, offset, order: [['id', 'DESC']] });
  res.json(paged(result, page, limit));
});
module.exports = base;
