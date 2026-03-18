-- Helper function to get user role in a business
CREATE OR REPLACE FUNCTION public.get_user_role(p_business_id UUID)
RETURNS public.business_role AS $$
  SELECT role FROM public.business_users 
  WHERE business_id = p_business_id AND user_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Update Contacts Policies
DROP POLICY IF EXISTS "Users can manage contacts for own business" ON public.contacts;

CREATE POLICY "Admins and managers can manage all contacts"
  ON public.contacts FOR ALL
  USING (
    business_id IN (SELECT public.user_business_ids())
    AND (public.get_user_role(business_id) IN ('admin', 'manager'))
  );

CREATE POLICY "Agents can manage their own contacts"
  ON public.contacts FOR ALL
  USING (
    business_id IN (SELECT public.user_business_ids())
    AND public.get_user_role(business_id) = 'agent'
    AND (owner_user_id = auth.uid() OR owner_user_id IS NULL)
  );

-- Update Deals Policies
DROP POLICY IF EXISTS "Users can manage deals for own business" ON public.deals;

CREATE POLICY "Admins and managers can manage all deals"
  ON public.deals FOR ALL
  USING (
    business_id IN (SELECT public.user_business_ids())
    AND (public.get_user_role(business_id) IN ('admin', 'manager'))
  );

CREATE POLICY "Agents can manage their own deals"
  ON public.deals FOR ALL
  USING (
    business_id IN (SELECT public.user_business_ids())
    AND public.get_user_role(business_id) = 'agent'
    AND (owner_user_id = auth.uid() OR owner_user_id IS NULL)
  );

-- Update Pipelines/Stages - only Admin/Manager can edit
DROP POLICY IF EXISTS "Users can manage pipelines for own business" ON public.pipelines;
CREATE POLICY "Users can view pipelines for own business"
  ON public.pipelines FOR SELECT
  USING (business_id IN (SELECT public.user_business_ids()));

CREATE POLICY "Admins and managers can edit pipelines"
  ON public.pipelines FOR ALL
  USING (
    business_id IN (SELECT public.user_business_ids())
    AND (public.get_user_role(business_id) IN ('admin', 'manager'))
  );

DROP POLICY IF EXISTS "Users can manage stages for own business" ON public.stages;
CREATE POLICY "Users can view stages for own business"
  ON public.stages FOR SELECT
  USING (pipeline_id IN (SELECT id FROM public.pipelines WHERE business_id IN (SELECT public.user_business_ids())));

CREATE POLICY "Admins and managers can edit stages"
  ON public.stages FOR ALL
  USING (
    pipeline_id IN (SELECT id FROM public.pipelines WHERE business_id IN (SELECT public.user_business_ids()) AND (public.get_user_role(business_id) IN ('admin', 'manager')))
  );
