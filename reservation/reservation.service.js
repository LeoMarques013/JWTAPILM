const { Book, Reader, Reservation } = require('../models');
const { fail, pagination, paged } = require('../shared/http');
async function list(query) {
  const { page, limit, offset } = pagination(query);
  const result = await Reservation.findAndCountAll({ include: [Book, Reader], limit, offset, order: [['createdAt', 'ASC'], ['id', 'ASC']] });
  return paged(result, page, limit);
}
async function create({ bookId, readerId }) {
  const book = await Book.findByPk(bookId);
  if (!book || !await Reader.findByPk(readerId)) fail(404, 'Livro ou leitor não encontrado.');
  if (book.availableCopies > 0) fail(409, 'Livro disponível para empréstimo imediato.');
  if (await Reservation.findOne({ where: { bookId, readerId, status: 'PENDENTE' } })) fail(409, 'Leitor já está na fila deste livro.');
  return Reservation.create({ bookId, readerId });
}
async function cancel(id) {
  const reservation = await Reservation.findByPk(id);
  if (!reservation) fail(404, 'Reserva não encontrada.');
  if (!['PENDENTE', 'PRONTA'].includes(reservation.status)) fail(409, 'Reserva já encerrada.');
  const wasReady = reservation.status === 'PRONTA';
  await reservation.update({ status: 'CANCELADA' });
  if (wasReady) {
    const next = await Reservation.findOne({ where: { bookId: reservation.bookId, status: 'PENDENTE' }, order: [['createdAt', 'ASC'], ['id', 'ASC']] });
    if (next) await next.update({ status: 'PRONTA' });
  }
  return reservation;
}
module.exports = { list, create, cancel };
