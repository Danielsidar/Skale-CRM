-- Table for persisting user UI preferences across the application
CREATE TABLE IF NOT EXISTS public.user_ui_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
    page_key TEXT NOT NULL, -- e.g., 'leads', 'dashboard', 'contacts'
    settings JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, business_id, page_key)
);

-- Enable RLS
ALTER TABLE public.user_ui_settings ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can manage their own UI settings"
ON public.user_ui_settings FOR ALL
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_user_ui_settings_updated_at
BEFORE UPDATE ON public.user_ui_settings
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
