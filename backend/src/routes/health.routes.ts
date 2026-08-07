import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/apiError";
import { requireAuth, AuthedRequest } from "../middleware/auth";

const router = Router();

/**
 * Apple HealthKit access requires a native iOS app with HealthKit entitlements -
 * a browser can't read it directly. Flex Track bridges this with a personal,
 * revocable webhook key: the user points a HealthKit export shortcut (e.g. the
 * "Health Auto Export" app, or a custom Shortcuts automation) at this endpoint
 * and their workouts + active-energy (calories burned) flow straight into
 * their gym log and dashboard.
 */
const webhookSchema = z.object({
  healthApiKey: z.string().min(10),
  workouts: z
    .array(
      z.object({
        workoutType: z.string().optional(),
        startDate: z.string(),
        endDate: z.string().optional(),
        caloriesBurned: z.number().min(0),
      })
    )
    .min(1),
});

router.post(
  "/webhook",
  asyncHandler(async (req, res) => {
    const { healthApiKey, workouts } = webhookSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { healthApiKey } });
    if (!user) throw ApiError.unauthorized("Invalid Apple Health API key");

    const created = await prisma.$transaction(
      workouts.map((w) =>
        prisma.healthSync.create({
          data: {
            userId: user.id,
            workoutType: w.workoutType,
            startDate: new Date(w.startDate),
            endDate: w.endDate ? new Date(w.endDate) : undefined,
            caloriesBurned: w.caloriesBurned,
            source: "apple_health",
            raw: JSON.stringify(w),
          },
        })
      )
    );

    // Mirror each synced workout into the gym log so streaks/history include it.
    await prisma.$transaction(
      workouts.map((w) =>
        prisma.gymLog.create({
          data: {
            userId: user.id,
            date: new Date(w.startDate),
            caloriesBurned: w.caloriesBurned,
            notes: w.workoutType ? `Synced from Apple Health: ${w.workoutType}` : "Synced from Apple Health",
            source: "apple_health",
          },
        })
      )
    );

    res.status(201).json({ synced: created.length });
  })
);

router.use(requireAuth);

router.get(
  "/synced",
  asyncHandler(async (req: AuthedRequest, res) => {
    const syncs = await prisma.healthSync.findMany({
      where: { userId: req.userId! },
      orderBy: { startDate: "desc" },
      take: 100,
    });
    res.json({ syncs });
  })
);

export default router;
