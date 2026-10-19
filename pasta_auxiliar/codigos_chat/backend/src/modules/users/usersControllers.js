import UsersDataAccess from "./usersDataAccess.js";
import { ok, badRequest, notFound, serverError } from "../../helpers/httpResponse.js";
import mongoose from "mongoose";
import Activity from "../../models/Activity.js";
import { needsConfirmation, isStudent } from "./activityStudentRules.js";

export default class UsersControllers {
  constructor() {
    this.dataAccess = new UsersDataAccess();
  }

  async getUsers() {
    try {
      const users = await this.dataAccess.getUsers();
      return ok(users);
    } catch (error) {
      return serverError(error);
    }
  }

  /* Busca um único aluno pelo _id. */
  async getUserById(userId) {
    try {
      if (!mongoose.isValidObjectId(userId)) return badRequest("ID do aluno inválido.");
      const user = await this.dataAccess.getUser(userId);
      return user ? ok(user) : notFound("Aluno não encontrado.");
    } catch (error) {
      return serverError(error);
    }
  }

  async getNextUserMat() {
    try {
      const nextMat = await this.dataAccess.getNextUserMat();
      return ok(nextMat);
    } catch (error) {
      return serverError(error);
    }
  }

  async getUsersByActivity(activityMat) {
    try {
      const users = await this.dataAccess.getUsersByActivity(activityMat);
      return ok(users);
    } catch (error) {
      return serverError(error);
    }
  }

  async getActivityStudentCandidates(activityMat, query) {
    try {
      const activity = await Activity.findOne({ activity_mat: String(activityMat) }).select("_id").lean();
      if (!activity) return notFound("Turma não encontrada.");
      return ok(await this.dataAccess.getActivityStudentCandidates(String(activityMat), query));
    } catch (error) { return serverError(error); }
  }

  async addStudentsToActivity(activityMat, userIds, confirmed = false) {
    try {
      const mat = String(activityMat || "").trim();
      if (!Array.isArray(userIds) || !userIds.length || userIds.length > 50)
        return badRequest("Selecione de 1 a 50 alunos.");
      const ids = [...new Set(userIds.map(String))];
      if (ids.some(id => !mongoose.isValidObjectId(id))) return badRequest("Há alunos com ID inválido.");
      const activity = await Activity.findOne({ activity_mat: mat }).select("_id").lean();
      if (!activity) return notFound("Turma não encontrada.");
      const users = await Promise.all(ids.map(id => this.dataAccess.getUser(id)));
      if (users.some(user => !user)) return badRequest("Um dos alunos selecionados não existe.");
      if (users.some(user => !isStudent(user))) return badRequest("Seleção inclui usuário que não é aluno nem bolsista.");
      if (!confirmed && users.some(user => needsConfirmation(user)))
        return badRequest("Confirme a inclusão de alunos afastados ou inativos.");
      return ok(await this.dataAccess.addStudentsToActivity(mat, users));
    } catch (error) { return serverError(error); }
  }

  async removeStudentFromActivity(activityMat, userId) {
    try {
      const mat = String(activityMat || "").trim();
      if (!mongoose.isValidObjectId(userId)) return badRequest("ID do aluno inválido.");
      const activity = await Activity.findOne({ activity_mat: mat }).select("_id").lean();
      if (!activity) return notFound("Turma não encontrada.");
      const user = await this.dataAccess.getUser(userId);
      if (!user) return notFound("Aluno não encontrado.");
      if (!isStudent(user)) return badRequest("O usuário não é aluno nem bolsista.");
      const changed = await this.dataAccess.removeStudentFromActivity(mat, user);
      if (!changed) return badRequest("Aluno não está vinculado a esta turma.");
      return ok({ removed: true, userId: String(userId), activityMat: mat });
    } catch (error) { return serverError(error); }
  }

  async getUsersByType(types) {
    try {
      if (!types) {
        return ok([]);
      }

      // transforma "2,4" em [2,4]
      const typesArray = types
        .split(',')
        .map(type => parseInt(type));

      const users = await this.dataAccess.getUsersByType(typesArray);

      return ok(users);
    } catch (error) {
      return serverError(error);
    }
  }


  async addUser(userData) {
    try {
      if (userData?.user_situation != null && !["1", "2", "3", "4"].includes(String(userData.user_situation)))
        return badRequest("Situação cadastral inválida. Use 1, 2, 3 ou 4.");
      const result = await this.dataAccess.addUser(userData);
      return ok(result);
    } catch (error) {
      return serverError(error);
    }
  }

  async deleteUser(userId) {
    try {
      const result = await this.dataAccess.deleteUser(userId);
      return ok(result);
    } catch (error) {
      return serverError(error);
    }
  }

  async updateUser(userId, userData) {
    try {
      if (userData?.user_situation != null && !["1", "2", "3", "4"].includes(String(userData.user_situation)))
        return badRequest("Situação cadastral inválida. Use 1, 2, 3 ou 4.");
      const result = await this.dataAccess.updateUser(userId, userData);
      return ok(result);
    } catch (error) {
      return serverError(error);
    }
  }
}
