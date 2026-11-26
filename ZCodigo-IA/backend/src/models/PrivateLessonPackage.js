import mongoose from "mongoose";
import privateLessonPaymentSchema from "./PrivateLessonPayment.js";
import {
  PRIVATE_PACKAGE_STATUSES, hasValidParticipants, isValidLessonAmount,
  isValidLessonCount, isValidLessonDate, isValidLessonTimestamp
} from "./privateLessonRules.js";

/* EN: One purchase shared by all participants. The original name, quantity and price are snapshots.
   PT: Uma contratação compartilhada por todos os participantes. Nome, quantidade e preço são cópias da contratação. */
const privateLessonPackageSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, immutable: true },
  schoolId: { type: String, required: true, immutable: true },
  /* EN: Null identifies a custom package; otherwise references PrivateLessonPlan.id.
     PT: Nulo identifica um pacote personalizado; caso contrário referencia PrivateLessonPlan.id. */
  planId: { type: String, default: null, immutable: true },
  name: { type: String, required: true, trim: true, maxlength: 70 },
  participantIds: {
    type: [{ type: String, trim: true, lowercase: true }], default: undefined, required: true,
    validate: { validator: hasValidParticipants, message: "Informe participantes válidos, sem duplicações." }
  },
  lessonCount: {
    type: Number, required: true,
    validate: { validator: isValidLessonCount, message: "Quantidade de aulas deve ser um inteiro positivo." }
  },
  amount: {
    type: Number, required: true,
    validate: { validator: isValidLessonAmount, message: "Informe um valor positivo com até duas casas decimais." }
  },
  contractedOn: {
    type: String, required: true,
    validate: { validator: isValidLessonDate, message: "Data de contratação inválida (AAAA-MM-DD)." }
  },
  /* EN: Package lifecycle is independent of the financial state. No expiry or payment due date.
     PT: A situação do pacote independe da situação financeira. Sem validade ou vencimento. */
  status: { type: String, enum: PRIVATE_PACKAGE_STATUSES, default: "active", required: true },
  /* EN: Optional cancellation audit metadata; existing purchases need no migration.
     PT: Metadados opcionais de cancelamento; contratações existentes não precisam de migração. */
  cancelledAt: { type: String, validate: isValidLessonTimestamp },
  cancellationReason: { type: String, trim: true, minlength: 1, maxlength: 1000 },
  cancellationRequestId: { type: String, match: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i },
  notes: { type: String, default: "", trim: true, maxlength: 1000 },
  /* EN: Financial state is derived from receipts, not a duplicated balance.
     PT: A situação financeira é derivada dos recebimentos, sem duplicar saldo. */
  payments: { type: [privateLessonPaymentSchema], default: [] },
  createdAt: { type: String, required: true },
  updatedAt: { type: String, required: true }
}, { collection: "privateLessonPackages", optimisticConcurrency: true });

/* EN: Support both the student profile and the global package list without duplicating purchases.
   PT: Atende ao perfil do aluno e à listagem geral sem duplicar contratações. */
privateLessonPackageSchema.index({ schoolId: 1, participantIds: 1, status: 1 });
privateLessonPackageSchema.index({ schoolId: 1, status: 1, contractedOn: -1 });

export default mongoose.model("PrivateLessonPackage", privateLessonPackageSchema);
