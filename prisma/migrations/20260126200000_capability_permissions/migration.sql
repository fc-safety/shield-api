-- CreateEnum
CREATE TYPE "RoleScope" AS ENUM ('SYSTEM', 'GLOBAL', 'CLIENT', 'SITE_GROUP', 'SITE', 'SELF');

-- Add new columns to Role
ALTER TABLE "Role" ADD COLUMN "scope" "RoleScope" NOT NULL DEFAULT 'SITE';
ALTER TABLE "Role" ADD COLUMN "capabilities" TEXT[] NOT NULL DEFAULT '{}';

-- Migrate visibility permissions to scope
UPDATE "Role" r SET scope =
  CASE
    WHEN EXISTS (SELECT 1 FROM "RolePermission" rp WHERE rp."roleId" = r.id AND rp.permission = 'visibility:super-admin') THEN 'GLOBAL'::"RoleScope"
    WHEN EXISTS (SELECT 1 FROM "RolePermission" rp WHERE rp."roleId" = r.id AND rp.permission = 'visibility:global') THEN 'GLOBAL'::"RoleScope"
    WHEN EXISTS (SELECT 1 FROM "RolePermission" rp WHERE rp."roleId" = r.id AND rp.permission = 'visibility:client-sites') THEN 'CLIENT'::"RoleScope"
    WHEN EXISTS (SELECT 1 FROM "RolePermission" rp WHERE rp."roleId" = r.id AND rp.permission = 'visibility:site-group') THEN 'SITE_GROUP'::"RoleScope"
    WHEN EXISTS (SELECT 1 FROM "RolePermission" rp WHERE rp."roleId" = r.id AND rp.permission = 'visibility:single-site') THEN 'SITE'::"RoleScope"
    ELSE 'SELF'::"RoleScope"
  END;

-- Migrate CRUD permissions to capabilities
-- This uses a complex query to aggregate permissions into capability arrays

-- First, create a temporary mapping table
CREATE TEMP TABLE permission_to_capability (
  permission TEXT,
  capability TEXT
);

INSERT INTO permission_to_capability (permission, capability) VALUES
  -- perform-inspections
  ('create:inspections', 'perform-inspections'),
  ('read:inspections', 'perform-inspections'),
  ('update:inspections', 'perform-inspections'),
  ('manage:inspections', 'perform-inspections'),
  ('read:tags', 'perform-inspections'),
  ('read:assets', 'perform-inspections'),
  ('read:asset-questions', 'perform-inspections'),

  -- submit-requests
  ('create:product-requests', 'submit-requests'),
  ('read:product-requests', 'submit-requests'),
  ('cancel:product-requests', 'submit-requests'),
  ('read:products', 'submit-requests'),
  ('read:product-categories', 'submit-requests'),
  ('read:manufacturers', 'submit-requests'),

  -- manage-assets
  ('manage:assets', 'manage-assets'),
  ('create:assets', 'manage-assets'),
  ('update:assets', 'manage-assets'),
  ('delete:assets', 'manage-assets'),
  ('manage:consumables', 'manage-assets'),
  ('create:consumables', 'manage-assets'),
  ('update:consumables', 'manage-assets'),
  ('delete:consumables', 'manage-assets'),
  ('manage:tags', 'manage-assets'),
  ('create:tags', 'manage-assets'),
  ('update:tags', 'manage-assets'),
  ('delete:tags', 'manage-assets'),
  ('setup:assets', 'manage-assets'),

  -- manage-routes
  ('manage:inspection-routes', 'manage-routes'),
  ('create:inspection-routes', 'manage-routes'),
  ('update:inspection-routes', 'manage-routes'),
  ('delete:inspection-routes', 'manage-routes'),

  -- resolve-alerts
  ('read:alerts', 'resolve-alerts'),
  ('resolve:alerts', 'resolve-alerts'),

  -- view-reports (read-only access to inspection data)
  -- Note: This is a subset; users with other capabilities may also have these reads

  -- manage-users
  ('manage:users', 'manage-users'),
  ('create:users', 'manage-users'),
  ('update:users', 'manage-users'),
  ('delete:users', 'manage-users'),
  ('manage:invitations', 'manage-users'),
  ('create:invitations', 'manage-users'),
  ('update:invitations', 'manage-users'),
  ('delete:invitations', 'manage-users'),
  ('manage:people', 'manage-users'),
  ('create:people', 'manage-users'),
  ('update:people', 'manage-users'),
  ('delete:people', 'manage-users'),
  ('notify:users', 'manage-users'),

  -- configure-products
  ('manage:products', 'configure-products'),
  ('create:products', 'configure-products'),
  ('update:products', 'configure-products'),
  ('delete:products', 'configure-products'),
  ('manage:product-categories', 'configure-products'),
  ('create:product-categories', 'configure-products'),
  ('update:product-categories', 'configure-products'),
  ('delete:product-categories', 'configure-products'),
  ('manage:manufacturers', 'configure-products'),
  ('create:manufacturers', 'configure-products'),
  ('update:manufacturers', 'configure-products'),
  ('delete:manufacturers', 'configure-products'),
  ('manage:asset-questions', 'configure-products'),
  ('create:asset-questions', 'configure-products'),
  ('update:asset-questions', 'configure-products'),
  ('delete:asset-questions', 'configure-products'),
  ('manage:ansi-categories', 'configure-products'),
  ('create:ansi-categories', 'configure-products'),
  ('update:ansi-categories', 'configure-products'),
  ('delete:ansi-categories', 'configure-products'),

  -- approve-requests
  ('review:product-requests', 'approve-requests'),
  ('update-status:product-requests', 'approve-requests'),

  -- program-tags
  ('program:tags', 'program-tags'),
  ('register:tags', 'program-tags');

