const { Op } = require('sequelize');
const { route, pagination, paged, fail } = require('./http');
function resource({ model, schema, include = [], searchField = 'name', beforeDelete, prepare, afterWrite, whereExtra }) {
  const service = {
    async list(query) {
      const { page, limit, offset } = pagination(query);
      const where = {};
      if (query.search) where[searchField] = { [Op.like]: '%' + query.search + '%' };
      if (whereExtra) Object.assign(where, await whereExtra(query));
      const result = await model.findAndCountAll({ where, include, distinct: true, limit, offset, order: [['id', 'ASC']] });
      return paged(result, page, limit);
    },
    async get(id) { const item = await model.findByPk(id, { include }); if (!item) fail(404, 'Registro não encontrado.'); return item; },
    async create(body) { const data = schema.parse(body); if (prepare) await prepare(data); const item = await model.create(data); if (afterWrite) await afterWrite(item, data); return service.get(item.id); },
    async update(id, body) { const item = await service.get(id); const data = schema.partial().parse(body); if (prepare) await prepare(data, item); await item.update(data); if (afterWrite) await afterWrite(item, data); return service.get(item.id); },
    async remove(id) { const item = await service.get(id); if (beforeDelete) await beforeDelete(item); await item.destroy(); }
  };
  const controller = {
    list: route(async (req, res) => res.json(await service.list(req.query))),
    get: route(async (req, res) => res.json(await service.get(req.params.id))),
    create: route(async (req, res) => res.status(201).json(await service.create(req.body))),
    update: route(async (req, res) => res.json(await service.update(req.params.id, req.body))),
    remove: route(async (req, res) => { await service.remove(req.params.id); res.sendStatus(204); })
  };
  return { service, controller };
}
function router(controller, adminWrite = false) {
  const result = require('express').Router();
  const { isAdmin } = require('../auth/auth.middleware');
  result.get('/', controller.list);
  result.get('/:id', controller.get);
  result.post('/', ...(adminWrite ? [isAdmin] : []), controller.create);
  result.put('/:id', ...(adminWrite ? [isAdmin] : []), controller.update);
  result.delete('/:id', ...(adminWrite ? [isAdmin] : []), controller.remove);
  return result;
}
module.exports = { resource, router, fail };
