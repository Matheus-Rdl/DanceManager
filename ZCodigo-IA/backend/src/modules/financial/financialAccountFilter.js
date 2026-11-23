import FinancialAccount from "../../models/FinancialAccount.js";
import { schoolId } from "../expenses/expenseRules.js";
import { accountMatchForSchool } from "./financialAccountFilterRules.js";

/* EN: Resolve account ownership before every cash-flow query; never trust account IDs from the client.
   PT: Confere a escola da conta antes de cada consulta de caixa; nunca confia no ID enviado pelo cliente. */
export const resolveFinancialAccountMatch = (accountId) =>
  accountMatchForSchool(accountId, { accountModel: FinancialAccount, getSchoolId: schoolId });
