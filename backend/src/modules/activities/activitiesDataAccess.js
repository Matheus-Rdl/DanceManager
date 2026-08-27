import Activity from "../../models/Activity.js";

export default class ActivitiesDataAccess {
  async getActivities() {
    return await Activity.find({}).lean();
  }

  async getActivitiesByMat(activitiesMats) {
    return await Activity.find({ activity_mat: { $in: activitiesMats } }).lean();
  }

  async getActivitiesByType(activityType) {
    return await Activity.find({ activity_type: { $in: activityType } }).lean();
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
    const activity = new Activity(activityData);
    return await activity.save();
  }

  async deleteActivity(activityId) {
    return await Activity.findByIdAndDelete(activityId);
  }

  async updateActivity(activityId, activityData) {
    return await Activity.findByIdAndUpdate(
      activityId,
      { $set: activityData },
      { new: true, runValidators: true }
    );
  }
}