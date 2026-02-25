-- Cardio: rounds/interval support (work + rest × rounds + warmup + cooldown)
-- Run after migrate_cardio.sql

ALTER TABLE public.cardio_activities ADD COLUMN IF NOT EXISTS rounds INT DEFAULT NULL;
ALTER TABLE public.cardio_activities ADD COLUMN IF NOT EXISTS work_interval_min INT DEFAULT NULL;
ALTER TABLE public.cardio_activities ADD COLUMN IF NOT EXISTS rest_interval_min INT DEFAULT NULL;
ALTER TABLE public.cardio_activities ADD COLUMN IF NOT EXISTS warmup_min INT DEFAULT NULL;
ALTER TABLE public.cardio_activities ADD COLUMN IF NOT EXISTS cooldown_min INT DEFAULT NULL;
