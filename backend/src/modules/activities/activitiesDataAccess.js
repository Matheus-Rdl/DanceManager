import Activity from "../../models/Activity.js";
import User from "../../models/User.js";
import mongoose from "mongoose";

const teacherIds = (activity) => Array.isArray(activity?.activity_teachers)
  ? activity.activity_teachers.map(String).filter(Boolean)
  : [];

/* Uma única consulta para resolver nomes, sem gravar nomes duplicados em atividades. */
async function withTeacherNames(activities) {
  const ids = [...new Set(activities.flatMap(teacherIds))].filter(id => mongoose.isValidObjectId(id));
  const teachers = ids.length ? await User.find({ _id: { $in: ids } })
    .select("user_name user_mat user_situation").lean() : [];
  const byId = new Map(teachers.map(user => [String(user._id), user]));
  return activities.map(activity => ({
    ...activity,
    activity_teacher_names: teacherIds(activity).map(id => byId.get(id)?.user_name || "Professor não encontrado"),
    activity_teacher_details: teacherIds(activity).map(id => {
      const user = byId.get(id);
      return { id, name: user?.user_name || "Professor não encontrado", situation: user?.user_situation ?? null };
    })
  }));
}

/* Evita salvar pessoas que não estejam cadastradas como professor(a). */
async function validateTeachers(data) {
  if (!Object.prototype.hasOwnProperty.call(data, "activity_teachers")) return data;
  if (!Array.isArray(data.activity_teachers)) throw new Error("Selecione os professores em uma lista.");
  const ids = [...new Set(data.activity_teachers.map(String))];
  if (!ids.length) throw new Error("Selecione pelo menos um professor para a turma.");
  if (ids.some(id => !mongoose.isValidObjectId(id))) throw new Error("Professor com ID inválido.");
  const count = await User.countDocuments({ _id: { $in: ids }, user_type: 3 });
  if (count !== ids.length) throw new Error("Um dos usuários selecionados não é professor(a) ou não existe.");
  return { ...data, activity_teachers: ids };
}


export default class ActivitiesDataAccess {
  async getActivities() {
    return withTeacherNames(await Activity.find({}).lean());
  }

  async getActivitiesByMat(activitiesMats) {
    return withTeacherNames(await Activity.find({ activity_mat: { $in: activitiesMats } }).lean());
  }

  async getActivitiesByType(activityType) {
    return withTeacherNames(await Activity.find({ activity_type: { $in: activityType } }).lean());
  }

  async getTeacherOptions() {
    /* Exibe todos os professores cadastrados, inclusive pendentes ou afastados. */
    return User.find({ user_type: 3 })
      .select("user_name user_mat user_situation")
      .sort({ user_name: 1 }).lean();
  }

  async getNextActivityMat() {
    const lastActivity = await Activity.aggregate([
      { $match: { activity_mat: { $exists: true } } },
      { $addFields: { activityMatNumber: { $toInt: "$activity_mat" } } },
      { $sort: { activityMatNumber: -1 } },
      { $limit: 1 }
    ]);

    let nextMat = "000001";
    if (lastActivity.length > 0 && lastActivity[0].activity_mat) {
      const lastMatNumber = parseInt(lastActivity[0].activity_mat, 10);
      nextMat = String(lastMatNumber + 1).padStart(6, "0");
    }
    return nextMat;
  }

  async addActivity(activityData) {
    if (!Object.prototype.hasOwnProperty.call(activityData, "activity_teachers"))
      throw new Error("Selecione pelo menos um professor para a turma.");
    const payload = await validateTeachers(activityData);
    delete payload.activity_teacher_names;
    delete payload.activity_teacher_details;
    const activity = new Activity(payload);
    return await activity.save();
  }

  async deleteActivity(activityId) {
    return await Activity.findByIdAndDelete(activityId);
  }

  async updateActivity(activityId, activityData) {
    const payload = await validateTeachers(activityData);
    delete payload.activity_teacher_names;
    delete payload.activity_teacher_details;
    return await Activity.findByIdAndUpdate(
      activityId,
      { $set: payload },
      { new: true, runValidators: true }
    );
  }
}