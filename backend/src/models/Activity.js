import mongoose from 'mongoose';

const activitySchema = new mongoose.Schema(
  {
    activity_mat: {
      type: String,
      required: true,
      unique: true,
      minlength: 6,
      maxlength: 6
    },
    activity_title: {
      type: String,
      required: true,
      uppercase: true,
      minlength: 3,
      maxlength: 30
    },
    activity_description: {
      type: String,
      required: false,
      uppercase: true,
      maxlength: 150
    },
    activity_type: {
      type: String,
      required: true
    },
    activity_time_start: {
      type: String,
      required: true
    },
    activity_time_end: {
      type: String,
      required: true
    },
    activity_active: {
      type: Number,
      required: true
    },
    activity_days: {
      type: Number,
      required: true
    }
  },
  {
    timestamps: true, strict: false
  }
);

export default mongoose.model('Activity', activitySchema, 'activities');