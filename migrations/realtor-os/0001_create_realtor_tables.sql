-- migrations for Realtor-OS (proposal only)
-- File: migrations/realtor-os/0001_create_realtor_tables.sql
-- Purpose: Add basic tables for leads, contacts, clients, properties, transactions, campaigns
-- WARNING: This file is a proposal. It will NOT be run automatically. Review and run in a staging DB first.

-- NOTE: If you use Supabase with uuid_generate_v4(), ensure the "uuid-ossp" extension is enabled.

CREATE TABLE IF NOT EXISTS leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  first_name text,
  last_name text,
  email text,
  phone text,
  source text,
  status text,
  interest_level text,
  budget_min numeric,
  budget_max numeric,
  assigned_to uuid,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  first_name text,
  last_name text,
  email text,
  phone text,
  relationship text,
  notes jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  first_name text,
  last_name text,
  email text,
  phone text,
  client_type text,
  representative uuid,
  consent jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  address text,
  city text,
  state text,
  zip text,
  beds integer,
  baths numeric,
  sqft integer,
  list_price numeric,
  status text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  property_id uuid,
  buyer_id uuid,
  seller_id uuid,
  status text,
  list_price numeric,
  sale_price numeric,
  opened_at timestamptz,
  closed_at timestamptz,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  title text,
  channel text,
  audience jsonb,
  status text,
  sent_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Rollback (manual): DROP TABLE IF EXISTS campaigns, transactions, properties, clients, contacts, leads;
