-- =============================================================================
-- Core CRM schema: multi-tenant businesses, pipelines, stages, deals, contacts,
-- activities, automations. Legacy tables renamed to _legacy.
-- =============================================================================

-- Rename legacy tables if they exist (keep for reference; new app uses new tables)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'lead_activities') THEN
    ALTER TABLE lead_activities RENAME TO lead_activities_legacy;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'leads') THEN
    ALTER TABLE leads RENAME TO leads_legacy;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'pipelines') THEN
    ALTER TABLE pipelines RENAME TO pipelines_legacy;
  END IF;
END $$;

-- Role for business membership
CREATE TYPE business_role AS ENUM ('admin', 'manager', 'agent');

-- -----------------------------------------------------------------------------
-- Businesses (tenant root)
-- -----------------------------------------------------------------------------
CREATE TABLE businesses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER update_businesses_updated_at
  BEFORE UPDATE ON businesses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- -----------------------------------------------------------------------------
-- Business users (user <-> business with role)
-- -----------------------------------------------------------------------------
CREATE TABLE business_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role business_role NOT NULL DEFAULT 'agent',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(business_id, user_id)
);

CREATE INDEX idx_business_users_business ON business_users(business_id);
CREATE INDEX idx_business_users_user ON business_users(user_id);

-- -----------------------------------------------------------------------------
-- RLS helper: returns set of business_ids the current user is a member of
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.user_business_ids()
RETURNS SETOF UUID AS $$
  SELECT business_id FROM public.business_users WHERE user_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- -----------------------------------------------------------------------------
-- Pipelines (per business)
-- -----------------------------------------------------------------------------
CREATE TABLE pipelines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pipelines_business ON pipelines(business_id);
CREATE TRIGGER update_pipelines_updated_at
  BEFORE UPDATE ON pipelines FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- -----------------------------------------------------------------------------
-- Stages (ordered columns in a pipeline)
-- -----------------------------------------------------------------------------
CREATE TABLE stages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pipeline_id UUID NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  position INT NOT NULL DEFAULT 0,
  color TEXT,
  probability INT,
  is_won BOOLEAN NOT NULL DEFAULT FALSE,
  is_lost BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_stages_pipeline ON stages(pipeline_id);
CREATE TRIGGER update_stages_updated_at
  BEFORE UPDATE ON stages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- -----------------------------------------------------------------------------
-- Companies (optional, per business)
-- -----------------------------------------------------------------------------
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_companies_business ON companies(business_id);
CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON companies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- -----------------------------------------------------------------------------
-- Contacts (lead/person, per business)
-- -----------------------------------------------------------------------------
CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  tags TEXT[] DEFAULT '{}',
  source TEXT,
  owner_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  custom_fields JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_contacts_business ON contacts(business_id);
CREATE INDEX idx_contacts_company ON contacts(company_id);
CREATE INDEX idx_contacts_owner ON contacts(owner_user_id);
CREATE INDEX idx_contacts_email ON contacts(business_id, LOWER(email)) WHERE email IS NOT NULL AND email != '';
CREATE INDEX idx_contacts_phone ON contacts(business_id, phone) WHERE phone IS NOT NULL AND phone != '';
CREATE TRIGGER update_contacts_updated_at
  BEFORE UPDATE ON contacts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- -----------------------------------------------------------------------------
-- Deals (opportunity: one pipeline, one stage)
-- -----------------------------------------------------------------------------
CREATE TABLE deals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  pipeline_id UUID NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,
  stage_id UUID NOT NULL REFERENCES stages(id) ON DELETE RESTRICT,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  owner_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  value DECIMAL(12,2) DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  source TEXT,
  lost_reason TEXT,
  custom_fields JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT deals_stage_in_pipeline CHECK (
    EXISTS (SELECT 1 FROM stages s WHERE s.id = stage_id AND s.pipeline_id = deals.pipeline_id)
  )
);

CREATE INDEX idx_deals_business ON deals(business_id);
CREATE INDEX idx_deals_pipeline ON deals(pipeline_id);
CREATE INDEX idx_deals_stage ON deals(stage_id);
CREATE INDEX idx_deals_contact ON deals(contact_id);
CREATE INDEX idx_deals_owner ON deals(owner_user_id);
CREATE TRIGGER update_deals_updated_at
  BEFORE UPDATE ON deals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- -----------------------------------------------------------------------------
-- Deal stage history (audit timeline)
-- -----------------------------------------------------------------------------
CREATE TABLE deal_stage_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  old_stage_id UUID REFERENCES stages(id) ON DELETE SET NULL,
  new_stage_id UUID NOT NULL REFERENCES stages(id) ON DELETE RESTRICT,
  changed_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  lost_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_deal_stage_history_deal ON deal_stage_history(deal_id);

