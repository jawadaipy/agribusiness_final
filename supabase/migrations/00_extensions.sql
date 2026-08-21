-- ================================================================
-- AgriBusiness — Migration 00: Extensions
-- Run once per database (idempotent)
-- ================================================================

-- UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Vector similarity search (pgvector)
CREATE EXTENSION IF NOT EXISTS "vector";

-- HTTP requests from Postgres (for pg_cron → Edge Functions)
CREATE EXTENSION IF NOT EXISTS "pg_net";

-- Scheduled jobs
CREATE EXTENSION IF NOT EXISTS "pg_cron";

-- Accent-insensitive text search (Urdu/Roman Urdu support)
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- Full-text search dictionary (used by tsvector indexes)
CREATE TEXT SEARCH CONFIGURATION agri_english (COPY = english);
ALTER TEXT SEARCH CONFIGURATION agri_english
  ALTER MAPPING FOR hword, hword_part, word
  WITH unaccent, english_stem;
