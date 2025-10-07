CREATE OR REPLACE FUNCTION set_question_condition_client_id()
RETURNS TRIGGER AS $$
BEGIN
    -- Get clientId from the parent question
    SELECT "clientId" INTO NEW."clientId"
    FROM "AssetQuestion" aq
    WHERE aq."id" = NEW."assetQuestionId";
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_question_condition_client_id
    BEFORE INSERT ON "AssetQuestionCondition"
    FOR EACH ROW
    EXECUTE FUNCTION set_question_condition_client_id();