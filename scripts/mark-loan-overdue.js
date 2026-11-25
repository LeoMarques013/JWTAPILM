require('dotenv').config();
const db = require('../models/config/db');
const { Loan } = require('../models');

async function main() {
  const loanId = Number(process.argv[2]);
  if (!Number.isInteger(loanId) || loanId <= 0) {
    throw new Error('Informe o ID numérico de um empréstimo ativo. Ex.: pnpm demo:atrasar 1');
  }

  const loan = await Loan.findByPk(loanId);
  if (!loan) throw new Error(`Empréstimo ${loanId} não encontrado.`);
  if (loan.returnDate) throw new Error('Esse empréstimo já foi devolvido.');

  // One hour in the past makes the loan ATRASADO while the API rounds the fine to one day.
  const dueDate = new Date(Date.now() - 60 * 60 * 1000);
  await loan.update({ dueDate });
  console.log(`Empréstimo ${loanId} marcado como atrasado; a devolução deve calcular multa de R$ 1,00.`);
}

main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
}).finally(() => db.close());
