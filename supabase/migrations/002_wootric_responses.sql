-- Wootric responses cache table
-- Stores locally synced Wootric response data per tenant

CREATE TABLE IF NOT EXISTS wootric_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  wootric_id integer NOT NULL,
  survey_id integer NOT NULL,
  end_user_id integer,
  email varchar(255),
  score integer,
  text text,
  origin_url text,
  ip_address varchar(45),
  wootric_created_at timestamptz NOT NULL,
  wootric_updated_at timestamptz,
  tags jsonb DEFAULT '[]'::jsonb,
  end_user_properties jsonb,
  synced_at timestamptz DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS wootric_responses_tenant_wootric_idx ON wootric_responses(tenant_id, wootric_id);
CREATE INDEX IF NOT EXISTS wootric_responses_tenant_idx ON wootric_responses(tenant_id);
CREATE INDEX IF NOT EXISTS wootric_responses_created_idx ON wootric_responses(wootric_created_at);
CREATE INDEX IF NOT EXISTS wootric_responses_survey_idx ON wootric_responses(survey_id);

-- Enable RLS
ALTER TABLE wootric_responses ENABLE ROW LEVEL SECURITY;

-- RLS policies (use DO block for PG <15 compatibility)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'wootric_responses' AND policyname = 'tenant_isolation') THEN
    CREATE POLICY "tenant_isolation" ON wootric_responses
      USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'wootric_responses' AND policyname = 'service_role_access') THEN
    CREATE POLICY "service_role_access" ON wootric_responses
      FOR ALL USING (auth.role() = 'service_role');
  END IF;
END $$;
