import mongoose from "mongoose";
import {
  PRIVATE_LESSON_STATUSES, isValidLessonTimestamp, isValidLessonInterval
} from "./privateLessonRules.js";

/* EN: A session belongs to one purchase; attendees are resolved through its package.
   PT: Uma sessão pertence a uma contratação; os participantes são obtidos pelo pacote. */
const privateLessonSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, immutable: true },
  schoolId: { type: String, required: true, immutable: true },
  packageId: { type: String, required: true, immutable: true },
  /* EN: Optional recurring batch metadata; existing lessons remain valid.
     PT: Metadados opcionais do lote recorrente; aulas existentes continuam válidas. */
  seriesId: { type: String, immutable: true },
  seriesIndex: { type: Number, immutable: true, min: 0, validate: Number.isSafeInteger },
  seriesCount: { type: Number, immutable: true, min: 2, max: 100, validate: Number.isSafeInteger },
  /* EN: A replacement references its original appointment; dates of the original never change.
     PT: A reposição referencia o agendamento original; suas datas nunca são alteradas. */
  rescheduledFromId: { type: String, immutable: true, match: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i },
  statusChangedAt: { type: String, validate: isValidLessonTimestamp },
  startsAt: {
    type: String, required: true,
    validate: { validator: isValidLessonTimestamp, message: "Data e hora inicial UTC inválidas." }
  },
  endsAt: {
    type: String, required: true,
    validate: {
      validator: function (value) { return isValidLessonInterval(this.startsAt, value); },
      message: "O horário final deve ser posterior ao inicial e estar em UTC."
    }
  },
  /* EN: Only completed lessons consume credits; absences and cancellations do not.
     PT: Somente aulas realizadas consomem créditos; faltas e cancelamentos não consomem. */
  status: { type: String, enum: PRIVATE_LESSON_STATUSES, default: "scheduled", required: true },
  notes: { type: String, default: "", trim: true, maxlength: 1000 },
  createdAt: { type: String, required: true },
  updatedAt: { type: String, required: true }
}, { collection: "privateLessons", optimisticConcurrency: true });

/* EN: Non-unique calendar indexes intentionally allow overlapping lessons after confirmation.
   PT: Índices de agenda não únicos permitem sobreposições após confirmação. */
privateLessonSchema.index({ schoolId: 1, packageId: 1, status: 1, startsAt: 1 });
privateLessonSchema.index({ schoolId: 1, startsAt: 1, endsAt: 1 });

export default mongoose.model("PrivateLesson", privateLessonSchema);
