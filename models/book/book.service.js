const { z } = require('zod');
const { Op } = require('sequelize');
const { Book, Author, Category, Loan, Reservation } = require('../models');
const { resource, fail } = require('../shared/resource');
module.exports = resource({
  model: Book,
  include: [Category, Author],
  searchField: 'title',
  schema: z.object({ title: z.string().min(2), isbn: z.string().min(5), year: z.number().int().min(1450).max(2200).optional().nullable(), totalCopies: z.number().int().min(0), categoryId: z.number().int().positive(), authorIds: z.array(z.number().int().positive()).min(1) }),
  whereExtra: async query => {
    const where = {
      ...(query.title ? { title: { [Op.like]: '%' + query.title + '%' } } : {}),
      ...(query.categoryId ? { categoryId: Number(query.categoryId) } : {}),
      ...(query.available === 'true' ? { availableCopies: { [Op.gt]: 0 } } : {})
    };
    if (query.authorId) {
      const links = await Book.associations.Authors.through.model.findAll({ where: { authorId: Number(query.authorId) }, attributes: ['bookId'] });
      where.id = { [Op.in]: links.map(link => link.bookId) };
    }
    return where;
  },
  prepare: async (data, existing) => {
    if (data.categoryId && !await Category.findByPk(data.categoryId)) fail(400, 'Categoria inválida.');
    if (data.authorIds && await Author.count({ where: { id: data.authorIds } }) !== new Set(data.authorIds).size) fail(400, 'Autor inválido.');
    if (existing && data.totalCopies !== undefined) {
      const borrowed = existing.totalCopies - existing.availableCopies;
      if (data.totalCopies < borrowed) fail(409, 'Total menor que os exemplares emprestados.');
      data.availableCopies = data.totalCopies - borrowed;
    } else if (!existing) data.availableCopies = data.totalCopies;
  },
  afterWrite: async (item, data) => { if (data.authorIds) await item.setAuthors(data.authorIds); },
  beforeDelete: async item => {
    if (await Loan.count({ where: { bookId: item.id } }) || await Reservation.count({ where: { bookId: item.id, status: { [Op.in]: ['PENDENTE', 'PRONTA'] } } })) fail(409, 'Livro com histórico de empréstimos ou reserva ativa.');
  }
});
