-- Fix wootric_id, survey_id, end_user_id types: integer → bigint
-- Wootric IDs can exceed 2^31-1 (signed 32-bit integer max)
ALTER TABLE wootric_responses 
  ALTER COLUMN wootric_id TYPE bigint,
  ALTER COLUMN survey_id TYPE bigint,
  ALTER COLUMN end_user_id TYPE bigint;
