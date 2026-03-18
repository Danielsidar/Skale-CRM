-- =============================================================================
-- Automation Builder: graph-based workflows (automations, nodes, edges, runs)
-- Renames legacy automation_runs to automation_rule_runs; adds new tables.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Rename legacy automation_runs so we can use automation_runs for new engine
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view automation_runs for own business" ON automation_runs;
DROP POLICY IF EXISTS "Users can insert automation_runs for own business" ON automation_runs;
ALTER TABLE automation_runs RENAME TO automation_rule_runs;
ALTER INDEX IF EXISTS idx_automation_runs_rule RENAME TO idx_automation_rule_runs_rule;
ALTER INDEX IF EXISTS idx_automation_runs_entity RENAME TO idx_automation_rule_runs_entity;

CREATE POLICY "Users can view automation_rule_runs for own business"
  ON automation_rule_runs FOR SELECT
  USING (
    automation_rule_id IN (SELECT id FROM automation_rules WHERE business_id IN (SELECT public.user_business_ids()))
  );
CREATE POLICY "Users can insert automation_rule_runs for own business"
  ON automation_rule_runs FOR INSERT
  WITH CHECK (
    automation_rule_id IN (SELECT id FROM automation_rules WHERE business_id IN (SELECT public.user_business_ids()))
  );

-- -----------------------------------------------------------------------------
-- Automations (workflow metadata)
-- -----------------------------------------------------------------------------
CREATE TABLE automations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused')),
  version INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_automations_business ON automations(business_id);
CREATE INDEX idx_automations_status ON automations(business_id, status);
CREATE TRIGGER update_automations_updated_at
  BEFORE UPDATE ON automations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- -----------------------------------------------------------------------------
-- Automation nodes (trigger, condition, action)
-- -----------------------------------------------------------------------------
CREATE TABLE automation_nodes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  automation_id UUID NOT NULL REFERENCES automations(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('trigger', 'condition', 'action')),
  subtype TEXT NOT NULL,
  config JSONB DEFAULT '{}'::jsonb,
  position_x DOUBLE PRECISION NOT NULL DEFAULT 0,
  position_y DOUBLE PRECISION NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_automation_nodes_automation ON automation_nodes(automation_id);

-- -----------------------------------------------------------------------------
-- Automation edges (connections; branch_label for condition true/false)
-- -----------------------------------------------------------------------------
CREATE TABLE automation_edges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  automation_id UUID NOT NULL REFERENCES automations(id) ON DELETE CASCADE,
  from_node_id UUID NOT NULL REFERENCES automation_nodes(id) ON DELETE CASCADE,
  to_node_id UUID NOT NULL REFERENCES automation_nodes(id) ON DELETE CASCADE,
  branch_label TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_automation_edges_unique ON automation_edges (automation_id, from_node_id, to_node_id, COALESCE(branch_label, ''));
CREATE INDEX idx_automation_edges_automation ON automation_edges(automation_id);
CREATE INDEX idx_automation_edges_from ON automation_edges(from_node_id);
CREATE INDEX idx_automation_edges_to ON automation_edges(to_node_id);

-- -----------------------------------------------------------------------------
-- Automation runs (execution log per trigger)
-- -----------------------------------------------------------------------------
CREATE TABLE automation_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  automation_id UUID NOT NULL REFERENCES automations(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
  parent_run_id UUID REFERENCES automation_runs(id) ON DELETE SET NULL,
  execution_depth INT NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  finished_at TIMESTAMPTZ
);

CREATE INDEX idx_automation_runs_automation ON automation_runs(automation_id);
CREATE INDEX idx_automation_runs_business ON automation_runs(business_id);
CREATE INDEX idx_automation_runs_entity ON automation_runs(entity_type, entity_id);
CREATE INDEX idx_automation_runs_started ON automation_runs(started_at DESC);

-- -----------------------------------------------------------------------------
-- Automation run steps (per-node execution log)
-- -----------------------------------------------------------------------------
CREATE TABLE automation_run_steps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  automation_run_id UUID NOT NULL REFERENCES automation_runs(id) ON DELETE CASCADE,
  node_id UUID NOT NULL REFERENCES automation_nodes(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'skipped')),
  input_payload JSONB DEFAULT '{}'::jsonb,
  output_payload JSONB DEFAULT '{}'::jsonb,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_automation_run_steps_run ON automation_run_steps(automation_run_id);

-- =============================================================================
-- RLS for new automation builder tables
-- =============================================================================
ALTER TABLE automations ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_edges ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_run_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage automations for own business"
  ON automations FOR ALL
  USING (business_id IN (SELECT public.user_business_ids()))
  WITH CHECK (business_id IN (SELECT public.user_business_ids()));

CREATE POLICY "Users can manage automation_nodes for own business"
  ON automation_nodes FOR ALL
  USING (
    automation_id IN (SELECT id FROM automations WHERE business_id IN (SELECT public.user_business_ids()))
  )
  WITH CHECK (
    automation_id IN (SELECT id FROM automations WHERE business_id IN (SELECT public.user_business_ids()))
  );

CREATE POLICY "Users can manage automation_edges for own business"
  ON automation_edges FOR ALL
  USING (
    automation_id IN (SELECT id FROM automations WHERE business_id IN (SELECT public.user_business_ids()))
  )
  WITH CHECK (
    automation_id IN (SELECT id FROM automations WHERE business_id IN (SELECT public.user_business_ids()))
  );

CREATE POLICY "Users can view automation_runs for own business"
  ON automation_runs FOR SELECT
  USING (business_id IN (SELECT public.user_business_ids()));

CREATE POLICY "Users can insert automation_runs for own business"
  ON automation_runs FOR INSERT
  WITH CHECK (business_id IN (SELECT public.user_business_ids()));

CREATE POLICY "Users can update automation_runs for own business"
  ON automation_runs FOR UPDATE
  USING (business_id IN (SELECT public.user_business_ids()));

CREATE POLICY "Users can view automation_run_steps for own business"
  ON automation_run_steps FOR SELECT
  USING (
    automation_run_id IN (SELECT id FROM automation_runs WHERE business_id IN (SELECT public.user_business_ids()))
  );

CREATE POLICY "Users can insert automation_run_steps for own business"
  ON automation_run_steps FOR INSERT
  WITH CHECK (
    automation_run_id IN (SELECT id FROM automation_runs WHERE business_id IN (SELECT public.user_business_ids()))
  );
