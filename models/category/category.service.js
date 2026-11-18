const { z } = require('zod');
const { Category, Book } = require('../models');
const { resource, fail } = require('../shared/resource');
module.exports = resource({
  model: Category,
  schema: z.object({ name: z.string().min(2), description: z.string().optional().nullable() }),
  beforeDelete: async item => { if (await Book.count({ where: { categoryId: item.id } })) fail(409, 'Categoria vinculada a livros.'); }
});
