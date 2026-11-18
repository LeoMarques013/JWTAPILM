const { z } = require('zod');
const { Author } = require('../models');
const { resource, fail } = require('../shared/resource');
module.exports = resource({
  model: Author,
  schema: z.object({ name: z.string().min(2), nationality: z.string().optional().nullable(), birthDate: z.iso.date().optional().nullable() }),
  beforeDelete: async item => { if (await item.countBooks()) fail(409, 'Autor vinculado a livros.'); }
});
