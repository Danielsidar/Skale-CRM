-- Simple vs canvas automation editor: list badge, routing, and "convert to complex"
ALTER TABLE public.automations
  ADD COLUMN IF NOT EXISTS is_simple boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.automations.is_simple IS 'True: trigger+action simple editor; false: canvas builder';
