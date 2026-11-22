import FinancialAccount from "../../models/FinancialAccount.js";
import Payment from "../../models/Payment.js";
import Expense from "../../models/Expense.js";
import Revenue from "../../models/Revenue.js";
import FinancialTransfer from "../../models/FinancialTransfer.js";
import { schoolId } from "../expenses/expenseRules.js";
import { balanceAsOf, brazilBalanceDay, nextBalanceDay, calculateFinancialAccountBalances } from "./financialAccountsBalanceRules.js";

/* EN: Read-only account balance service. The existing financial collections remain the source of truth.
   PT: Serviço de saldos somente de leitura. As collections financeiras atuais continuam sendo a fonte dos valores. */
export default class FinancialAccountsBalanceDataAccess {
  constructor({ accountModel = FinancialAccount, paymentModel = Payment, expenseModel = Expense,
    revenueModel = Revenue, transferModel = FinancialTransfer,
    resolveSchoolId = schoolId, today = brazilBalanceDay } = {}) {
    this.accountModel = accountModel;
    this.paymentModel = paymentModel;
    this.expenseModel = expenseModel;
    this.revenueModel = revenueModel;
    this.transferModel = transferModel;
    this.resolveSchoolId = resolveSchoolId;
    this.today = today;
  }

  async getBalances(filters = {}, { session = null } = {}) {
    const asOf = balanceAsOf(filters?.asOf, this.today());
    const school = this.resolveSchoolId();
    /* EN: Every read in a transfer transaction must use the SAME session.
       PT: Toda leitura durante uma transferência deve usar a MESMA sessão. */
    const withSession = query => session ? query.session(session) : query;
    const accounts = await withSession(this.accountModel.find({ schoolId: school })
      .select("id name type active isDefault initialBalance balanceDate")
      .sort({ isDefault: -1, name: 1 })).lean();
    const eligibleAccounts = accounts.filter(account => account.balanceDate <= asOf);
    if (!eligibleAccounts.length) {
      return calculateFinancialAccountBalances({ accounts }, asOf);
    }

    /* EN: Query only known account IDs, settled dates and this school's expenses/revenues.
           Legacy payments have no schoolId, so account ownership establishes their scope.
       PT: Consulta só IDs conhecidos, datas liquidadas e despesas/proventos da escola.
           Pagamentos antigos não têm schoolId; o vínculo à conta delimita esses registros. */
    const ids = eligibleAccounts.map(account => account.id);
    const earliestBalanceDate = eligibleAccounts.reduce((min, account) =>
      account.balanceDate < min ? account.balanceDate : min, eligibleAccounts[0].balanceDate);
    const lower = nextBalanceDay(earliestBalanceDate);
    const upper = nextBalanceDay(asOf);
    const transferLower = `${earliestBalanceDate}T00:00:00.000Z`;
    const transferUpper = `${nextBalanceDay(upper)}T00:00:00.000Z`;
    const queries = [
      this.paymentModel.find({ accountId: { $in: ids }, status: { $ne: "reversed" },
        paidAt: { $gte: lower, $lt: upper } }).select("accountId amount paidAt status"),
      this.expenseModel.find({ schoolId: school, accountId: { $in: ids }, status: "paid",
        paidAt: { $gte: lower, $lt: upper } }).select("accountId paidAmount paidAt status"),
      this.revenueModel.find({ schoolId: school, accountId: { $in: ids }, status: "received",
        receivedAt: { $gte: lower, $lt: upper } }).select("accountId receivedAmount receivedAt status"),
      /* EN: Include reversals occurring after an older original transfer. An additional UTC
             day accounts for late São Paulo hours when calculating each account's balance.
         PT: Inclui estornos posteriores a transferências antigas. Um dia UTC extra
             contempla o período noturno de São Paulo no cálculo por data-base. */
      this.transferModel.find({ schoolId: school, status: { $in: ["completed", "reversed"] },
        $or: [{ fromAccountId: { $in: ids } }, { toAccountId: { $in: ids } }],
        $and: [{ $or: [
          { transferredAt: { $gte: transferLower, $lt: transferUpper } },
          { reversedAt: { $gte: transferLower, $lt: transferUpper } }
        ] }] })
        .select("fromAccountId toAccountId amount transferredAt status reversedAt")
    ];
    /* EN: MongoDB forbids parallel queries on the same transaction session.
       PT: MongoDB não permite consultas paralelas usando a mesma sessão transacional. */
    const results = session ? [] : await Promise.all(queries.map(q => q.lean()));
    if (session) for (const query of queries) results.push(await withSession(query).lean());
    const [payments, expenses, revenues, transfers] = results;
    return calculateFinancialAccountBalances({ accounts, payments, expenses, revenues, transfers }, asOf);
  }
}
