import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { requireAuth, AuthedRequest } from "../middleware/auth";
import { generateWorkoutPlan, WorkoutQuestionnaire } from "../services/aiWorkoutGenerator";

const router = Router();
router.use(requireAuth);

const questionnaireSchema = z.object({
  age: z.number().int().min(10).max(100),
  sex: z.enum(["male", "female", "other"]),
  heightCm: z.number().min(50).max(260),
  weightKg: z.number().min(20).max(400),
  goal: z.enum(["muscle_gain", "fat_loss", "maintenance", "strength", "endurance"]),
  experience: z.enum(["beginner", "intermediate", "advanced"]),
  daysPerWeek: z.number().int().min(1).max(7),
  equipment: z.enum(["full_gym", "home_basic", "bodyweight_only"]),
  injuries: z.string().max(500).optional(),
  activityLevel: z.enum(["sedentary", "light", "moderate", "active", "very_active"]),
  saveProfile: z.boolean().optional(),
});

router.post(
  "/generate-plan",
  asyncHandler(async (req: AuthedRequest, res) => {
    const { saveProfile, ...questionnaire } = questionnaireSchema.parse(req.body);
    const q: WorkoutQuestionnaire = questionnaire;

    if (saveProfile) {
      await prisma.user.update({
        where: { id: req.userId! },
        data: {
          age: q.age,
          sex: q.sex,
          heightCm: q.heightCm,
          weightKg: q.weightKg,
          goal: q.goal,
          experience: q.experience,
          equipment: q.equipment,
          activityLevel: q.activityLevel,
        },
      });
    }

    const plan = await generateWorkoutPlan(q);
    res.json({ plan });
  })
);

const saveSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(1000).optional(),
  goal: z.string().max(60).optional(),
  days: z.array(
    z.object({
      dayNumber: z.number().int(),
      title: z.string(),
      exercises: z.array(
        z.object({
          name: z.string(),
          sets: z.number().int().min(0),
          reps: z.string(),
          restSeconds: z.number().int().min(0).optional(),
          notes: z.string().optional(),
        })
      ),
    })
  ),
});

// Persist an AI-generated plan as a real WorkoutPlan the user can share/log against.
router.post(
  "/save-plan",
  asyncHandler(async (req: AuthedRequest, res) => {
    const data = saveSchema.parse(req.body);
    const plan = await prisma.workoutPlan.create({
      data: {
        name: data.name,
        description: data.description,
        goal: data.goal,
        daysPerWeek: data.days.length,
        isAiGenerated: true,
        createdById: req.userId!,
        days: {
          create: data.days.map((d) => ({
            dayNumber: d.dayNumber,
            title: d.title,
            exercises: {
              create: d.exercises
                .filter((e) => e.sets > 0)
                .map((e, idx) => ({
                  name: e.name,
                  sets: e.sets,
                  reps: e.reps,
                  restSeconds: e.restSeconds,
                  notes: e.notes,
                  order: idx,
                })),
            },
          })),
        },
      },
      include: {
        days: { include: { exercises: true }, orderBy: { dayNumber: "asc" } },
      },
    });
    res.status(201).json({ plan });
  })
);

export default router;
