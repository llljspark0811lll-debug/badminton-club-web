import "server-only";

export function getTossSecretKey() {
  const secretKey = process.env.TOSS_SECRET_KEY;

  if (!secretKey) {
    throw new Error("TOSS_SECRET_KEY is not configured.");
  }

  return secretKey;
}
