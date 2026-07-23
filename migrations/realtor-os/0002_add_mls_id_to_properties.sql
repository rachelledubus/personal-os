-- migrations for Realtor-OS (proposal only)
-- File: migrations/realtor-os/0002_add_mls_id_to_properties.sql
-- Purpose: Add mls_id column to properties to support MLS integration and user-editable field.

ALTER TABLE IF EXISTS properties ADD COLUMN IF NOT EXISTS mls_id text;

-- Rollback (manual): ALTER TABLE properties DROP COLUMN IF EXISTS mls_id;
