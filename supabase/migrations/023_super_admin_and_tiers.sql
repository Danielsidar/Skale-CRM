-- ============================================================
-- Migration 023: Super Admins + Tiers System
-- ============================================================

-- 1. Super Admins table
CREATE TABLE IF NOT EXISTS public.super_admins (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.super_admins ENABLE ROW LEVEL SECURITY;

-- Only the super admin themselves can see their own row
CREATE POLICY "super_admins_self_select" ON public.super_admins
  FOR SELECT USING (auth.uid() = user_id);

-- Seed: add danielsidar@gmail.com as super admin
INSERT INTO public.super_admins (user_id)
SELECT id FROM auth.users WHERE email = 'danielsidar@gmail.com'
ON CONFLICT (user_id) DO NOTHING;

-- ============================================================
-- 2. Tiers table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  features JSONB NOT NULL DEFAULT '{
    "mailing": false,
    "automations": false,
    "api_access": false,
    "booking": false,
    "whatsapp": false,
    "max_users": 3,
    "max_contacts": 500,
    "max_deals": 100,
    "max_pipelines": 1,
    "max_automations": 0,
    "max_mailing_lists": 0,
    "max_api_keys": 0
  }'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.tiers ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read tiers (needed for client-side limit checks)
CREATE POLICY "tiers_authenticated_select" ON public.tiers
  FOR SELECT USING (auth.role() = 'authenticated');

-- Only service role (super admin backend) can modify tiers
CREATE POLICY "tiers_service_role_all" ON public.tiers
  FOR ALL USING (auth.role() = 'service_role');

-- Trigger to auto-update updated_at
CREATE TRIGGER tiers_updated_at
  BEFORE UPDATE ON public.tiers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Seed default tiers
INSERT INTO public.tiers (name, description, price, sort_order, features) VALUES
(
  'Free',
  'מסלול חינמי לעסקים קטנים',
  0,
  0,
  '{
    "mailing": false,
    "automations": false,
    "api_access": false,
    "booking": true,
    "whatsapp": false,
    "max_users": 2,
    "max_contacts": 200,
    "max_deals": 50,
    "max_pipelines": 1,
    "max_automations": 0,
    "max_mailing_lists": 0,
    "max_api_keys": 0
  }'::jsonb
),
(
  'Pro',
  'לעסקים בצמיחה עם כלים מתקדמים',
  149,
  1,
  '{
    "mailing": true,
    "automations": true,
    "api_access": true,
    "booking": true,
    "whatsapp": true,
    "max_users": 10,
    "max_contacts": 5000,
    "max_deals": null,
    "max_pipelines": 5,
    "max_automations": 20,
    "max_mailing_lists": 10,
    "max_api_keys": 3
  }'::jsonb
),
(
  'Business',
  'לעסקים בינוניים עם צוותים גדולים',
  349,
  2,
  '{
    "mailing": true,
    "automations": true,
    "api_access": true,
    "booking": true,
    "whatsapp": true,
    "max_users": 50,
    "max_contacts": null,
    "max_deals": null,
    "max_pipelines": null,
    "max_automations": null,
    "max_mailing_lists": null,
    "max_api_keys": 10
  }'::jsonb
),
(
  'Enterprise',
  'ללא הגבלות — לחברות גדולות',
  null,
  3,
  '{
    "mailing": true,
    "automations": true,
    "api_access": true,
    "booking": true,
    "whatsapp": true,
    "max_users": null,
    "max_contacts": null,
    "max_deals": null,
    "max_pipelines": null,
    "max_automations": null,
    "max_mailing_lists": null,
    "max_api_keys": null
  }'::jsonb
);

-- ============================================================
-- 3. Link businesses to tiers
-- ============================================================

ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS tier_id UUID REFERENCES public.tiers(id) ON DELETE SET NULL;

-- Assign all existing businesses to the Free tier
UPDATE public.businesses
SET tier_id = (SELECT id FROM public.tiers WHERE name = 'Free' LIMIT 1)
WHERE tier_id IS NULL;
