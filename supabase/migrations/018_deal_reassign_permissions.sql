-- ---------------------------------------------------------------------------
-- 018: Granular permissions + reassignment protection
-- ---------------------------------------------------------------------------

-- 1. Seed reassign + granular permissions for all businesses
INSERT INTO public.business_permissions (business_id, role, resource, action, is_allowed)
SELECT b.id, v.role::public.business_role, v.resource, v.action, v.is_allowed
FROM public.businesses b
CROSS JOIN (VALUES
  -- Manager: deals
  ('manager', 'deals', 'reassign', true),
  ('manager', 'deals', 'create', true),
  ('manager', 'deals', 'edit', true),
  ('manager', 'deals', 'delete', true),
  ('manager', 'deals', 'move_stage', true),
  ('manager', 'deals', 'export', true),
  -- Manager: contacts
  ('manager', 'contacts', 'reassign', true),
  ('manager', 'contacts', 'create', true),
  ('manager', 'contacts', 'edit', true),
  ('manager', 'contacts', 'delete', true),
  ('manager', 'contacts', 'export', true),
  -- Manager: system
  ('manager', 'automations', 'edit', true),
  ('manager', 'mailing', 'send', true),
  -- Manager: pages
  ('manager', 'pages', 'view_calendar', true),
  ('manager', 'pages', 'view_products', true),
  ('manager', 'pages', 'view_customers', true),
  ('manager', 'pages', 'view_api', true),
  -- Agent: deals
  ('agent', 'deals', 'reassign', false),
  ('agent', 'deals', 'create', true),
  ('agent', 'deals', 'edit', true),
  ('agent', 'deals', 'delete', false),
  ('agent', 'deals', 'move_stage', true),
  ('agent', 'deals', 'export', false),
  -- Agent: contacts
  ('agent', 'contacts', 'reassign', false),
  ('agent', 'contacts', 'create', true),
  ('agent', 'contacts', 'edit', true),
  ('agent', 'contacts', 'delete', false),
  ('agent', 'contacts', 'export', false),
  -- Agent: system
  ('agent', 'automations', 'edit', false),
  ('agent', 'mailing', 'send', false),
  -- Agent: pages
  ('agent', 'pages', 'view_calendar', true),
  ('agent', 'pages', 'view_products', false),
  ('agent', 'pages', 'view_customers', false),
  ('agent', 'pages', 'view_api', false)
) AS v(role, resource, action, is_allowed)
ON CONFLICT (business_id, role, resource, action) DO NOTHING;

-- 2. Trigger function: block unauthorised owner_user_id changes
CREATE OR REPLACE FUNCTION public.prevent_unauthorized_reassign()
RETURNS TRIGGER AS $$
BEGIN
  -- Service-role calls (automations, edge functions) bypass the check
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF OLD.owner_user_id IS DISTINCT FROM NEW.owner_user_id THEN
    IF NOT public.has_permission(NEW.business_id, TG_TABLE_NAME, 'reassign') THEN
      RAISE EXCEPTION 'אין לך הרשאה לשנות שיוך';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Attach trigger to deals
DROP TRIGGER IF EXISTS trg_prevent_deal_reassign ON public.deals;
CREATE TRIGGER trg_prevent_deal_reassign
  BEFORE UPDATE ON public.deals
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_unauthorized_reassign();

-- 4. Attach trigger to contacts
DROP TRIGGER IF EXISTS trg_prevent_contact_reassign ON public.contacts;
CREATE TRIGGER trg_prevent_contact_reassign
  BEFORE UPDATE ON public.contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_unauthorized_reassign();
