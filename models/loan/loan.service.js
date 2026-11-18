const db = require('../config/db');
const { Op } = require('sequelize');
const { Book, Reader, Loan, Reservation } = require('../models');
const { fail, pagination, paged } = require('../shared/http');
function display(loan) {
  const data = loan.toJSON();
  data.status = data.returnDate ? 'DEVOLVIDO' : new Date(data.dueDate) < new Date() ? 'ATRASADO' : 'ATIVO';
  return data;
}
async function list(query) {
  const { page, limit, offset } = pagination(query);
  const where = {};
  if (query.status === 'DEVOLVIDO') where.returnDate = { [Op.ne]: null };
  if (query.status === 'ATIVO') { where.returnDate = null; where.dueDate = { [Op.gte]: new Date() }; }
  if (query.status === 'ATRASADO') { where.returnDate = null; where.dueDate = { [Op.lt]: new Date() }; }
  const result = await Loan.findAndCountAll({ where, include: [Book, Reader], limit, offset, order: [['id', 'DESC']] });
  return { ...paged(result, page, limit), data: result.rows.map(display) };
}
async function create({ bookId, readerId }, userId) {
  return db.transaction(async transaction => {
    const book = await Book.findByPk(bookId, { transaction });
    const reader = await Reader.findByPk(readerId, { transaction });
    if (!book || !reader) fail(404, 'Livro ou leitor não encontrado.');
    const active = await Loan.findAll({ where: { readerId, returnDate: null }, transaction });
    if (active.length >= 3) fail(409, 'Leitor já tem três empréstimos ativos.');
    if (active.some(item => item.dueDate < new Date())) fail(409, 'Leitor tem empréstimo atrasado.');
    if (book.availableCopies <= 0) fail(409, 'Livro sem exemplares disponíveis. Faça uma reserva.');
    const first = await Reservation.findOne({ where: { bookId, status: { [Op.in]: ['PENDENTE', 'PRONTA'] } }, order: [['createdAt', 'ASC'], ['id', 'ASC']], transaction });
    if (first && first.readerId !== readerId) fail(409, 'Exemplar reservado para outro leitor.');
    const now = new Date();
    const dueDate = new Date(now.getTime() + 7 * 86400000);
    const loan = await Loan.create({ bookId, readerId, userId, loanDate: now, dueDate, status: 'ATIVO', fine: 0 }, { transaction });
    await book.decrement('availableCopies', { by: 1, transaction });
    if (first) await first.update({ status: 'ATENDIDA' }, { transaction });
    return loan;
  });
}
async function returnBook(id) {
  return db.transaction(async transaction => {
    const loan = await Loan.findByPk(id, { transaction });
    if (!loan) fail(404, 'Empréstimo não encontrado.');
    if (loan.returnDate) fail(409, 'Livro já devolvido.');
    const now = new Date();
    const fine = Math.max(0, Math.ceil((now - new Date(loan.dueDate)) / 86400000));
    await loan.update({ returnDate: now, status: 'DEVOLVIDO', fine }, { transaction });
    const book = await Book.findByPk(loan.bookId, { transaction });
    await book.increment('availableCopies', { by: 1, transaction });
    const first = await Reservation.findOne({ where: { bookId: loan.bookId, status: 'PENDENTE' }, order: [['createdAt', 'ASC'], ['id', 'ASC']], transaction });
    if (first) await first.update({ status: 'PRONTA' }, { transaction });
    return display(loan);
  });
}
module.exports = { list, create, returnBook };
