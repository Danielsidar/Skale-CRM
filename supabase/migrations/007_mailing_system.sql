-- Mailing System Infrastructure
-- 1. Add ghl_webhook_url to businesses table
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS ghl_webhook_url TEXT;

-- 2. Mailing Lists
CREATE TABLE IF NOT EXISTS mailing_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on mailing_lists
ALTER TABLE mailing_lists ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for mailing_lists
CREATE POLICY "Users can view mailing lists of their business"
  ON mailing_lists FOR SELECT
  USING (business_id IN (SELECT user_business_ids()));

CREATE POLICY "Users can insert mailing lists for their business"
  ON mailing_lists FOR INSERT
  WITH CHECK (business_id IN (SELECT user_business_ids()));

CREATE POLICY "Users can update mailing lists of their business"
  ON mailing_lists FOR UPDATE
  USING (business_id IN (SELECT user_business_ids()));

CREATE POLICY "Users can delete mailing lists of their business"
  ON mailing_lists FOR DELETE
  USING (business_id IN (SELECT user_business_ids()));

-- 3. Subscribers (Junction between contacts and lists)
CREATE TABLE IF NOT EXISTS mailing_list_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id UUID REFERENCES mailing_lists(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(list_id, contact_id)
);

-- Enable RLS on mailing_list_contacts
ALTER TABLE mailing_list_contacts ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for mailing_list_contacts (via mailing_lists)
CREATE POLICY "Users can view mailing list contacts of their business"
  ON mailing_list_contacts FOR SELECT
  USING (list_id IN (SELECT id FROM mailing_lists));

CREATE POLICY "Users can insert mailing list contacts of their business"
  ON mailing_list_contacts FOR INSERT
  WITH CHECK (list_id IN (SELECT id FROM mailing_lists));

CREATE POLICY "Users can delete mailing list contacts of their business"
  ON mailing_list_contacts FOR DELETE
  USING (list_id IN (SELECT id FROM mailing_lists));

-- 4. Email Campaigns (To track sends)
CREATE TABLE IF NOT EXISTS email_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  content_html TEXT NOT NULL,
  status TEXT DEFAULT 'sent', -- 'draft', 'sending', 'sent', 'failed'
  sent_at TIMESTAMPTZ DEFAULT now(),
  provider_type TEXT DEFAULT 'ghl_webhook',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on email_campaigns
ALTER TABLE email_campaigns ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for email_campaigns
CREATE POLICY "Users can view email campaigns of their business"
  ON email_campaigns FOR SELECT
  USING (business_id IN (SELECT user_business_ids()));

CREATE POLICY "Users can insert email campaigns for their business"
  ON email_campaigns FOR INSERT
  WITH CHECK (business_id IN (SELECT user_business_ids()));

-- 5. Campaign Targets (Which lists were targeted)
CREATE TABLE IF NOT EXISTS email_campaign_lists (
  campaign_id UUID REFERENCES email_campaigns(id) ON DELETE CASCADE,
  list_id UUID REFERENCES mailing_lists(id) ON DELETE CASCADE,
  PRIMARY KEY (campaign_id, list_id)
);

-- Enable RLS on email_campaign_lists
ALTER TABLE email_campaign_lists ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for email_campaign_lists
CREATE POLICY "Users can view campaign lists of their business"
  ON email_campaign_lists FOR SELECT
  USING (campaign_id IN (SELECT id FROM email_campaigns));

CREATE POLICY "Users can insert campaign lists for their business"
  ON email_campaign_lists FOR INSERT
  WITH CHECK (campaign_id IN (SELECT id FROM email_campaigns));
