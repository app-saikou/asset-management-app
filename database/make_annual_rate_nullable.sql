-- Make annual_rate nullable in user_budget_periods table
-- This allows us to not save unnecessary data (0 values)

-- Step 1: Drop the NOT NULL constraint and default value
ALTER TABLE public.user_budget_periods
  ALTER COLUMN annual_rate DROP NOT NULL,
  ALTER COLUMN annual_rate DROP DEFAULT;

-- Step 2: Set existing 0 values to NULL (optional - keeps existing data clean)
UPDATE public.user_budget_periods
SET annual_rate = NULL
WHERE annual_rate = 0;

