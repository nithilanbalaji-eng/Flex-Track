import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/apiError";
import { requireAuth, AuthedRequest } from "../middleware/auth";
import { estimateCalorieTarget } from "../services/nutrition";

const router = Router();
router.use(requireAuth);

const createEntrySchema = z.object({
  date: z.string().min(8),
  mealType: z.enum(["breakfast", "lunch", "dinner", "snack"]),
  foodName: z.string().min(1).max(120),
  calories: z.number().min(0).max(10000),
  protein: z.number().min(0).max(1000).optional(),
  carbs: z.number().min(0).max(1000).optional(),
  fat: z.number().min(0).max(1000).optional(),
});

function dayRange(dateStr: string) {
  const start = new Date(dateStr);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

router.get(
  "/",
  asyncHandler(async (req: AuthedRequest, res) => {
    const date = typeof req.query.date === "string" ? req.query.date : new Date().toISOString().slice(0, 10);
    const { start, end } = dayRange(date);

    const entries = await prisma.calorieEntry.findMany({
      where: { userId: req.userId!, date: { gte: start, lt: end } },
      orderBy: { createdAt: "asc" },
    });

    const totals = entries.reduce(
      (acc, e) => ({
        calories: acc.calories + e.calories,
        protein: acc.protein + (e.protein ?? 0),
        carbs: acc.carbs + (e.carbs ?? 0),
        fat: acc.fat + (e.fat ?? 0),
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );

    const user = await prisma.user.findUnique({ where: { id: req.userId! } });
    const target = user ? estimateCalorieTarget(user) : null;

    res.json({ date, entries, totals, target });
  })
);

router.post(
  "/",
  asyncHandler(async (req: AuthedRequest, res) => {
    const data = createEntrySchema.parse(req.body);
    const entry = await prisma.calorieEntry.create({
      data: { ...data, userId: req.userId!, date: new Date(data.date) },
    });
    res.status(201).json({ entry });
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req: AuthedRequest, res) => {
    const entry = await prisma.calorieEntry.findUnique({ where: { id: req.params.id } });
    if (!entry || entry.userId !== req.userId) throw ApiError.notFound("Entry not found");
    await prisma.calorieEntry.delete({ where: { id: req.params.id } });
    res.status(204).send();
  })
);

export default router;
