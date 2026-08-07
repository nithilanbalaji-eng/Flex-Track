import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("password123", 10);

  const alex = await prisma.user.upsert({
    where: { email: "alex@flextrack.dev" },
    update: {},
    create: {
      name: "Alex Rivera",
      email: "alex@flextrack.dev",
      passwordHash,
      provider: "local",
      healthApiKey: nanoid(32),
      age: 28,
      sex: "male",
      heightCm: 178,
      weightKg: 82,
      goal: "muscle_gain",
      activityLevel: "moderate",
      experience: "intermediate",
      equipment: "full_gym",
    },
  });

  const sam = await prisma.user.upsert({
    where: { email: "sam@flextrack.dev" },
    update: {},
    create: {
      name: "Sam Chen",
      email: "sam@flextrack.dev",
      passwordHash,
      provider: "local",
      healthApiKey: nanoid(32),
      age: 25,
      sex: "female",
      heightCm: 165,
      weightKg: 60,
      goal: "fat_loss",
      activityLevel: "active",
      experience: "beginner",
      equipment: "full_gym",
    },
  });

  const group = await prisma.group.upsert({
    where: { inviteCode: "GYMBROS1" },
    update: {},
    create: {
      name: "Downtown Gym Crew",
      inviteCode: "GYMBROS1",
      members: {
        create: [
          { userId: alex.id, role: "owner" },
          { userId: sam.id, role: "member" },
        ],
      },
    },
  });

  const existingPlan = await prisma.workoutPlan.findFirst({ where: { name: "Push Pull Legs - Shared" } });
  if (!existingPlan) {
    await prisma.workoutPlan.create({
      data: {
        name: "Push Pull Legs - Shared",
        description: "Our 3-day PPL split. Let's stay consistent!",
        goal: "muscle_gain",
        daysPerWeek: 3,
        createdById: alex.id,
        groupId: group.id,
        days: {
          create: [
            {
              dayNumber: 1,
              title: "Push Day",
              exercises: {
                create: [
                  { name: "Barbell Bench Press", sets: 4, reps: "8-10", restSeconds: 90, order: 0 },
                  { name: "Overhead Press", sets: 3, reps: "8-10", restSeconds: 90, order: 1 },
                  { name: "Cable Tricep Pushdown", sets: 3, reps: "12-15", restSeconds: 60, order: 2 },
                ],
              },
            },
            {
              dayNumber: 2,
              title: "Pull Day",
              exercises: {
                create: [
                  { name: "Barbell Row", sets: 4, reps: "8-10", restSeconds: 90, order: 0 },
                  { name: "Lat Pulldown", sets: 3, reps: "10-12", restSeconds: 75, order: 1 },
                  { name: "Barbell Curl", sets: 3, reps: "10-12", restSeconds: 60, order: 2 },
                ],
              },
            },
            {
              dayNumber: 3,
              title: "Leg Day",
              exercises: {
                create: [
                  { name: "Barbell Back Squat", sets: 4, reps: "6-8", restSeconds: 120, order: 0 },
                  { name: "Romanian Deadlift", sets: 3, reps: "8-10", restSeconds: 90, order: 1 },
                  { name: "Standing Calf Raise", sets: 4, reps: "15-20", restSeconds: 45, order: 2 },
                ],
              },
            },
          ],
        },
      },
    });
  }

  console.log("Seed complete. Demo accounts (password: password123):");
  console.log("  alex@flextrack.dev");
  console.log("  sam@flextrack.dev");
  console.log(`Group invite code: ${group.inviteCode}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
