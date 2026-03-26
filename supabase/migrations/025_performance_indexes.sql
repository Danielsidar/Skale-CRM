-- Performance optimization indexes
-- These indexes speed up the most common filtered queries in the CRM

-- Deals table (most queried table, supports leads page, kanban, dashboard)
CREATE INDEX IF NOT EXISTS idx_deals_business_id ON deals(business_id);
CREATE INDEX IF NOT EXISTS idx_deals_pipeline_id ON deals(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_deals_stage_id ON deals(stage_id);
CREATE INDEX IF NOT EXISTS idx_deals_contact_id ON deals(contact_id);
CREATE INDEX IF NOT EXISTS idx_deals_owner_user_id ON deals(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_deals_created_at ON deals(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_deals_updated_at ON deals(updated_at DESC);
-- Composite index for the most common query pattern: business + sort by date
CREATE INDEX IF NOT EXISTS idx_deals_business_created ON deals(business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_deals_business_stage ON deals(business_id, stage_id);
CREATE INDEX IF NOT EXISTS idx_deals_business_pipeline ON deals(business_id, pipeline_id);

-- Contacts table (supports contacts page + related contact lookups)
CREATE INDEX IF NOT EXISTS idx_contacts_business_id ON contacts(business_id);
CREATE INDEX IF NOT EXISTS idx_contacts_owner_user_id ON contacts(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_contacts_updated_at ON contacts(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_contacts_business_updated ON contacts(business_id, updated_at DESC);
-- Full-text search support on email and phone for dedup queries
CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_phone ON contacts(phone) WHERE phone IS NOT NULL;

-- Stages table (used in almost every leads/pipeline query)
CREATE INDEX IF NOT EXISTS idx_stages_pipeline_id ON stages(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_stages_pipeline_position ON stages(pipeline_id, position);

-- Pipelines table
CREATE INDEX IF NOT EXISTS idx_pipelines_business_id ON pipelines(business_id);

-- Activities table (used in contact timeline, dashboard, automation)
CREATE INDEX IF NOT EXISTS idx_activities_business_id ON activities(business_id);
CREATE INDEX IF NOT EXISTS idx_activities_contact_id ON activities(contact_id);
CREATE INDEX IF NOT EXISTS idx_activities_deal_id ON activities(deal_id);
CREATE INDEX IF NOT EXISTS idx_activities_created_at ON activities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activities_contact_created ON activities(contact_id, created_at DESC) WHERE contact_id IS NOT NULL;

-- Automation nodes and edges (used in automation builder load/save)
CREATE INDEX IF NOT EXISTS idx_automation_nodes_automation_id ON automation_nodes(automation_id);
CREATE INDEX IF NOT EXISTS idx_automation_edges_automation_id ON automation_edges(automation_id);

-- Automation runs (used in automations page logs tab)
CREATE INDEX IF NOT EXISTS idx_automation_runs_business_id ON automation_runs(business_id);
CREATE INDEX IF NOT EXISTS idx_automation_runs_automation_id ON automation_runs(automation_id);
CREATE INDEX IF NOT EXISTS idx_automation_runs_started_at ON automation_runs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_automation_run_steps_run_id ON automation_run_steps(automation_run_id);

-- Appointments (used in calendar page and contact timeline)
CREATE INDEX IF NOT EXISTS idx_appointments_business_id ON appointments(business_id);
CREATE INDEX IF NOT EXISTS idx_appointments_contact_id ON appointments(contact_id);
CREATE INDEX IF NOT EXISTS idx_appointments_start_time ON appointments(start_time);
CREATE INDEX IF NOT EXISTS idx_appointments_business_start ON appointments(business_id, start_time);

-- Business users (used on every auth check and permission load)
CREATE INDEX IF NOT EXISTS idx_business_users_user_id ON business_users(user_id);
CREATE INDEX IF NOT EXISTS idx_business_users_business_id ON business_users(business_id);

-- Deal stage history (used in contact timeline)
CREATE INDEX IF NOT EXISTS idx_deal_stage_history_deal_id ON deal_stage_history(deal_id);
CREATE INDEX IF NOT EXISTS idx_deal_stage_history_changed_at ON deal_stage_history(changed_at DESC);

-- Mailing tables
CREATE INDEX IF NOT EXISTS idx_mailing_lists_business_id ON mailing_lists(business_id);
CREATE INDEX IF NOT EXISTS idx_mailing_list_contacts_list_id ON mailing_list_contacts(mailing_list_id);

-- Products (used in QuickAddDealDialog, CloseDealWonDialog, API page)
CREATE INDEX IF NOT EXISTS idx_products_business_id ON products(business_id);
