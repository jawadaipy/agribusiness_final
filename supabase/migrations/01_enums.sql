-- ================================================================
-- AgriBusiness — Migration 01: ENUM Types
-- All domain-specific enumerated types used across the schema
-- ================================================================

-- User portal types (admin is provisioned manually, never via public signup)
CREATE TYPE user_type AS ENUM (
  'student',
  'company',
  'consultant',
  'farmer',
  'org',
  'admin'
);

-- Billing / subscription lifecycle
CREATE TYPE subscription_status AS ENUM (
  'trial',
  'active',
  'expired',
  'cancelled'
);

-- Marketplace listing lifecycle
CREATE TYPE listing_status AS ENUM (
  'draft',
  'active',
  'sold',
  'expired'
);

-- Consulting / freelance project lifecycle
CREATE TYPE project_status AS ENUM (
  'open',
  'in_progress',
  'completed',
  'cancelled'
);

-- Advertisement moderation states
CREATE TYPE ad_status AS ENUM (
  'pending',
  'approved',
  'rejected',
  'expired'
);

-- Payment transaction states
CREATE TYPE payment_status AS ENUM (
  'pending',
  'completed',
  'failed',
  'refunded'
);

-- Supported payment gateways
CREATE TYPE payment_gateway AS ENUM (
  'stripe',       -- international cards / IBAN
  'jazzcash'      -- Pakistan PKR mobile wallet + local cards
);

-- Chat message content types
CREATE TYPE message_type AS ENUM (
  'text',
  'image',
  'audio',
  'video',
  'file'
);

-- In-app notification categories
CREATE TYPE notification_type AS ENUM (
  'trial_expiry',
  'ad_approved',
  'ad_rejected',
  'new_message',
  'problem_reply',
  'payment_success',
  'payment_failed',
  'system'
);
