-- --------------------------------------------------------------------------
-- 020: User-level permission overrides + display permissions
-- --------------------------------------------------------------------------

-- 1. User permission overrides table
CREATE TABLE IF NOT EXISTS public.user_permission_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  resource TEXT NOT NULL,
  action TEXT NOT NULL,
  is_allowed BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(business_id, user_id, resource, action)
);

ALTER TABLE public.user_permission_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage user_permission_overrides"
  ON public.user_permission_overrides FOR ALL
  USING (
    business_id IN (SELECT business_id FROM public.business_users WHERE user_id = auth.uid())
    AND (SELECT role FROM public.business_users WHERE business_id = user_permission_overrides.business_id AND user_id = auth.uid()) = 'admin'
  );

CREATE POLICY "Users can view own overrides"
  ON public.user_permission_overrides FOR SELECT
  USING (
    business_id IN (SELECT business_id FROM public.business_users WHERE user_id = auth.uid())
  );

-- 2. Update has_permission to check user overrides first
CREATE OR REPLACE FUNCTION public.has_permission(p_business_id UUID, p_resource TEXT, p_action TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_role public.business_role;
  v_user_override BOOLEAN;
BEGIN
  SELECT role INTO v_role FROM public.business_users WHERE business_id = p_business_id AND user_id = auth.uid();
  IF v_role = 'admin' THEN
    RETURN TRUE;
  END IF;

  SELECT is_allowed INTO v_user_override
  FROM public.user_permission_overrides
  WHERE business_id = p_business_id
    AND user_id = auth.uid()
    AND resource = p_resource
    AND action = p_action;

  IF v_user_override IS NOT NULL THEN
    RETURN v_user_override;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.business_permissions
    WHERE business_id = p_business_id
    AND role = v_role
    AND resource = p_resource
    AND action = p_action
    AND is_allowed = TRUE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 3. Seed display permissions
INSERT INTO public.business_permissions (business_id, role, resource, action, is_allowed)
SELECT b.id, v.role::public.business_role, v.resource, v.action, v.is_allowed
FROM public.businesses b
CROSS JOIN (VALUES
  ('manager', 'deals', 'view_value', true),
  ('manager', 'deals', 'view_source', true),
  ('manager', 'deals', 'view_reports', true),
  ('manager', 'contacts', 'view_phone', true),
  ('manager', 'contacts', 'view_email', true),
  ('manager', 'contacts', 'view_source', true),
  ('agent', 'deals', 'view_value', false),
  ('agent', 'deals', 'view_source', false),
  ('agent', 'deals', 'view_reports', false),
  ('agent', 'contacts', 'view_phone', true),
  ('agent', 'contacts', 'view_email', true),
  ('agent', 'contacts', 'view_source', false)
) AS v(role, resource, action, is_allowed)
ON CONFLICT (business_id, role, resource, action) DO NOTHING;
