-- Create API Keys table
CREATE TABLE IF NOT EXISTS public.api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    key_hash TEXT NOT NULL UNIQUE,
    key_prefix TEXT NOT NULL, -- e.g. "sk_live_"
    key_plain TEXT, -- Plain text key for convenience (per user request)
    scopes TEXT[] DEFAULT '{all}'::TEXT[],
    last_used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    CONSTRAINT api_key_format CHECK (key_prefix ~ '^sk_[a-z]+_$')
);

-- Add RLS
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their business API keys"
    ON public.api_keys
    FOR ALL
    TO authenticated
    USING (
        business_id IN (
            SELECT business_id FROM public.business_users WHERE user_id = auth.uid()
        )
    );

-- Index for fast lookups by hash
CREATE INDEX idx_api_keys_hash ON public.api_keys(key_hash);
CREATE INDEX idx_api_keys_business_id ON public.api_keys(business_id);
