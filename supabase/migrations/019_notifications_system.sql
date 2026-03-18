CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'system',
  title TEXT NOT NULL,
  message TEXT,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  entity_type TEXT,
  entity_id UUID,
  created_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON public.notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_business ON public.notifications(business_id);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
ON public.notifications FOR SELECT
USING (
  auth.uid() = user_id
  AND business_id IN (SELECT public.user_business_ids())
);

CREATE POLICY "Users can update own notifications"
ON public.notifications FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role and business members can insert notifications"
ON public.notifications FOR INSERT
WITH CHECK (
  business_id IN (SELECT public.user_business_ids())
  OR auth.uid() IS NULL
);

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Trigger: notify when a deal is assigned/reassigned
CREATE OR REPLACE FUNCTION public.notify_deal_assigned()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.owner_user_id IS NOT NULL
     AND (TG_OP = 'INSERT' OR OLD.owner_user_id IS DISTINCT FROM NEW.owner_user_id) THEN
    INSERT INTO public.notifications (business_id, user_id, type, title, message, entity_type, entity_id, created_by_user_id)
    VALUES (
      NEW.business_id,
      NEW.owner_user_id,
      'deal_assigned',
      'עסקה שויכה אליך: ' || NEW.title,
      'עסקה בשווי ' || COALESCE(NEW.value::TEXT, '0') || ' שויכה אליך',
      'deal',
      NEW.id,
      auth.uid()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_deal_assigned ON public.deals;
CREATE TRIGGER trg_notify_deal_assigned
  AFTER INSERT OR UPDATE OF owner_user_id ON public.deals
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_deal_assigned();

-- Trigger: notify deal owner when stage changes
CREATE OR REPLACE FUNCTION public.notify_deal_stage_changed()
RETURNS TRIGGER AS $$
DECLARE
  new_stage_name TEXT;
BEGIN
  IF OLD.stage_id IS DISTINCT FROM NEW.stage_id THEN
    SELECT name INTO new_stage_name FROM public.stages WHERE id = NEW.stage_id;

    IF NEW.owner_user_id IS NOT NULL AND NEW.owner_user_id IS DISTINCT FROM auth.uid() THEN
      INSERT INTO public.notifications (business_id, user_id, type, title, message, entity_type, entity_id, created_by_user_id)
      VALUES (
        NEW.business_id,
        NEW.owner_user_id,
        'deal_stage_changed',
        'עסקה הועברה לשלב: ' || COALESCE(new_stage_name, 'לא ידוע'),
        NEW.title || ' הועברה לשלב ' || COALESCE(new_stage_name, 'חדש'),
        'deal',
        NEW.id,
        auth.uid()
      );
    END IF;

    IF EXISTS (SELECT 1 FROM public.stages WHERE id = NEW.stage_id AND is_won = TRUE) THEN
      INSERT INTO public.notifications (business_id, user_id, type, title, message, entity_type, entity_id, created_by_user_id)
      SELECT
        NEW.business_id,
        bu.user_id,
        'deal_won',
        'עסקה נסגרה בהצלחה! ' || NEW.title,
        'עסקה בשווי ' || COALESCE(NEW.value::TEXT, '0') || ' נסגרה בהצלחה',
        'deal',
        NEW.id,
        auth.uid()
      FROM public.business_users bu
      WHERE bu.business_id = NEW.business_id
        AND bu.role IN ('admin', 'manager')
        AND bu.user_id IS DISTINCT FROM auth.uid();
    END IF;

    IF EXISTS (SELECT 1 FROM public.stages WHERE id = NEW.stage_id AND is_lost = TRUE) THEN
      INSERT INTO public.notifications (business_id, user_id, type, title, message, entity_type, entity_id, created_by_user_id)
      SELECT
        NEW.business_id,
        bu.user_id,
        'deal_lost',
        'עסקה אבדה: ' || NEW.title,
        COALESCE('סיבה: ' || NEW.lost_reason, 'עסקה סומנה כאבודה'),
        'deal',
        NEW.id,
        auth.uid()
      FROM public.business_users bu
      WHERE bu.business_id = NEW.business_id
        AND bu.role IN ('admin', 'manager')
        AND bu.user_id IS DISTINCT FROM auth.uid();
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_deal_stage_changed ON public.deals;
CREATE TRIGGER trg_notify_deal_stage_changed
  AFTER UPDATE OF stage_id ON public.deals
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_deal_stage_changed();

-- Trigger: notify when a new contact is created
CREATE OR REPLACE FUNCTION public.notify_new_contact()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.notifications (business_id, user_id, type, title, message, entity_type, entity_id, created_by_user_id)
  SELECT
    NEW.business_id,
    bu.user_id,
    'contact_created',
    'איש קשר חדש: ' || NEW.full_name,
    COALESCE('טלפון: ' || NEW.phone, COALESCE('מייל: ' || NEW.email, '')),
    'contact',
    NEW.id,
    auth.uid()
  FROM public.business_users bu
  WHERE bu.business_id = NEW.business_id
    AND bu.role IN ('admin', 'manager')
    AND bu.user_id IS DISTINCT FROM auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_new_contact ON public.contacts;
CREATE TRIGGER trg_notify_new_contact
  AFTER INSERT ON public.contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_contact();

-- Trigger: notify when an appointment is assigned
CREATE OR REPLACE FUNCTION public.notify_appointment_assigned()
RETURNS TRIGGER AS $$
DECLARE
  contact_name TEXT;
BEGIN
  IF NEW.assigned_to_user_id IS NOT NULL
     AND (TG_OP = 'INSERT' OR OLD.assigned_to_user_id IS DISTINCT FROM NEW.assigned_to_user_id) THEN
    SELECT full_name INTO contact_name FROM public.contacts WHERE id = NEW.contact_id;
    INSERT INTO public.notifications (business_id, user_id, type, title, message, entity_type, entity_id, created_by_user_id)
    VALUES (
      NEW.business_id,
      NEW.assigned_to_user_id,
      'task_assigned',
      'פגישה חדשה: ' || NEW.title,
      'פגישה עם ' || COALESCE(contact_name, 'איש קשר') || ' ב-' || TO_CHAR(NEW.start_time AT TIME ZONE 'Asia/Jerusalem', 'DD/MM/YYYY HH24:MI'),
      'appointment',
      NEW.id,
      auth.uid()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_appointment_assigned ON public.appointments;
CREATE TRIGGER trg_notify_appointment_assigned
  AFTER INSERT OR UPDATE OF assigned_to_user_id ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_appointment_assigned();
