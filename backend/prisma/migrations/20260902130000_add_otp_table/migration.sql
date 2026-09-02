-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "OtpType" AS ENUM ('LOGIN_2FA');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "Otp" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "type" "OtpType" NOT NULL DEFAULT 'LOGIN_2FA',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Otp_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Otp_userId_idx" ON "Otp"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Otp_expiresAt_idx" ON "Otp"("expiresAt");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "Otp" ADD CONSTRAINT "Otp_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
