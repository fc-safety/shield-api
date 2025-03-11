-- AlterTable
ALTER TABLE "Client" ALTER COLUMN "startedOn" SET DATA TYPE TIMESTAMPTZ USING "startedOn"::timestamp with time zone;

-- AlterTable
ALTER TABLE "Consumable" ALTER COLUMN "expiresOn" SET DATA TYPE TIMESTAMPTZ USING "expiresOn"::timestamp with time zone;

CREATE OR REPLACE FUNCTION validate_client(client_id TEXT) RETURNS BOOLEAN AS $$
DECLARE
    current_client_id TEXT;
BEGIN
    -- Retrieve the current client ID from the session
    current_client_id := current_setting('app.current_client_id', TRUE)::TEXT;

    -- Perform the check
    RETURN client_id = current_client_id;
END;
$$ LANGUAGE plpgsql IMMUTABLE;