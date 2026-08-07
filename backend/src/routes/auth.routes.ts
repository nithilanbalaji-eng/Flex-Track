import { Router } from "express";
import { z } from "zod";
import { nanoid } from "nanoid";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/apiError";
import { hashPassword, comparePassword } from "../utils/password";
import { signToken } from "../utils/jwt";
import { verifyGoogleIdToken, verifyAppleIdToken } from "../services/oauth";
import { requireAuth, AuthedRequest } from "../middleware/auth";

const router = Router();

const publicUser = (u: {
  id: string;
  email: string;
  name: string;
  provider: string;
  avatarUrl: string | null;
  age: number | null;
  sex: string | null;
  heightCm: number | null;
  weightKg: number | null;
  goal: string | null;
  activityLevel: string | null;
  experience: string | null;
  equipment: string | null;
  healthApiKey: string;
}) => ({
  id: u.id,
  email: u.email,
  name: u.name,
  provider: u.provider,
  avatarUrl: u.avatarUrl,
  age: u.age,
  sex: u.sex,
  heightCm: u.heightCm,
  weightKg: u.weightKg,
  goal: u.goal,
  activityLevel: u.activityLevel,
  experience: u.experience,
  equipment: u.equipment,
  healthApiKey: u.healthApiKey,
});

const signupSchema = z.object({
  name: z.string().min(1).max(80),
  email: z.string().email(),
  password: z.string().min(8).max(100),
});

router.post(
  "/signup",
  asyncHandler(async (req, res) => {
    const { name, email, password } = signupSchema.parse(req.body);

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw ApiError.conflict("An account with this email already exists");

    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        provider: "local",
        healthApiKey: nanoid(32),
      },
    });

    const token = signToken({ userId: user.id, email: user.email });
    res.status(201).json({ token, user: publicUser(user) });
  })
);

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const { email, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash) {
      throw ApiError.unauthorized("Invalid email or password");
    }

    const valid = await comparePassword(password, user.passwordHash);
    if (!valid) throw ApiError.unauthorized("Invalid email or password");

    const token = signToken({ userId: user.id, email: user.email });
    res.json({ token, user: publicUser(user) });
  })
);

const googleSchema = z.object({ idToken: z.string().min(10) });

router.post(
  "/google",
  asyncHandler(async (req, res) => {
    const { idToken } = googleSchema.parse(req.body);
    const profile = await verifyGoogleIdToken(idToken);

    let user = await prisma.user.findUnique({ where: { email: profile.email } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          name: profile.name,
          email: profile.email,
          provider: "google",
          providerId: profile.providerId,
          healthApiKey: nanoid(32),
        },
      });
    }

    const token = signToken({ userId: user.id, email: user.email });
    res.json({ token, user: publicUser(user) });
  })
);

const appleSchema = z.object({
  identityToken: z.string().min(10),
  fullName: z.string().optional(),
});

router.post(
  "/apple",
  asyncHandler(async (req, res) => {
    const { identityToken, fullName } = appleSchema.parse(req.body);
    const profile = await verifyAppleIdToken(identityToken, fullName);

    let user = await prisma.user.findUnique({ where: { email: profile.email } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          name: profile.name,
          email: profile.email,
          provider: "apple",
          providerId: profile.providerId,
          healthApiKey: nanoid(32),
        },
      });
    }

    const token = signToken({ userId: user.id, email: user.email });
    res.json({ token, user: publicUser(user) });
  })
);

router.get(
  "/me",
  requireAuth,
  asyncHandler(async (req: AuthedRequest, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.userId! } });
    if (!user) throw ApiError.notFound("User not found");
    res.json({ user: publicUser(user) });
  })
);

const profileSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  age: z.number().int().min(10).max(100).optional(),
  sex: z.enum(["male", "female", "other"]).optional(),
  heightCm: z.number().min(50).max(260).optional(),
  weightKg: z.number().min(20).max(400).optional(),
  goal: z.enum(["muscle_gain", "fat_loss", "maintenance", "strength", "endurance"]).optional(),
  activityLevel: z.enum(["sedentary", "light", "moderate", "active", "very_active"]).optional(),
  experience: z.enum(["beginner", "intermediate", "advanced"]).optional(),
  equipment: z.enum(["full_gym", "home_basic", "bodyweight_only"]).optional(),
});

router.put(
  "/me",
  requireAuth,
  asyncHandler(async (req: AuthedRequest, res) => {
    const data = profileSchema.parse(req.body);
    const user = await prisma.user.update({ where: { id: req.userId! }, data });
    res.json({ user: publicUser(user) });
  })
);

router.post(
  "/me/rotate-health-key",
  requireAuth,
  asyncHandler(async (req: AuthedRequest, res) => {
    const user = await prisma.user.update({
      where: { id: req.userId! },
      data: { healthApiKey: nanoid(32) },
    });
    res.json({ user: publicUser(user) });
  })
);

export default router;
