import mongoose from "mongoose";
import User from "../../models/User.js";
import Activity from "../../models/Activity.js";
import Contract from "../../models/Contract.js";
import MonthlyFee from "../../models/MonthlyFee.js";
import Payment from "../../models/Payment.js";
import Expense from "../../models/Expense.js";
import { schoolId, addMonths } from "../expenses/expenseRules.js";
import { todayInBrazil } from "../monthlyFees/monthlyFeeGeneration.js";

const cents = value => Math.round(Number(value || 0) * 100) / 100;
const nextDate = (date, days) => {
  const result = new Date(`${date}T12:00:00.000Z`);
  result.setUTCDate(result.getUTCDate() + days);
  return result.toISOString().slice(0, 10);
};
const dayCode = date => {
  const day = new Date(`${date}T12:00:00.000Z`).getUTCDay();
  return day === 0 ? 7 : day; // Convenção do Dance Manager: segunda=1, domingo=7.
};
const asText = value => {
  if (value == null) return "";
  if (typeof value === "object") return String(value.user_name || value.name || value.teacher_name || "").trim();
  return String(value).trim();
};
const getTeacher = activity => asText(
  activity.activity_teacher_name ?? activity.activity_teacher ?? activity.activity_professor ??
  activity.teacher_name ?? activity.teacher ?? activity.professor
);
const studentsForActivity = (user, activityMat) => (user.user_activities || []).some(link => {
  const value = typeof link === "object" && link !== null
    ? link.activity_mat ?? link.activityMat ?? link._id ?? link.id : link;
  return String(value) === activityMat;
});

/* Dashboard: consulta compacta. Não calcula saldo bancário ou dados inventados. */
export default class DashboardDataAccess {
  async getSummary() {
    const today = todayInBrazil();
    const month = today.slice(0, 7);
    const nextMonth = addMonths(month, 1);
    const in7Days = nextDate(today, 7);
    const in30Days = nextDate(today, 30);
    const activeFilter = { activity_active: 1 };
    const todayFilter = { ...activeFilter, activity_days: dayCode(today) };

    const [activeStudentIds, activeClasses, todayActivities, receivedRows, expenseRows, overdueRows, upcomingRows, expiringContractsCount] = await Promise.all([
      Contract.distinct("userId", { active: true }),
      Activity.countDocuments(activeFilter),
      Activity.find(todayFilter)
        .select("activity_mat activity_title activity_time_start activity_time_end activity_teacher_name activity_teacher activity_professor teacher_name teacher professor")
        .sort({ activity_time_start: 1 }).lean(),
      Payment.aggregate([
        { $match: { paidAt: { $gte: month, $lt: nextMonth } } },
        { $group: { _id: null, total: { $sum: "$amount" } } }
      ]),
      Expense.aggregate([
        { $match: { schoolId: schoolId(), status: "paid", paidAt: { $gte: month, $lt: nextMonth } } },
        { $group: { _id: null, total: { $sum: "$paidAmount" } } }
      ]),
      MonthlyFee.aggregate([
        { $match: {
          status: { $ne: "cancelled" }, dueDate: { $lt: today },
          $expr: { $gt: ["$amount", { $ifNull: ["$paidAmount", 0] }] }
        } },
        { $group: { _id: null, count: { $sum: 1 }, total: { $sum: { $subtract: ["$amount", { $ifNull: ["$paidAmount", 0] }] } } } }
      ]),
      Expense.aggregate([
        { $match: { schoolId: schoolId(), status: "pending", dueDate: { $lte: in7Days } } },
        { $group: { _id: null, count: { $sum: 1 }, total: { $sum: "$amount" } } }
      ]),
      Contract.countDocuments({ active: true, plannedEndDate: { $gte: today, $lte: in30Days } })
    ]);

    const validIds = activeStudentIds.filter(value => mongoose.isValidObjectId(value));
    const todayMats = todayActivities.map(activity => String(activity.activity_mat)).filter(Boolean);
    const [activeStudents, linkedUsers] = await Promise.all([
      User.countDocuments({ _id: { $in: validIds } }),
      todayMats.length ? User.find({ $or: [
        { user_activities: { $in: todayMats } },
        { "user_activities.activity_mat": { $in: todayMats } },
        { "user_activities.activityMat": { $in: todayMats } }
      ] }).select("user_activities").lean() : Promise.resolve([])
    ]);

    const todayClasses = todayActivities.map(activity => ({
      id: String(activity._id),
      title: activity.activity_title || "Turma sem nome",
      start: activity.activity_time_start || "",
      end: activity.activity_time_end || "",
      teacher: getTeacher(activity) || null,
      studentsCount: linkedUsers.filter(user => studentsForActivity(user, String(activity.activity_mat))).length
    }));

    const received = cents(receivedRows[0]?.total);
    const expensesPaid = cents(expenseRows[0]?.total);
    return {
      asOf: today,
      month,
      metrics: {
        activeStudents,
        activeClasses,
        received,
        overdueFeesCount: overdueRows[0]?.count || 0,
        overdueFeesValue: cents(overdueRows[0]?.total)
      },
      finance: { received, expensesPaid, result: cents(received - expensesPaid) },
      todayClasses,
      alerts: {
        overdueFeesCount: overdueRows[0]?.count || 0,
        overdueFeesValue: cents(overdueRows[0]?.total),
        pendingExpensesCount: upcomingRows[0]?.count || 0,
        pendingExpensesValue: cents(upcomingRows[0]?.total),
        expiringContractsCount
      }
    };
  }
}
