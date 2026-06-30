-- Storage usage tracking table for monitoring trends
CREATE TABLE IF NOT EXISTS storage_usage_snapshots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  snapshot_date DATE DEFAULT CURRENT_DATE,
  folder TEXT NOT NULL,
  object_count INTEGER DEFAULT 0,
  total_size_bytes BIGINT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_storage_usage_date_folder ON storage_usage_snapshots(snapshot_date, folder);
