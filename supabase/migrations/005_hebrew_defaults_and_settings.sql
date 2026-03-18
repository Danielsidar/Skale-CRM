-- Update default stages to Hebrew and add configuration to businesses table

-- 1. Add default_pipeline_stages to businesses
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS default_pipeline_stages JSONB;

-- 2. Update the default pipeline creation function to Hebrew
CREATE OR REPLACE FUNCTION create_default_pipeline_for_business()
RETURNS TRIGGER AS $$
DECLARE
  new_pipeline_id UUID;
  default_stages JSONB;
BEGIN
  -- Check if business has custom default stages
  SELECT default_pipeline_stages INTO default_stages FROM businesses WHERE id = NEW.id;

  INSERT INTO pipelines (business_id, name, description)
  VALUES (NEW.id, 'מכירות', 'פייפליין מכירות דיפולטיבי')
  RETURNING id INTO new_pipeline_id;

  IF default_stages IS NOT NULL AND jsonb_array_length(default_stages) > 0 THEN
    -- Insert from custom settings
    INSERT INTO stages (pipeline_id, name, position, color, probability, is_won, is_lost)
    SELECT 
      new_pipeline_id, 
      (elem->>'name')::TEXT, 
      (elem->>'position')::INT, 
      (elem->>'color')::TEXT, 
      (elem->>'probability')::INT, 
      (elem->>'is_won')::BOOLEAN, 
      (elem->>'is_lost')::BOOLEAN
    FROM jsonb_array_elements(default_stages) AS elem;
  ELSE
    -- Insert hardcoded Hebrew defaults
    INSERT INTO stages (pipeline_id, name, position, color, probability, is_won, is_lost) VALUES
      (new_pipeline_id, 'ליד חדש',        0, '#94a3b8', 10,  FALSE, FALSE),
      (new_pipeline_id, 'נוצר קשר',      1, '#60a5fa', 20,  FALSE, FALSE),
      (new_pipeline_id, 'ליד איכותי',      2, '#38bdf8', 40,  FALSE, FALSE),
      (new_pipeline_id, 'הצעה נשלחה',  3, '#22d3ee', 60,  FALSE, FALSE),
      (new_pipeline_id, 'משא ומתן',    4, '#2dd4bf', 80,  FALSE, FALSE),
      (new_pipeline_id, 'סגירה / הצלחה',            5, '#34d399', 100, TRUE,  FALSE),
      (new_pipeline_id, 'הפסד',           6, '#f87171', 0,   FALSE, TRUE);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
