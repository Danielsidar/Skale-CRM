-- -----------------------------------------------------------------------------
-- Dynamic Role Permissions (Admin-controlled)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.business_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  role public.business_role NOT NULL,
  resource TEXT NOT NULL, -- 'contacts', 'deals', 'pipelines', 'automations'
  action TEXT NOT NULL,   -- 'view_all', 'manage_all', 'edit'
  is_allowed BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE(business_id, role, resource, action)
);

-- Enable RLS
ALTER TABLE public.business_permissions ENABLE ROW LEVEL SECURITY;

-- Helper to check permission
CREATE OR REPLACE FUNCTION public.has_permission(p_business_id UUID, p_resource TEXT, p_action TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_role public.business_role;
BEGIN
  -- Admins always have all permissions
  SELECT role INTO v_role FROM public.business_users WHERE business_id = p_business_id AND user_id = auth.uid();
  IF v_role = 'admin' THEN
    RETURN TRUE;
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

-- -----------------------------------------------------------------------------
-- Update RLS Policies using dynamic permissions
-- -----------------------------------------------------------------------------

-- Contacts
DROP POLICY IF EXISTS "Admins and managers can manage all contacts" ON public.contacts;
DROP POLICY IF EXISTS "Agents can manage their own contacts" ON public.contacts;

CREATE POLICY "Dynamic contacts access"
  ON public.contacts FOR ALL
  USING (
    business_id IN (SELECT public.user_business_ids())
    AND (
      public.has_permission(business_id, 'contacts', 'manage_all')
      OR (owner_user_id = auth.uid() OR owner_user_id IS NULL)
    )
  )
  WITH CHECK (
    business_id IN (SELECT public.user_business_ids())
    AND (
      public.has_permission(business_id, 'contacts', 'manage_all')
      OR (owner_user_id = auth.uid() OR owner_user_id IS NULL)
    )
  );

-- Deals
DROP POLICY IF EXISTS "Admins and managers can manage all deals" ON public.deals;
DROP POLICY IF EXISTS "Agents can manage their own deals" ON public.deals;

CREATE POLICY "Dynamic deals access"
  ON public.deals FOR ALL
  USING (
    business_id IN (SELECT public.user_business_ids())
    AND (
      public.has_permission(business_id, 'deals', 'manage_all')
      OR (owner_user_id = auth.uid() OR owner_user_id IS NULL)
    )
  )
  WITH CHECK (
    business_id IN (SELECT public.user_business_ids())
    AND (
      public.has_permission(business_id, 'deals', 'manage_all')
      OR (owner_user_id = auth.uid() OR owner_user_id IS NULL)
    )
  );

-- Pipelines
DROP POLICY IF EXISTS "Users can view pipelines for own business" ON public.pipelines;
DROP POLICY IF EXISTS "Admins and managers can edit pipelines" ON public.pipelines;

CREATE POLICY "Dynamic pipelines view"
  ON public.pipelines FOR SELECT
  USING (business_id IN (SELECT public.user_business_ids()));

CREATE POLICY "Dynamic pipelines edit"
  ON public.pipelines FOR ALL
  USING (
    business_id IN (SELECT public.user_business_ids())
    AND public.has_permission(business_id, 'pipelines', 'edit')
  );

-- Default permissions for all businesses
INSERT INTO public.business_permissions (business_id, role, resource, action, is_allowed)
SELECT id, 'manager', 'contacts', 'manage_all', TRUE FROM public.businesses
ON CONFLICT DO NOTHING;

INSERT INTO public.business_permissions (business_id, role, resource, action, is_allowed)
SELECT id, 'manager', 'deals', 'manage_all', TRUE FROM public.businesses
ON CONFLICT DO NOTHING;

INSERT INTO public.business_permissions (business_id, role, resource, action, is_allowed)
SELECT id, 'manager', 'pipelines', 'edit', TRUE FROM public.businesses
ON CONFLICT DO NOTHING;

INSERT INTO public.business_permissions (business_id, role, resource, action, is_allowed)
SELECT id, 'agent', 'contacts', 'manage_all', FALSE FROM public.businesses
ON CONFLICT DO NOTHING;

INSERT INTO public.business_permissions (business_id, role, resource, action, is_allowed)
SELECT id, 'agent', 'deals', 'manage_all', FALSE FROM public.businesses
ON CONFLICT DO NOTHING;

-- Policies for the permissions table itself
CREATE POLICY "Admins can manage business_permissions"
  ON public.business_permissions FOR ALL
  USING (
    business_id IN (SELECT public.user_business_ids())
    AND (SELECT role FROM public.business_users WHERE business_id = business_permissions.business_id AND user_id = auth.uid()) = 'admin'
  );

CREATE POLICY "Everyone can view permissions for their business"
  ON public.business_permissions FOR SELECT
  USING (business_id IN (SELECT public.user_business_ids()));
