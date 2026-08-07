import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/apiError";
import { requireAuth, AuthedRequest } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

const exerciseSchema = z.object({
  name: z.string().min(1).max(120),
  sets: z.number().int().min(1).max(20),
  reps: z.string().min(1).max(30),
  restSeconds: z.number().int().min(0).max(900).optional(),
  notes: z.string().max(500).optional(),
});

const daySchema = z.object({
  dayNumber: z.number().int().min(1).max(14),
  title: z.string().min(1).max(80),
  exercises: z.array(exerciseSchema).min(1),
});

const createPlanSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(1000).optional(),
  goal: z.string().max(60).optional(),
  daysPerWeek: z.number().int().min(1).max(7).optional(),
  groupId: z.string().optional(),
  isAiGenerated: z.boolean().optional(),
  days: z.array(daySchema).min(1),
});

const planInclude = {
  createdBy: { select: { id: true, name: true, avatarUrl: true } },
  group: { select: { id: true, name: true } },
  days: { include: { exercises: { orderBy: { order: "asc" as const } } }, orderBy: { dayNumber: "asc" as const } },
  shares: { include: { user: { select: { id: true, name: true, avatarUrl: true } } } },
};

async function assertPlanAccess(planId: string, userId: string) {
  const plan = await prisma.workoutPlan.findUnique({
    where: { id: planId },
    include: { shares: true, group: { include: { members: true } } },
  });
  if (!plan) throw ApiError.notFound("Workout plan not found");

  const isOwner = plan.createdById === userId;
  const isSharedWithMe = plan.shares.some((s) => s.userId === userId);
  const isGroupMember = plan.group?.members.some((m) => m.userId === userId) ?? false;
  if (!isOwner && !isSharedWithMe && !isGroupMember) {
    throw ApiError.forbidden("You don't have access to this workout plan");
  }
  return { plan, isOwner };
}

// List plans I own, that are shared with me, or belong to my groups
router.get(
  "/",
  asyncHandler(async (req: AuthedRequest, res) => {
    const userId = req.userId!;
    const myGroupIds = (
      await prisma.groupMember.findMany({ where: { userId }, select: { groupId: true } })
    ).map((g) => g.groupId);

    const plans = await prisma.workoutPlan.findMany({
      where: {
        OR: [
          { createdById: userId },
          { shares: { some: { userId } } },
          { groupId: { in: myGroupIds } },
        ],
      },
      include: planInclude,
      orderBy: { updatedAt: "desc" },
    });
    res.json({ plans });
  })
);

router.get(
  "/:id",
  asyncHandler(async (req: AuthedRequest, res) => {
    await assertPlanAccess(req.params.id, req.userId!);
    const plan = await prisma.workoutPlan.findUnique({ where: { id: req.params.id }, include: planInclude });
    res.json({ plan });
  })
);

router.post(
  "/",
  asyncHandler(async (req: AuthedRequest, res) => {
    const data = createPlanSchema.parse(req.body);

    if (data.groupId) {
      const membership = await prisma.groupMember.findUnique({
        where: { groupId_userId: { groupId: data.groupId, userId: req.userId! } },
      });
      if (!membership) throw ApiError.forbidden("You're not a member of that group");
    }

    const plan = await prisma.workoutPlan.create({
      data: {
        name: data.name,
        description: data.description,
        goal: data.goal,
        daysPerWeek: data.daysPerWeek ?? data.days.length,
        groupId: data.groupId,
        isAiGenerated: data.isAiGenerated ?? false,
        createdById: req.userId!,
        days: {
          create: data.days.map((d) => ({
            dayNumber: d.dayNumber,
            title: d.title,
            exercises: {
              create: d.exercises.map((e, idx) => ({
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
      include: planInclude,
    });

    res.status(201).json({ plan });
  })
);

router.put(
  "/:id",
  asyncHandler(async (req: AuthedRequest, res) => {
    const { isOwner } = await assertPlanAccess(req.params.id, req.userId!);
    if (!isOwner) throw ApiError.forbidden("Only the creator can edit this plan");

    const data = createPlanSchema.parse(req.body);

    // Replace days/exercises wholesale for simplicity and consistency.
    await prisma.workoutDay.deleteMany({ where: { planId: req.params.id } });
    const plan = await prisma.workoutPlan.update({
      where: { id: req.params.id },
      data: {
        name: data.name,
        description: data.description,
        goal: data.goal,
        daysPerWeek: data.daysPerWeek ?? data.days.length,
        days: {
          create: data.days.map((d) => ({
            dayNumber: d.dayNumber,
            title: d.title,
            exercises: {
              create: d.exercises.map((e, idx) => ({
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
      include: planInclude,
    });

    res.json({ plan });
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req: AuthedRequest, res) => {
    const { isOwner } = await assertPlanAccess(req.params.id, req.userId!);
    if (!isOwner) throw ApiError.forbidden("Only the creator can delete this plan");
    await prisma.workoutPlan.delete({ where: { id: req.params.id } });
    res.status(204).send();
  })
);

const shareSchema = z.object({ email: z.string().email() });

router.post(
  "/:id/share",
  asyncHandler(async (req: AuthedRequest, res) => {
    const { isOwner } = await assertPlanAccess(req.params.id, req.userId!);
    if (!isOwner) throw ApiError.forbidden("Only the creator can share this plan");

    const { email } = shareSchema.parse(req.body);
    const target = await prisma.user.findUnique({ where: { email } });
    if (!target) throw ApiError.notFound("No Flex Track user found with that email");

    await prisma.workoutPlanShare.upsert({
      where: { planId_userId: { planId: req.params.id, userId: target.id } },
      update: {},
      create: { planId: req.params.id, userId: target.id },
    });

    const plan = await prisma.workoutPlan.findUnique({ where: { id: req.params.id }, include: planInclude });
    res.status(201).json({ plan });
  })
);

router.delete(
  "/:id/share/:userId",
  asyncHandler(async (req: AuthedRequest, res) => {
    const { isOwner } = await assertPlanAccess(req.params.id, req.userId!);
    if (!isOwner) throw ApiError.forbidden("Only the creator can manage sharing");
    await prisma.workoutPlanShare.deleteMany({ where: { planId: req.params.id, userId: req.params.userId } });
    res.status(204).send();
  })
);

export default router;
