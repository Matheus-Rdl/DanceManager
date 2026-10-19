import User from '../../models/User.js';
import Activity from '../../models/Activity.js';
import { activityMats, isEnrolled, isStudent } from './activityStudentRules.js';

export default class UsersDataAccess {
  // Pega todos os usuários
  async getUsers() {
    return await User.find({}).lean();
  }

  // Pega usuário específico
  async getUser(id) {
    return await User.findById(id).lean();
  }

  // Pega usuário por matrícula
  async getUserByMat(user_mat) {
    return await User.findOne({ user_mat }).lean();
  }

  // Pega a próxima matrícula (lógica de agregação adaptada para Mongoose)
  async getNextUserMat() {
    const lastUser = await User.aggregate([
      { $match: { user_mat: { $exists: true } } },
      { $addFields: { userMatNumber: { $toInt: "$user_mat" } } },
      { $sort: { userMatNumber: -1 } },
      { $limit: 1 }
    ]);

    let nextMat = "000001";
    if (lastUser.length > 0 && lastUser[0].user_mat) {
      const lastMatNumber = parseInt(lastUser[0].user_mat, 10);
      nextMat = String(lastMatNumber + 1).padStart(6, "0");
    }
    return nextMat;
  }

  // Busca usuários por atividade
  async getUsersByActivity(activityMat) {
    const mat = String(activityMat);
    // Compatível com vínculos por matrícula simples ou por objeto (dados antigos).
    return await User.find({ $or: [
      { user_activities: mat },
      { "user_activities.activity_mat": mat },
      { "user_activities.activityMat": mat }
    ] }).lean();
  }

  /* Candidatos já cadastrados; consulta limitada e apenas dados usados na seleção. */
  async getActivityStudentCandidates(mat, search = "") {
    const filter = {
      user_type: { $in: [1, 2, "1", "2"] },
      $nor: [
        { user_activities: mat },
        { "user_activities.activity_mat": mat },
        { "user_activities.activityMat": mat }
      ]
    };
    const query = String(search || "").trim().slice(0, 80);
    if (query) {
      const safe = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.$or = [
        { user_name: { $regex: safe, $options: "i" } },
        { user_mat: { $regex: safe, $options: "i" } }
      ];
    }
    const users = await User.find(filter)
      .select("_id user_name user_mat user_situation user_type user_activities user_photo")
      .sort({ user_name: 1 }).limit(100).lean();
    return users.filter(user => !isEnrolled(user, mat));
  }

  /* Recalcula o campo derivado após uma alteração do vínculo, sem tocar contratos. */
  async syncUserActivityTypes(userId) {
    const user = await User.findById(userId).select("user_activities").lean();
    if (!user) return;
    const mats = activityMats(user);
    const activities = mats.length ? await Activity.find({ activity_mat: { $in: mats } })
      .select("activity_type").lean() : [];
    const types = [...new Set(activities.map(activity => activity.activity_type).filter(v => v != null))];
    await User.updateOne({ _id: userId }, { $set: { user_activity_types: types } });
  }

  /* Vínculo atual atômico por aluno. IDs repetidos e vínculos existentes são ignorados. */
  async addStudentsToActivity(mat, users) {
    let added = 0;
    let skipped = 0;
    for (const user of users) {
      if (!isStudent(user)) throw new Error("Somente alunos ou bolsistas podem entrar na turma.");
      if (isEnrolled(user, mat)) { skipped++; continue; }
      const result = await User.updateOne({ _id: user._id }, { $addToSet: { user_activities: mat } });
      if (result.modifiedCount) { added++; await this.syncUserActivityTypes(user._id); }
    }
    return { added, skipped };
  }

  /* Retira SOMENTE o vínculo atual, inclusive formatos legados por objeto.
     Não altera attendances, monthlyFees, payments, contratos ou user_situation. */
  async removeStudentFromActivity(mat, user) {
    if (!isEnrolled(user, mat)) return false;
    const current = await User.findById(user._id).select("user_activities").lean();
    if (!current || !isEnrolled(current, mat)) return false;
    // Usa atualização condicional para evitar substituir edições paralelas do array.
    await User.updateOne({ _id: user._id }, { $pull: { user_activities: mat } });
    await User.updateOne({ _id: user._id }, { $pull: { user_activities: { activity_mat: mat } } });
    await User.updateOne({ _id: user._id }, { $pull: { user_activities: { activityMat: mat } } });
    await this.syncUserActivityTypes(user._id);
    return true;
  }

  // Busca usuários por tipo
  async getUsersByType(typesArray) {
    return await User.find({ user_type: { $in: typesArray } }).lean();
  }

  // Adiciona novo usuário
  async addUser(userData) {
    const newUser = new User(userData);
    return await newUser.save(); // Validações e Uppercase acontecem aqui
  }

  // Atualiza um usuário
  async updateUser(id, userData) {
    if (userData.user_activities) {
      const activities = await Activity.find({
        activity_mat: {
          $in: userData.user_activities
        }
      }).lean();
      const user_activity_types = [
        ...new Set(
          activities.map(
            activity => activity.activity_type
          )
        )
      ];
      userData.user_activity_types = user_activity_types;
    }

    return await User.findByIdAndUpdate(
      id,
      { $set: userData },
      {
        new: true,
        runValidators: true
      }
    );
  }

  // Deleta um usuário
  async deleteUser(id) {
    return await User.findByIdAndDelete(id);
  }
}