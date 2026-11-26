import mongoose from "mongoose";

/* EN: One mutex document per school serializes calendar writes across packages.
   PT: Um documento de bloqueio por escola serializa gravações da agenda entre pacotes. */
const schema = new mongoose.Schema({
  _id: { type: String, required: true },
  version: { type: Number, required: true }
}, { collection: "privateLessonCalendarLocks", versionKey: false });
export default mongoose.model("PrivateLessonCalendarLock", schema);
