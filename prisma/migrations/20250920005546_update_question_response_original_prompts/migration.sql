BEGIN;

SELECT set_config('app.bypass_rls', 'on', TRUE);

UPDATE "AssetQuestionResponse" SET "originalPrompt" = "AssetQuestion"."prompt"
FROM "AssetQuestion"
WHERE "AssetQuestionResponse"."assetQuestionId" = "AssetQuestion"."id";

COMMIT;