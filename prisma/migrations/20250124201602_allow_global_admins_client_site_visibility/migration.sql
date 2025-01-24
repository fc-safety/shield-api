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
        OR current_user_visibility IN ('global', 'client-sites')
        OR site_id = ANY(allowed_site_ids);
END;
$$ LANGUAGE plpgsql IMMUTABLE;