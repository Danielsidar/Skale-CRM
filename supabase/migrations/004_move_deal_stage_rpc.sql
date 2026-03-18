-- Atomic move deal to a new stage: update deal + insert deal_stage_history.
-- Caller must be a member of the deal's business (RLS on deals applies to the update).
CREATE OR REPLACE FUNCTION public.move_deal_stage(
  p_deal_id UUID,
  p_new_stage_id UUID,
  p_changed_by_user_id UUID,
  p_lost_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deal deals%ROWTYPE;
  v_old_stage_id UUID;
  v_business_id UUID;
BEGIN
  SELECT id, stage_id, business_id INTO v_deal.id, v_old_stage_id, v_business_id
  FROM deals
  WHERE id = p_deal_id;

  IF v_deal.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'deal_not_found');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.business_users WHERE business_id = v_business_id AND user_id = p_changed_by_user_id) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM stages WHERE id = p_new_stage_id AND pipeline_id = (SELECT pipeline_id FROM deals WHERE id = p_deal_id)) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'stage_not_in_pipeline');
  END IF;

  UPDATE deals
  SET stage_id = p_new_stage_id,
      lost_reason = COALESCE(p_lost_reason, lost_reason),
      updated_at = NOW()
  WHERE id = p_deal_id;

  INSERT INTO deal_stage_history (deal_id, old_stage_id, new_stage_id, changed_by_user_id, lost_reason)
  VALUES (p_deal_id, v_old_stage_id, p_new_stage_id, p_changed_by_user_id, p_lost_reason);

  SELECT * INTO v_deal FROM deals WHERE id = p_deal_id;

  RETURN jsonb_build_object(
    'ok', true,
    'deal_id', v_deal.id,
    'stage_id', v_deal.stage_id,
    'old_stage_id', v_old_stage_id
  );
END;
$$;