-- -----------------------------------------------------------------------------
-- Activities (unified: note, call, meeting, task, message)
-- -----------------------------------------------------------------------------
CREATE TYPE activity_type AS ENUM ('note', 'call', 'meeting', 'task', 'message', 'email');
CREATE TYPE task_status AS ENUM ('open', 'done');

CREATE TABLE activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  type activity_type NOT NULL,
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,
  created_by_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  due_date TIMESTAMPTZ,
  task_status task_status DEFAULT 'open',
  assignee_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT activities_contact_or_deal CHECK (contact_id IS NOT NULL OR deal_id IS NOT NULL)
);

CREATE INDEX idx_activities_business ON activities(business_id);
CREATE INDEX idx_activities_contact ON activities(contact_id);
CREATE INDEX idx_activities_deal ON activities(deal_id);
CREATE INDEX idx_activities_created_by ON activities(created_by_user_id);
CREATE INDEX idx_activities_due_date ON activities(due_date) WHERE due_date IS NOT NULL;
CREATE TRIGGER update_activities_updated_at
  BEFORE UPDATE ON activities FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- -----------------------------------------------------------------------------
-- Custom field definitions (per business, for contacts and deals)
-- -----------------------------------------------------------------------------
CREATE TYPE custom_field_entity AS ENUM ('contact', 'deal');
CREATE TYPE custom_field_kind AS ENUM ('text', 'number', 'date', 'select', 'checkbox');

CREATE TABLE custom_fields (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  entity custom_field_entity NOT NULL,
  name TEXT NOT NULL,
  kind custom_field_kind NOT NULL DEFAULT 'text',
  options JSONB DEFAULT '[]'::jsonb,
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(business_id, entity, name)
);

CREATE INDEX idx_custom_fields_business ON custom_fields(business_id);

-- -----------------------------------------------------------------------------
-- Automation rules (trigger -> conditions -> actions)
-- -----------------------------------------------------------------------------
CREATE TABLE automation_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  trigger_type TEXT NOT NULL,
  trigger_config JSONB DEFAULT '{}'::jsonb,
  conditions JSONB DEFAULT '[]'::jsonb,
  actions JSONB NOT NULL DEFAULT '[]'::jsonb,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_automation_rules_business ON automation_rules(business_id);
CREATE TRIGGER update_automation_rules_updated_at
  BEFORE UPDATE ON automation_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- -----------------------------------------------------------------------------
-- Automation run log (execution history)
-- -----------------------------------------------------------------------------
CREATE TABLE automation_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  automation_rule_id UUID NOT NULL REFERENCES automation_rules(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'success',
  result JSONB DEFAULT '{}'::jsonb,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_automation_runs_rule ON automation_runs(automation_rule_id);
CREATE INDEX idx_automation_runs_entity ON automation_runs(entity_type, entity_id);

-- =============================================================================
-- Row Level Security (all tables scoped by business_id via business_users)
-- =============================================================================

ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_stage_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_runs ENABLE ROW LEVEL SECURITY;

-- Businesses: user can see businesses they belong to
CREATE POLICY "Users can view own businesses"
  ON businesses FOR SELECT
  USING (id IN (SELECT public.user_business_ids()));

CREATE POLICY "Users can update own businesses"
  ON businesses FOR UPDATE
  USING (id IN (SELECT public.user_business_ids()));

-- Business users: members can view/insert/update within their business (admin manages)
CREATE POLICY "Users can view business_users for own businesses"
  ON business_users FOR SELECT
  USING (business_id IN (SELECT public.user_business_ids()));

CREATE POLICY "Admins can insert business_users"
  ON business_users FOR INSERT
  WITH CHECK (
    business_id IN (SELECT public.user_business_ids())
    AND EXISTS (SELECT 1 FROM business_users bu WHERE bu.business_id = business_users.business_id AND bu.user_id = auth.uid() AND bu.role = 'admin')
  );

CREATE POLICY "User can add self as first member of business"
  ON business_users FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND NOT EXISTS (SELECT 1 FROM business_users b WHERE b.business_id = business_users.business_id)
  );

CREATE POLICY "Admins can update business_users"
  ON business_users FOR UPDATE
  USING (business_id IN (SELECT public.user_business_ids()));

CREATE POLICY "Admins can delete business_users"
  ON business_users FOR DELETE
  USING (business_id IN (SELECT public.user_business_ids()));

-- Pipelines
CREATE POLICY "Users can manage pipelines for own business"
  ON pipelines FOR ALL
  USING (business_id IN (SELECT public.user_business_ids()))
  WITH CHECK (business_id IN (SELECT public.user_business_ids()));

