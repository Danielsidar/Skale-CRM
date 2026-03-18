-- -----------------------------------------------------------------------------
-- Automation Folders
-- -----------------------------------------------------------------------------
CREATE TABLE automation_folders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_automation_folders_business ON automation_folders(business_id);

ALTER TABLE automations ADD COLUMN folder_id UUID REFERENCES automation_folders(id) ON DELETE SET NULL;
CREATE INDEX idx_automations_folder ON automations(folder_id);

-- RLS
ALTER TABLE automation_folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage automation_folders for own business"
  ON automation_folders FOR ALL
  USING (business_id IN (SELECT public.user_business_ids()))
  WITH CHECK (business_id IN (SELECT public.user_business_ids()));
