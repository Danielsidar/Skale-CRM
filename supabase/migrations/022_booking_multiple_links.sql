-- Allow multiple booking links per user (drop unique constraint on business_id, user_id)
ALTER TABLE booking_settings DROP CONSTRAINT IF EXISTS booking_settings_business_id_user_id_key;

-- Add pipeline/stage columns for auto-deal creation
ALTER TABLE booking_settings ADD COLUMN IF NOT EXISTS pipeline_id UUID REFERENCES pipelines(id) ON DELETE SET NULL;
ALTER TABLE booking_settings ADD COLUMN IF NOT EXISTS stage_id UUID REFERENCES stages(id) ON DELETE SET NULL;
