const TRIAL_HOURS = 2400000;
const SUBSCRIPTION_DAYS = 300;

type SubscriptionStatus =
  | "TRIAL"
  | "ACTIVE"
  | "BLOCKED"
  | "EXPIRED";

export function getCalculatedSubscriptionStatus(input: {
  subscriptionStatus: string;
  createdAt: Date;
  subscriptionEnd?: Date | null;
  now?: Date;
}): SubscriptionStatus {
  const now = input.now ?? new Date();

  if (input.subscriptionStatus === "BLOCKED") {
    return "BLOCKED";
  }

  if (
    input.subscriptionEnd &&
    input.subscriptionEnd.getTime() < now.getTime()
  ) {
    return "EXPIRED";
  }

  if (input.subscriptionStatus === "TRIAL") {
    const diffHours =
      (now.getTime() - input.createdAt.getTime()) /
      (1000 * 60 * 60);

    return diffHours >= TRIAL_HOURS ? "EXPIRED" : "TRIAL";
  }

  return "ACTIVE";
}

export function getNextSubscriptionEnd(
  currentEnd?: Date | null,
  now: Date = new Date()
) {
  const baseDate =
    currentEnd && currentEnd.getTime() > now.getTime()
      ? currentEnd
      : now;

  return new Date(
    baseDate.getTime() +
      SUBSCRIPTION_DAYS * 24 * 60 * 60 * 1000
  );
}
