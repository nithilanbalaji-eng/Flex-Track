-- AlterTable
ALTER TABLE "GymLog" ADD COLUMN     "planDayId" TEXT,
ADD COLUMN     "planId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isPremium" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "premiumUntil" TIMESTAMP(3),
ADD COLUMN     "subscriptionId" TEXT,
ADD COLUMN     "subscriptionStore" TEXT;

-- AlterTable
ALTER TABLE "WorkoutDay" ADD COLUMN     "targetMinutes" INTEGER;

-- AddForeignKey
ALTER TABLE "GymLog" ADD CONSTRAINT "GymLog_planId_fkey" FOREIGN KEY ("planId") REFERENCES "WorkoutPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymLog" ADD CONSTRAINT "GymLog_planDayId_fkey" FOREIGN KEY ("planDayId") REFERENCES "WorkoutDay"("id") ON DELETE SET NULL ON UPDATE CASCADE;
