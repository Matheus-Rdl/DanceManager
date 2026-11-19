import { isValidInitialBalance, isValidBalanceDate } from "../../models/financialAccountRules.js";

/* EN: Keep request validation independent of MongoDB for fast, repeatable unit tests.
   PT: Mantém a validação da requisição independente do MongoDB para testes rápidos e reproduzíveis. */
export const accountError = (message, statusCode = 400) =>
  Object.assign(new Error(message), { statusCode });

const ACCOUNT_TYPES = ["bank", "payment", "cash"];
const CREATE_FIELDS = ["name", "type", "initialBalance", "balanceDate", "isDefault"];
const UPDATE_FIELDS = ["name", "type", "active"];

/* EN: Normalize names consistently to enforce uniqueness per school, ignoring case and accents.
   PT: Normaliza nomes para garantir unicidade por escola, ignorando maiúsculas e acentos. */
export const accountName = value => {
  if (typeof value !== "string") throw accountError("Informe o nome da conta.");
  const name = value.trim().replace(/\s+/g, " ");
  if (name.length < 2 || name.length > 70) throw accountError("O nome da conta deve ter de 2 a 70 caracteres.");
  const nameKey = name.normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  if (!nameKey) throw accountError("O nome da conta precisa conter letras ou números.");
  return { name, nameKey };
};

const checkFields = (body, allowed) => {
  if (!body || typeof body !== "object" || Array.isArray(body)) throw accountError("Dados da conta inválidos.");
  if (Object.keys(body).some(key => !allowed.includes(key))) {
    throw accountError("Há campos não permitidos na solicitação da conta.");
  }
};

export const createAccountFields = body => {
  checkFields(body, CREATE_FIELDS);
  const names = accountName(body.name);
  if (!ACCOUNT_TYPES.includes(body.type)) throw accountError("Tipo de conta inválido.");
  if (!isValidInitialBalance(body.initialBalance)) throw accountError("Informe um saldo inicial válido, com até duas casas decimais.");
  if (!isValidBalanceDate(body.balanceDate)) throw accountError("Data de referência inválida (AAAA-MM-DD).");
  if (body.isDefault !== undefined && typeof body.isDefault !== "boolean") {
    throw accountError("Conta padrão deve ser verdadeiro ou falso.");
  }
  return { ...names, type: body.type, initialBalance: body.initialBalance,
    balanceDate: body.balanceDate, isDefault: body.isDefault ?? false };
};

/* EN: Administrative edits cannot rewrite opening balances, IDs, school scope or default status.
   PT: Edições administrativas não alteram saldos iniciais, IDs, escola ou conta padrão. */
export const updateAccountFields = body => {
  checkFields(body, UPDATE_FIELDS);
  if (Object.keys(body).length === 0) throw accountError("Informe ao menos um campo para atualizar.");
  const changes = {};
  if (Object.hasOwn(body, "name")) Object.assign(changes, accountName(body.name));
  if (Object.hasOwn(body, "type")) {
    if (!ACCOUNT_TYPES.includes(body.type)) throw accountError("Tipo de conta inválido.");
    changes.type = body.type;
  }
  if (Object.hasOwn(body, "active")) {
    if (typeof body.active !== "boolean") throw accountError("Situação da conta inválida.");
    changes.active = body.active;
  }
  return changes;
};

export const accountListFilters = query => {
  if (!query || query.active === undefined) return {};
  if (query.active === "true") return { active: true };
  if (query.active === "false") return { active: false };
  throw accountError("Filtro 'active' deve ser true ou false.");
};

export const validAccountId = id => typeof id === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
