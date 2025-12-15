-- @param {String} $1:clientId? The client ID (optional)

SELECT
    a."id",
    a."siteId",
    a."serialNumber",
    a."inspectionCycle",
    a."setupOn",
    a."tagId",
    a."active",
    a."clientId",
    a."createdOn",
    a."modifiedOn"
FROM "Asset" a
JOIN "Client" c ON a."clientId" = c."id"
LEFT JOIN (
    SELECT DISTINCT ON (i."assetId") i."assetId", i."createdOn"
    FROM "Inspection" i
    ORDER BY i."assetId", i."createdOn" DESC
) i ON a."id" = i."assetId"
WHERE (i."createdOn" IS NULL OR i."createdOn" < NOW() - (INTERVAL '1 day' * COALESCE(a."inspectionCycle", c."defaultInspectionCycle")))
AND a."active" = TRUE
AND ($1::text IS NULL OR a."clientId" = $1::text)
AND c."demoMode" = TRUE
AND a."tagId" IS NULL;
