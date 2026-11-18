const { z } = require('zod');
const { Reader, Loan } = require('../models');
const { resource, fail } = require('../shared/resource');
module.exports = resource({
  model: Reader,
  schema: z.object({ name: z.string().min(2), cpf: z.string().regex(/^\d{11}$/, 'CPF deve ter 11 dígitos'), email: z.email().optional().nullable(), phone: z.string().optional().nullable() }),
  beforeDelete: async item => { if (await Loan.count({ where: { readerId: item.id } })) fail(409, 'Leitor com histórico de empréstimos.'); }
});
