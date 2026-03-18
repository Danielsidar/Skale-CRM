-- Whatsapp Credentials Table
CREATE TABLE IF NOT EXISTS public.whatsapp_credentials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    provider TEXT NOT NULL, -- 'official' or 'green_api'
    api_url TEXT,
    api_token TEXT NOT NULL,
    instance_id TEXT, -- For GreenAPI
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.whatsapp_credentials ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admins can manage whatsapp_credentials"
  ON public.whatsapp_credentials FOR ALL
  USING (
    business_id IN (SELECT public.user_business_ids())
    AND (SELECT role FROM public.business_users WHERE business_id = whatsapp_credentials.business_id AND user_id = auth.uid()) = 'admin'
  );

CREATE POLICY "Everyone in the business can view credentials"
  ON public.whatsapp_credentials FOR SELECT
  USING (business_id IN (SELECT public.user_business_ids()));

-- Trigger for updated_at
CREATE TRIGGER update_whatsapp_credentials_updated_at BEFORE UPDATE ON whatsapp_credentials
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
