import UsersDataAccess from "./usersDataAccess.js";
import { ok, serverError } from "../../helpers/httpResponse.js";

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
      const result = await this.dataAccess.updateUser(userId, userData);
      return ok(result);
    } catch (error) {
      return serverError(error);
    }
  }
}
