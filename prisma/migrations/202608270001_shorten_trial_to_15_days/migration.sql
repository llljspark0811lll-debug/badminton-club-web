-- Apply the 15-day policy only to free-trial clubs.
-- ACTIVE subscriptions and EXEMPT clubs must retain their existing end dates.
UPDATE "Club"
SET "subscriptionEnd" = "createdAt" + INTERVAL '15 days'
WHERE "subscriptionStatus" = 'TRIAL';
