import FinancialAccount from "../../models/FinancialAccount.js";
import Payment from "../../models/Payment.js";
import Expense from "../../models/Expense.js";
import Revenue from "../../models/Revenue.js";
import { schoolId } from "../expenses/expenseRules.js";
import { balanceAsOf, brazilBalanceDay, nextBalanceDay, calculateFinancialAccountBalances } from "./financialAccountsBalanceRules.js";

/* EN: Read-only account balance service. The existing financial collections remain the source of truth.
   PT: Serviço de saldos somente de leitura. As collections financeiras atuais continuam sendo a fonte dos valores. */
export default class FinancialAccountsBalanceDataAccess {
  constructor({ accountModel = FinancialAccount, paymentModel = Payment, expenseModel = Expense,
    revenueModel = Revenue, resolveSchoolId = schoolId, today = brazilBalanceDay } = {}) {
    this.accountModel = accountModel;
    this.paymentModel = paymentModel;
    this.expenseModel = expenseModel;
    this.revenueModel = revenueModel;
    this.resolveSchoolId = resolveSchoolId;
    this.today = today;
  }

  async getBalances(filters = {}) {
    const asOf = balanceAsOf(filters?.asOf, this.today());
    const school = this.resolveSchoolId();
    const accounts = await this.accountModel.find({ schoolId: school })
      .select("id name type active isDefault initialBalance balanceDate")
      .sort({ isDefault: -1, name: 1 }).lean();
    const eligibleAccounts = accounts.filter(account => account.balanceDate <= asOf);
    if (!eligibleAccounts.length) {
      return calculateFinancialAccountBalances({ accounts }, asOf);
    }

    /* EN: Query only known account IDs, settled dates and this school's expenses/revenues.
           Legacy payments have no schoolId, so account ownership establishes their scope.
       PT: Consulta só IDs conhecidos, datas liquidadas e despesas/proventos da escola.
           Pagamentos antigos não têm schoolId; o vínculo à conta delimita esses registros. */
    const ids = eligibleAccounts.map(account => account.id);
    const lower = nextBalanceDay(eligibleAccounts.reduce((min, account) =>
      account.balanceDate < min ? account.balanceDate : min, eligibleAccounts[0].balanceDate));
    const upper = nextBalanceDay(asOf);
    const [payments, expenses, revenues] = await Promise.all([
      this.paymentModel.find({ accountId: { $in: ids }, status: { $ne: "reversed" },
        paidAt: { $gte: lower, $lt: upper } }).select("accountId amount paidAt status").lean(),
      this.expenseModel.find({ schoolId: school, accountId: { $in: ids }, status: "paid",
        paidAt: { $gte: lower, $lt: upper } }).select("accountId paidAmount paidAt status").lean(),
      this.revenueModel.find({ schoolId: school, accountId: { $in: ids }, status: "received",
        receivedAt: { $gte: lower, $lt: upper } }).select("accountId receivedAmount receivedAt status").lean()
    ]);
    return calculateFinancialAccountBalances({ accounts, payments, expenses, revenues }, asOf);
  }
}
