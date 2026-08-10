import { Router } from "express";
import { z } from "zod";
import crypto from "crypto";
import rateLimit from "express-rate-limit";
import { nanoid } from "nanoid";
import { prisma } from "../lib/prisma";
import { env } from "../config/env";
import { sendMail, passwordResetEmail, oauthAccountEmail } from "../services/email";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/apiError";
import { hashPassword, comparePassword } from "../utils/password";
import { signToken } from "../utils/jwt";
import { verifyGoogleIdToken, verifyAppleIdToken } from "../services/oauth";
import { requireAuth, AuthedRequest } from "../middleware/auth";
import { isPremiumActive, shouldShowAds } from "../services/subscription";

const router = Router();

/**
 * Password reset is a spam and brute-force target: the request side can be used
 * to bombard someone's inbox, the redeem side to guess tokens. Both get a much
 * tighter budget than the rest of the API.
 */
const resetRequestLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  // Generous enough that phone networks sharing one IP behind CGNAT don't lock
  // out real users, tight enough to stop inbox bombing. Guessing a token isn't
  // the threat here - they're 256-bit and single-use.
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many password reset attempts. Please try again later." },
});

/** Reset tokens are stored hashed, so a database leak can't be replayed. */
const hashToken = (token: string) => crypto.createHash("sha256").update(token).digest("hex");

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
  isPremium: boolean;
  premiumUntil: Date | null;
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
  isPremium: isPremiumActive(u),
  premiumUntil: u.premiumUntil,
  showAds: shouldShowAds(u),
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

/**
 * Password reset, step 1: request a link.
 *
 * Always responds the same way whether or not the address exists — otherwise
 * this endpoint becomes a way to discover who has an account.
 */
const forgotSchema = z.object({ email: z.string().email() });

router.post(
  "/forgot-password",
  resetRequestLimiter,
  asyncHandler(async (req, res) => {
    const { email } = forgotSchema.parse(req.body);
    const genericResponse = {
      message: "If an account exists for that email, we've sent a link to reset the password.",
    };

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.json(genericResponse);

    // Accounts created through Google/Apple have no password to reset. Tell
    // them how to get in rather than leaving them stuck waiting for a link.
    if (!user.passwordHash) {
      const mail = oauthAccountEmail(user.provider, `${env.clientUrls[0]}/login`);
      await sendMail({ to: user.email, ...mail });
      return res.json(genericResponse);
    }

    // Any earlier unused links stop working the moment a new one is issued.
    await prisma.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    });

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + env.passwordResetTtlMinutes * 60_000);
    await prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash: hashToken(token), expiresAt },
    });

    const resetUrl = `${env.clientUrls[0]}/reset-password?token=${token}`;
    const mail = passwordResetEmail(resetUrl, env.passwordResetTtlMinutes);
    await sendMail({ to: user.email, ...mail });

    res.json(genericResponse);
  })
);

/** Password reset, step 2: redeem the link and set a new password. */
const resetSchema = z.object({
  token: z.string().min(20),
  password: z.string().min(8).max(100),
});

router.post(
  "/reset-password",
  resetRequestLimiter,
  asyncHandler(async (req, res) => {
    const { token, password } = resetSchema.parse(req.body);

    const record = await prisma.passwordResetToken.findUnique({
      where: { tokenHash: hashToken(token) },
      include: { user: true },
    });

    const invalid = ApiError.badRequest("This reset link is invalid or has expired. Please request a new one.");
    if (!record || record.usedAt || record.expiresAt < new Date()) throw invalid;

    const passwordHash = await hashPassword(password);
    await prisma.$transaction([
      prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
      prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
      // Belt and braces: burn any other outstanding links for this account.
      prisma.passwordResetToken.updateMany({
        where: { userId: record.userId, usedAt: null },
        data: { usedAt: new Date() },
      }),
    ]);

    // Sign them straight in so they don't have to type the new password again.
    const jwt = signToken({ userId: record.user.id, email: record.user.email });
    res.json({ token: jwt, user: publicUser(record.user) });
  })
);

router.get(
  "/me",
  requireAuth,
  asyncHandler(async (req: AuthedRequest, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.userId! } });
    // A token can outlive its account (deleted elsewhere, or on another device).
    // 401 rather than 404 so the client clears the session and signs out.
    if (!user) throw ApiError.unauthorized("This account no longer exists");
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

/**
 * Permanently delete the signed-in account.
 *
 * Required by App Store Guideline 5.1.1(v): an app that lets people create an
 * account must let them delete it from inside the app, and it must actually
 * delete rather than deactivate.
 *
 * Most relations cascade from User, but plans the user authored do not - that
 * relation is Restrict, so they have to go first or the delete fails on a
 * foreign key. Crews are left intact for the other members unless this was the
 * last person in them.
 */
const deleteAccountSchema = z.object({
  /** Required for password accounts, so a borrowed phone can't wipe an account. */
  password: z.string().optional(),
  /** Required for Google/Apple accounts, which have no password to check. */
  confirmation: z.string().optional(),
});

router.delete(
  "/me",
  requireAuth,
  asyncHandler(async (req: AuthedRequest, res) => {
    const { password, confirmation } = deleteAccountSchema.parse(req.body ?? {});

    const user = await prisma.user.findUnique({ where: { id: req.userId! } });
    if (!user) throw ApiError.notFound("User not found");

    if (user.passwordHash) {
      if (!password) throw ApiError.badRequest("Enter your password to confirm deletion");
      const valid = await comparePassword(password, user.passwordHash);
      // 403, not 401: the session is valid, the confirmation failed. A 401 here
      // would trip the client's expired-session handling and sign the user out
      // instead of showing them the error.
      if (!valid) throw ApiError.forbidden("That password is incorrect");
    } else if (confirmation?.trim().toUpperCase() !== "DELETE") {
      throw ApiError.badRequest('Type DELETE to confirm');
    }

    const memberships = await prisma.groupMember.findMany({
      where: { userId: user.id },
      select: { groupId: true },
    });
    const groupIds = memberships.map((m) => m.groupId);

    await prisma.$transaction(async (tx) => {
      // Authored plans first - the creator relation is Restrict, not Cascade.
      // This also clears their days, exercises and shares.
      await tx.workoutPlan.deleteMany({ where: { createdById: user.id } });

      // Everything else hangs off the user and cascades from here: crew
      // memberships, gym logs, calorie entries, health syncs, reset tokens.
      await tx.user.delete({ where: { id: user.id } });

      // Tidy up crews this was the last member of, so empty crews don't linger.
      for (const groupId of groupIds) {
        const remaining = await tx.groupMember.count({ where: { groupId } });
        if (remaining === 0) await tx.group.delete({ where: { id: groupId } });
      }
    });

    res.status(204).send();
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
