export const DEFAULT_TOSS_TEST_CLIENT_KEY =
  "test_ck_GePWvyJnrKvjpBgyP95OVgLzN97E";

export function getTossClientKey() {
  return (
    process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY ??
    DEFAULT_TOSS_TEST_CLIENT_KEY
  );
}

export function getPaymentMode() {
  return process.env.NEXT_PUBLIC_TOSS_ENV === "live"
    ? "live"
    : "test";
}

export function getSubscriptionAmount() {
  const rawAmount =
    process.env.NEXT_PUBLIC_SUBSCRIPTION_AMOUNT ?? "9900";
  const parsed = Number(rawAmount);

  return Number.isFinite(parsed) ? parsed : 9900;
}
