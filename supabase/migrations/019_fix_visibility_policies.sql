-- --------------------------------------------------------------------------
-- 019: Fix data visibility policies
-- --------------------------------------------------------------------------
-- 1. Drop the permissive SELECT policies that bypassed ownership checks.
-- 2. Recreate the ALL policies WITHOUT the "owner_user_id IS NULL" fallback
--    so that when manage_all is OFF, users see ONLY their own rows.

DROP POLICY IF EXISTS "View all deals in business" ON public.deals;
DROP POLICY IF EXISTS "View all contacts in business" ON public.contacts;

DROP POLICY IF EXISTS "Manage deals based on permissions" ON public.deals;
DROP POLICY IF EXISTS "Manage contacts based on permissions" ON public.contacts;

CREATE POLICY "Manage deals based on permissions" ON public.deals FOR ALL
  USING (
    business_id IN (SELECT business_id FROM public.business_users WHERE user_id = auth.uid())
    AND (
      has_permission(business_id, 'deals', 'manage_all')
      OR owner_user_id = auth.uid()
    )
  )
  WITH CHECK (
    business_id IN (SELECT business_id FROM public.business_users WHERE user_id = auth.uid())
    AND (
      has_permission(business_id, 'deals', 'manage_all')
      OR owner_user_id = auth.uid()
    )
  );

CREATE POLICY "Manage contacts based on permissions" ON public.contacts FOR ALL
  USING (
    business_id IN (SELECT business_id FROM public.business_users WHERE user_id = auth.uid())
    AND (
      has_permission(business_id, 'contacts', 'manage_all')
      OR owner_user_id = auth.uid()
    )
  )
  WITH CHECK (
    business_id IN (SELECT business_id FROM public.business_users WHERE user_id = auth.uid())
    AND (
      has_permission(business_id, 'contacts', 'manage_all')
      OR owner_user_id = auth.uid()
    )
  );
