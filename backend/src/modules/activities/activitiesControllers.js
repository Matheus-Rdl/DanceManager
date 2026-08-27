import ActivitiesDataAccess from "./activitiesDataAccess.js";
import { ok, serverError } from "../../helpers/httpResponse.js";

export default class ActivitiesControllers {
  constructor() {
    this.dataAccess = new ActivitiesDataAccess();
  }

  async getActivities() {
    try {
      const activities = await this.dataAccess.getActivities();
      return ok(activities);
    } catch (error) {
      return serverError(error);
    }
  }

  async getActivitiesByMat(activitiesMats) {
    try {
      const result = await this.dataAccess.getActivitiesByMat(
        activitiesMats
      );
      return ok(result);
    } catch (error) {
      return serverError(error);
    }
  }

  async getActivitiesByType(activityType) {
    try {
      const result = await this.dataAccess.getActivitiesByType(
        activityType
      );
      return ok(result);
    } catch (error) {
      return serverError(error);
    }
  }

  async getNextActivityMat() {
    try {
      const nextMat = await this.dataAccess.getNextActivityMat();
      return ok(nextMat);
    } catch (error) {
      return serverError(error);
    }
  }

  async addActivity(activityData) {
    try {
      const result = await this.dataAccess.addActivity(activityData);
      return ok(result);
    } catch (error) {
      return serverError(error);
    }
  }

  async deleteActivity(activityId) {
    try {
      const result = await this.dataAccess.deleteActivity(activityId);
      return ok(result);
    } catch (error) {
      return serverError(error);
    }
  }

  async updateActivity(activityId, activityData) {
    try {
      const result = await this.dataAccess.updateActivity(
        activityId,
        activityData
      );
      return ok(result);
    } catch (error) {
      return serverError(error);
    }
  }
}