-- Stages (access via pipeline's business_id)
CREATE POLICY "Users can manage stages for own business"
  ON stages FOR ALL
  USING (
    pipeline_id IN (SELECT id FROM pipelines WHERE business_id IN (SELECT public.user_business_ids()))
  )
  WITH CHECK (
    pipeline_id IN (SELECT id FROM pipelines WHERE business_id IN (SELECT public.user_business_ids()))
  );

-- Companies
CREATE POLICY "Users can manage companies for own business"
  ON companies FOR ALL
  USING (business_id IN (SELECT public.user_business_ids()))
  WITH CHECK (business_id IN (SELECT public.user_business_ids()));

-- Contacts
CREATE POLICY "Users can manage contacts for own business"
  ON contacts FOR ALL
  USING (business_id IN (SELECT public.user_business_ids()))
  WITH CHECK (business_id IN (SELECT public.user_business_ids()));

-- Deals
CREATE POLICY "Users can manage deals for own business"
  ON deals FOR ALL
  USING (business_id IN (SELECT public.user_business_ids()))
  WITH CHECK (business_id IN (SELECT public.user_business_ids()));

-- Deal stage history (via deal -> business)
CREATE POLICY "Users can view deal_stage_history for own business"
  ON deal_stage_history FOR SELECT
  USING (
    deal_id IN (SELECT id FROM deals WHERE business_id IN (SELECT public.user_business_ids()))
  );

CREATE POLICY "Users can insert deal_stage_history for own business"
  ON deal_stage_history FOR INSERT
  WITH CHECK (
    deal_id IN (SELECT id FROM deals WHERE business_id IN (SELECT public.user_business_ids()))
  );

-- Activities
CREATE POLICY "Users can manage activities for own business"
  ON activities FOR ALL
  USING (business_id IN (SELECT public.user_business_ids()))
  WITH CHECK (business_id IN (SELECT public.user_business_ids()));

-- Custom fields
CREATE POLICY "Users can manage custom_fields for own business"
  ON custom_fields FOR ALL
  USING (business_id IN (SELECT public.user_business_ids()))
  WITH CHECK (business_id IN (SELECT public.user_business_ids()));

-- Automation rules
CREATE POLICY "Users can manage automation_rules for own business"
  ON automation_rules FOR ALL
  USING (business_id IN (SELECT public.user_business_ids()))
  WITH CHECK (business_id IN (SELECT public.user_business_ids()));

-- Automation runs (read/insert; no update/delete needed)
CREATE POLICY "Users can view automation_runs for own business"
  ON automation_runs FOR SELECT
  USING (
    automation_rule_id IN (SELECT id FROM automation_rules WHERE business_id IN (SELECT public.user_business_ids()))
  );

CREATE POLICY "Users can insert automation_runs for own business"
  ON automation_runs FOR INSERT
  WITH CHECK (
    automation_rule_id IN (SELECT id FROM automation_rules WHERE business_id IN (SELECT public.user_business_ids()))
  );

-- Allow authenticated users to create a business (e.g. on signup)
CREATE POLICY "Authenticated users can insert business"
  ON businesses FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- -----------------------------------------------------------------------------
-- Default pipeline + stages when a business is created
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION create_default_pipeline_for_business()
RETURNS TRIGGER AS $$
DECLARE
  new_pipeline_id UUID;
BEGIN
  INSERT INTO pipelines (business_id, name, description)
  VALUES (NEW.id, 'Sales', 'Default sales pipeline')
  RETURNING id INTO new_pipeline_id;

  INSERT INTO stages (pipeline_id, name, position, color, probability, is_won, is_lost) VALUES
    (new_pipeline_id, 'New Lead',        0, '#94a3b8', 10,  FALSE, FALSE),
    (new_pipeline_id, 'Contacted',      1, '#60a5fa', 20,  FALSE, FALSE),
    (new_pipeline_id, 'Qualified',      2, '#38bdf8', 40,  FALSE, FALSE),
    (new_pipeline_id, 'Proposal Sent',  3, '#22d3ee', 60,  FALSE, FALSE),
    (new_pipeline_id, 'Negotiation',    4, '#2dd4bf', 80,  FALSE, FALSE),
    (new_pipeline_id, 'Won',            5, '#34d399', 100, TRUE,  FALSE),
    (new_pipeline_id, 'Lost',           6, '#f87171', 0,   FALSE, TRUE);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_business_created_create_default_pipeline
  AFTER INSERT ON businesses
  FOR EACH ROW EXECUTE FUNCTION create_default_pipeline_for_business();
