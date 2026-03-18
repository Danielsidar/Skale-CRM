-- --------------------------------------------------------------------------
-- 021: Granular settings sub-page permissions
-- --------------------------------------------------------------------------

INSERT INTO public.business_permissions (business_id, role, resource, action, is_allowed)
SELECT b.id, v.role::public.business_role, v.resource, v.action, v.is_allowed
FROM public.businesses b
CROSS JOIN (VALUES
  ('manager', 'settings', 'view_pipelines', true),
  ('manager', 'settings', 'view_automations', true),
  ('manager', 'settings', 'view_integrations', true),
  ('manager', 'settings', 'view_users', true),
  ('manager', 'settings', 'view_booking', true),
  ('agent', 'settings', 'view_pipelines', false),
  ('agent', 'settings', 'view_automations', false),
  ('agent', 'settings', 'view_integrations', false),
  ('agent', 'settings', 'view_users', false),
  ('agent', 'settings', 'view_booking', false)
) AS v(role, resource, action, is_allowed)
ON CONFLICT (business_id, role, resource, action) DO NOTHING;
