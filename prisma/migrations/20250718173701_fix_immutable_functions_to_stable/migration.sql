-- Fix functions that use session variables to be STABLE instead of IMMUTABLE
-- IMMUTABLE functions should not depend on session state, but these functions
-- use current_setting() which can change during execution, causing caching issues

-- Fix validate_client function
CREATE OR REPLACE FUNCTION validate_client(client_id TEXT) RETURNS BOOLEAN AS $$
DECLARE
    current_client_id TEXT;
BEGIN
    -- Retrieve the current client ID from the session
    -- Use TRUE as second parameter to return NULL if setting doesn't exist
    current_client_id := current_setting('app.current_client_id', TRUE)::TEXT;

    -- Perform the check
    RETURN current_client_id IS NOT NULL AND client_id = current_client_id;
END;
$$ LANGUAGE plpgsql STABLE;

-- Fix validate_site function
CREATE OR REPLACE FUNCTION validate_site(site_id TEXT) RETURNS BOOLEAN AS $$
DECLARE
    current_user_visibility TEXT;
    current_site_id TEXT;
    allowed_site_ids TEXT[];
BEGIN
    current_user_visibility := current_setting('app.current_user_visibility', TRUE)::TEXT;
    current_site_id := current_setting('app.current_site_id', TRUE)::TEXT;
    allowed_site_ids := string_to_array(current_setting('app.allowed_site_ids', TRUE)::TEXT, ',');

    -- Perform the check
    RETURN (current_user_visibility IN ('single-site', 'self') AND current_site_id = site_id)
        OR current_user_visibility IN ('super-admin', 'global', 'client-sites')
        OR site_id = ANY(allowed_site_ids);
END;
$$ LANGUAGE plpgsql STABLE;

-- Fix restrict_self function
CREATE OR REPLACE FUNCTION restrict_self() RETURNS BOOLEAN AS $$
BEGIN
    RETURN current_setting('app.current_user_visibility', TRUE)::TEXT = 'self';
END;
$$ LANGUAGE plpgsql STABLE;

-- Fix is_owner function
CREATE OR REPLACE FUNCTION is_owner(person_id TEXT) RETURNS BOOLEAN AS $$
DECLARE
    current_person_id TEXT;
BEGIN
    current_person_id := current_setting('app.current_person_id', TRUE)::TEXT;

    -- Perform the check
    RETURN person_id = current_person_id;
END;
$$ LANGUAGE plpgsql STABLE;

-- Fix should_bypass_rls function
CREATE OR REPLACE FUNCTION should_bypass_rls() RETURNS BOOLEAN AS $$
DECLARE
    bypass_rls_status TEXT;
BEGIN
    -- Retrieve the BYPASS_RLS status from the session.
    bypass_rls_status := current_setting('app.bypass_rls', TRUE)::TEXT;

    -- Perform the check
    RETURN bypass_rls_status = 'on';
END;
$$ LANGUAGE plpgsql STABLE;