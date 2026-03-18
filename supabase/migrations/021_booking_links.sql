-- Booking settings: each user can have a public booking page
CREATE TABLE IF NOT EXISTS booking_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  slug TEXT NOT NULL UNIQUE,
  display_name TEXT,
  description TEXT,
  appointment_duration INTEGER NOT NULL DEFAULT 30,
  buffer_time INTEGER NOT NULL DEFAULT 0,
  working_hours JSONB NOT NULL DEFAULT '{
    "0": {"start": "09:00", "end": "17:00"},
    "1": {"start": "09:00", "end": "17:00"},
    "2": {"start": "09:00", "end": "17:00"},
    "3": {"start": "09:00", "end": "17:00"},
    "4": {"start": "09:00", "end": "14:00"},
    "5": null,
    "6": null
  }'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(business_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_booking_settings_slug ON booking_settings(slug);
CREATE INDEX IF NOT EXISTS idx_booking_settings_user ON booking_settings(business_id, user_id);

ALTER TABLE booking_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own booking settings"
  ON booking_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own booking settings"
  ON booking_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own booking settings"
  ON booking_settings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Public can read enabled booking settings by slug"
  ON booking_settings FOR SELECT
  USING (is_enabled = true);
