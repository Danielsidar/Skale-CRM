-- Add tags column to deals table
ALTER TABLE deals ADD COLUMN tags TEXT[] DEFAULT '{}';

-- Create index for performance on tag searches
CREATE INDEX idx_deals_tags ON deals USING GIN (tags);
