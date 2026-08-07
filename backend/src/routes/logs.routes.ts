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
});

router.get(
  "/",
  asyncHandler(async (req: AuthedRequest, res) => {
    const logs = await prisma.gymLog.findMany({
      where: { userId: req.userId! },
      orderBy: { date: "desc" },
      take: 365,
    });
    res.json({ logs });
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
    const log = await prisma.gymLog.create({
      data: {
        userId: req.userId!,
        date: new Date(data.date),
        durationMinutes: data.durationMinutes,
        notes: data.notes,
        caloriesBurned: data.caloriesBurned,
        source: "manual",
      },
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
