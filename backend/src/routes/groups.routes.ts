import { Router } from "express";
import { z } from "zod";
import { customAlphabet } from "nanoid";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/apiError";
import { requireAuth, AuthedRequest } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

const inviteCodeAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // unambiguous chars
const genInviteCode = customAlphabet(inviteCodeAlphabet, 7);

const createGroupSchema = z.object({ name: z.string().min(1).max(80) });

// List groups the current user belongs to
router.get(
  "/",
  asyncHandler(async (req: AuthedRequest, res) => {
    const memberships = await prisma.groupMember.findMany({
      where: { userId: req.userId! },
      include: {
        group: {
          include: {
            members: { include: { user: { select: { id: true, name: true, avatarUrl: true, email: true } } } },
          },
        },
      },
    });
    res.json({ groups: memberships.map((m) => ({ ...m.group, myRole: m.role })) });
  })
);

router.post(
  "/",
  asyncHandler(async (req: AuthedRequest, res) => {
    const { name } = createGroupSchema.parse(req.body);
    const group = await prisma.group.create({
      data: {
        name,
        inviteCode: genInviteCode(),
        members: { create: { userId: req.userId!, role: "owner" } },
      },
      include: { members: { include: { user: { select: { id: true, name: true, avatarUrl: true, email: true } } } } },
    });
    res.status(201).json({ group });
  })
);

const joinSchema = z.object({ inviteCode: z.string().min(4).max(20) });

router.post(
  "/join",
  asyncHandler(async (req: AuthedRequest, res) => {
    const { inviteCode } = joinSchema.parse(req.body);
    const group = await prisma.group.findUnique({ where: { inviteCode: inviteCode.toUpperCase() } });
    if (!group) throw ApiError.notFound("No group found with that invite code");

    const existing = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: group.id, userId: req.userId! } },
    });
    if (existing) throw ApiError.conflict("You're already a member of this group");

    await prisma.groupMember.create({ data: { groupId: group.id, userId: req.userId! } });
    const full = await prisma.group.findUnique({
      where: { id: group.id },
      include: { members: { include: { user: { select: { id: true, name: true, avatarUrl: true, email: true } } } } },
    });
    res.status(201).json({ group: full });
  })
);

router.delete(
  "/:groupId/leave",
  asyncHandler(async (req: AuthedRequest, res) => {
    await prisma.groupMember.deleteMany({
      where: { groupId: req.params.groupId, userId: req.userId! },
    });
    res.status(204).send();
  })
);

export default router;
