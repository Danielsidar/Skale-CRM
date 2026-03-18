-- Email Templates table
CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  subject TEXT,
  content_html TEXT NOT NULL,
  content_json JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

-- Add RLS policies
CREATE POLICY "Users can view email templates of their business"
  ON email_templates FOR SELECT
  USING (business_id IN (SELECT user_business_ids()));

CREATE POLICY "Users can insert email templates for their business"
  ON email_templates FOR INSERT
  WITH CHECK (business_id IN (SELECT user_business_ids()));

CREATE POLICY "Users can update email templates of their business"
  ON email_templates FOR UPDATE
  USING (business_id IN (SELECT user_business_ids()));

CREATE POLICY "Users can delete email templates of their business"
  ON email_templates FOR DELETE
  USING (business_id IN (SELECT user_business_ids()));
