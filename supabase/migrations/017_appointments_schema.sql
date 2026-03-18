-- Appointments table for scheduling meetings with contacts
CREATE TABLE public.appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
    created_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    assigned_to_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'no_show')),
    location TEXT,
    meeting_link TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Performance indexes
CREATE INDEX idx_appointments_business ON public.appointments(business_id);
CREATE INDEX idx_appointments_contact ON public.appointments(contact_id);
CREATE INDEX idx_appointments_assigned ON public.appointments(assigned_to_user_id);
CREATE INDEX idx_appointments_start_time ON public.appointments(start_time);

-- Enable RLS
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- Admins and managers can manage all appointments within their business
CREATE POLICY "Admins and managers can manage all appointments"
    ON public.appointments FOR ALL
    USING (
        business_id IN (SELECT public.user_business_ids())
        AND (public.get_user_role(business_id) IN ('admin', 'manager'))
    );

-- Agents can manage appointments they are assigned to or created
CREATE POLICY "Agents can manage their own appointments"
    ON public.appointments FOR ALL
    USING (
        business_id IN (SELECT public.user_business_ids())
        AND public.get_user_role(business_id) = 'agent'
        AND (assigned_to_user_id = auth.uid() OR created_by_user_id = auth.uid())
    );

-- Agents can view all appointments in their business (for transparency)
CREATE POLICY "Agents can view all appointments for transparency"
    ON public.appointments FOR SELECT
    USING (
        business_id IN (SELECT public.user_business_ids())
        AND public.get_user_role(business_id) = 'agent'
    );
