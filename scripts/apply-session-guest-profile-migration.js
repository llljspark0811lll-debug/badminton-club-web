const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "public"."SessionParticipant"
    ADD COLUMN IF NOT EXISTS "guestAge" INTEGER,
    ADD COLUMN IF NOT EXISTS "guestGender" TEXT,
    ADD COLUMN IF NOT EXISTS "guestLevel" TEXT;
  `);

  console.log("Applied guest profile columns to SessionParticipant.");
}

main()
  .catch((error) => {
    console.error("Failed to apply guest profile columns.", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
