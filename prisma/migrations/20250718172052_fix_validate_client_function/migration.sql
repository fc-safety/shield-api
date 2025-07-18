-- Fix validate_client function to use current_setting with TRUE parameter
-- This ensures the function doesn't throw an error when the setting is not set

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
$$ LANGUAGE plpgsql IMMUTABLE;