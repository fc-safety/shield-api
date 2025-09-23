-- @param {String} $1:clientId? The client ID (optional)

SELECT
    a."id",
    a."createdOn",
    a."modifiedOn",
    a."active",
    a."name",
    a."serialNumber",
    a."location",
    a."placement",
    a."setupOn",
    p."name" AS "productName",
    pc."name" AS "productCategoryName",
    pc."shortName" AS "productCategoryShortName",
    pc."icon" AS "productCategoryIcon",
    pc."color" AS "productCategoryColor",
    m."name" AS "manufacturerName",
    s."name" AS "siteName",
    t."serialNumber" AS "tagSerialNumber",
    i."createdOn" AS "lastInspectionDate"
FROM "Asset" a
JOIN "Client" c ON a."clientId" = c."id"
JOIN "Product" p ON a."productId" = p."id"
JOIN "ProductCategory" pc ON p."productCategoryId" = pc."id"
JOIN "Manufacturer" m ON p."manufacturerId" = m."id"
JOIN "Site" s ON a."siteId" = s."id"
JOIN "Tag" t ON a."tagId" = t."id"
LEFT JOIN (
    SELECT DISTINCT ON (i."assetId") i."assetId", i."createdOn"
    FROM "Inspection" i
    ORDER BY i."assetId", i."createdOn" DESC
) i ON a."id" = i."assetId"
WHERE (i."createdOn" IS NOT  NULL AND i."createdOn" < NOW() - (INTERVAL '1 day' * COALESCE(a."inspectionCycle", c."defaultInspectionCycle")))
AND a."active" = TRUE
AND ($1::text IS NULL OR a."clientId" = $1::text);