-- Now update each role with its capabilities
UPDATE "Role" r SET capabilities = (
  SELECT COALESCE(array_agg(DISTINCT ptc.capability), '{}')
  FROM "RolePermission" rp
  JOIN permission_to_capability ptc ON rp.permission = ptc.permission
  WHERE rp."roleId" = r.id
);

-- Drop the temporary table
DROP TABLE permission_to_capability;

-- Drop the RolePermission table
DROP TABLE "RolePermission";

-- Update RLS functions to use scope instead of visibility
CREATE OR REPLACE FUNCTION get_current_scope() RETURNS TEXT AS $$
BEGIN
    RETURN current_setting('app.current_user_scope', TRUE)::TEXT;
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION restrict_self() RETURNS BOOLEAN AS $$
DECLARE
    current_scope TEXT;
    current_visibility TEXT;
BEGIN
    -- Try scope first (new system)
    current_scope := current_setting('app.current_user_scope', TRUE)::TEXT;
    IF current_scope IS NOT NULL AND current_scope != '' THEN
        RETURN current_scope = 'SELF';
    END IF;

    -- Fall back to visibility (backward compatibility during transition)
    current_visibility := current_setting('app.current_user_visibility', TRUE)::TEXT;
    IF current_visibility IS NOT NULL AND current_visibility != '' THEN
        RETURN current_visibility = 'self';
    END IF;

    -- Default to restricted
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION validate_site(site_id UUID) RETURNS BOOLEAN AS $$
DECLARE
    current_scope TEXT;
    current_visibility TEXT;
    current_client_id UUID;
    current_site_id UUID;
    allowed_site_ids UUID[];
BEGIN
    current_client_id := current_setting('app.current_client_id', TRUE)::UUID;
    current_site_id := current_setting('app.current_site_id', TRUE)::UUID;

    -- Parse allowed_site_ids
    BEGIN
        allowed_site_ids := string_to_array(current_setting('app.allowed_site_ids', TRUE), ',')::UUID[];
    EXCEPTION WHEN OTHERS THEN
        allowed_site_ids := '{}';
    END;

    -- Try scope first (new system)
    current_scope := current_setting('app.current_user_scope', TRUE)::TEXT;
    IF current_scope IS NOT NULL AND current_scope != '' THEN
        -- SYSTEM and GLOBAL can access everything
        IF current_scope IN ('SYSTEM', 'GLOBAL') THEN
            RETURN TRUE;
        END IF;

        -- CLIENT can access any site in their client
        IF current_scope = 'CLIENT' THEN
            RETURN TRUE;
        END IF;

        -- SITE_GROUP can access allowed sites
        IF current_scope = 'SITE_GROUP' THEN
            RETURN site_id = current_site_id OR site_id = ANY(allowed_site_ids);
        END IF;

        -- SITE and SELF can only access their assigned site
        IF current_scope IN ('SITE', 'SELF') THEN
            RETURN site_id = current_site_id;
        END IF;

        RETURN FALSE;
    END IF;

    -- Fall back to visibility (backward compatibility during transition)
    current_visibility := current_setting('app.current_user_visibility', TRUE)::TEXT;
    IF current_visibility IS NOT NULL AND current_visibility != '' THEN
        IF current_visibility IN ('super-admin', 'global', 'client-sites') THEN
            RETURN TRUE;
        END IF;

        IF current_visibility IN ('single-site', 'self') THEN
            RETURN site_id = current_site_id;
        END IF;

        -- site-group
        RETURN site_id = current_site_id OR site_id = ANY(allowed_site_ids);
    END IF;

    -- Default: only allow assigned site
    RETURN site_id = current_site_id;
END;
$$ LANGUAGE plpgsql STABLE;
