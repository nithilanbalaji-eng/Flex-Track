import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/apiError";
import { requireAuth, AuthedRequest } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

const createLogSchema = z.object({
  date: z.string().datetime().or(z.string().min(8)), // allow plain YYYY-MM-DD too
  durationMinutes: z.number().int().min(1).max(600).optional(),
  notes: z.string().max(500).optional(),
  caloriesBurned: z.number().min(0).max(5000).optional(),
  /** Which workout was performed, if the session followed a plan. */
  planId: z.string().optional(),
  planDayId: z.string().optional(),
});

/** Included so history can show "Day 2 — Pull" instead of just a date. */
const logInclude = {
  plan: { select: { id: true, name: true } },
  planDay: { select: { id: true, dayNumber: true, title: true } },
};

/** How far back the calendar view is asking for. */
const RANGE_DAYS: Record<string, number> = {
  week: 7,
  month: 31,
  "6months": 183,
  year: 366,
};

router.get(
  "/",
  asyncHandler(async (req: AuthedRequest, res) => {
    const range = typeof req.query.range === "string" ? req.query.range : "6months";
    const days = RANGE_DAYS[range] ?? RANGE_DAYS["6months"];
    const since = new Date();
    since.setDate(since.getDate() - days);
    since.setHours(0, 0, 0, 0);

    const logs = await prisma.gymLog.findMany({
      where: { userId: req.userId!, date: { gte: since } },
      orderBy: { date: "desc" },
      include: logInclude,
      take: 500,
    });
    res.json({ logs, range, since: since.toISOString() });
  })
);

router.get(
  "/summary",
  asyncHandler(async (req: AuthedRequest, res) => {
    const logs = await prisma.gymLog.findMany({
      where: { userId: req.userId! },
      orderBy: { date: "desc" },
      take: 365,
    });

    const dayKeys = new Set(logs.map((l) => l.date.toISOString().slice(0, 10)));
    const sortedDays = Array.from(dayKeys).sort((a, b) => (a < b ? 1 : -1)); // desc

    // Current streak: consecutive days ending today or yesterday
    let currentStreak = 0;
    const cursor = new Date();
    cursor.setHours(0, 0, 0, 0);
    for (;;) {
      const key = cursor.toISOString().slice(0, 10);
      if (dayKeys.has(key)) {
        currentStreak += 1;
        cursor.setDate(cursor.getDate() - 1);
      } else if (currentStreak === 0 && key === new Date().toISOString().slice(0, 10)) {
        // today has no log yet - check yesterday to keep streak alive
        cursor.setDate(cursor.getDate() - 1);
        continue;
      } else {
        break;
      }
    }

    let longestStreak = 0;
    let run = 0;
    let prev: Date | null = null;
    for (const key of [...sortedDays].reverse()) {
      const d = new Date(key);
      if (prev && (d.getTime() - prev.getTime()) / 86400000 === 1) {
        run += 1;
      } else {
        run = 1;
      }
      longestStreak = Math.max(longestStreak, run);
      prev = d;
    }

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);
    const last30 = logs.filter((l) => l.date >= thirtyDaysAgo).length;
    const totalCaloriesBurned = logs.reduce((sum, l) => sum + (l.caloriesBurned ?? 0), 0);

    res.json({
      totalSessions: logs.length,
      sessionsLast30Days: last30,
      currentStreak,
      longestStreak,
      totalCaloriesBurned,
    });
  })
);

router.post(
  "/",
  asyncHandler(async (req: AuthedRequest, res) => {
    const data = createLogSchema.parse(req.body);

    // Only attach a plan day the user can actually see, and make sure the day
    // really belongs to the plan being referenced.
    if (data.planDayId) {
      const day = await prisma.workoutDay.findUnique({
        where: { id: data.planDayId },
        include: { plan: { include: { shares: true, group: { include: { members: true } } } } },
      });
      if (!day) throw ApiError.notFound("Workout day not found");

      const plan = day.plan;
      const canSee =
        plan.createdById === req.userId ||
        plan.shares.some((s) => s.userId === req.userId) ||
        (plan.group?.members.some((m) => m.userId === req.userId) ?? false);
      if (!canSee) throw ApiError.forbidden("You don't have access to that workout plan");

      if (data.planId && data.planId !== plan.id) {
        throw ApiError.badRequest("planDayId does not belong to planId");
      }
      data.planId = plan.id;
    }

    const log = await prisma.gymLog.create({
      data: {
        userId: req.userId!,
        date: new Date(data.date),
        durationMinutes: data.durationMinutes,
        notes: data.notes,
        caloriesBurned: data.caloriesBurned,
        planId: data.planId,
        planDayId: data.planDayId,
        source: "manual",
      },
      include: logInclude,
    });
    res.status(201).json({ log });
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req: AuthedRequest, res) => {
    const log = await prisma.gymLog.findUnique({ where: { id: req.params.id } });
    if (!log || log.userId !== req.userId) throw ApiError.notFound("Log not found");
    await prisma.gymLog.delete({ where: { id: req.params.id } });
    res.status(204).send();
  })
);

export default router;
