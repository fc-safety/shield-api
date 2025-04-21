-- @param {String} $1:startDate? The start date of the report (optional)
-- @param {String} $2:endDate? The end date of the report (optional)

SELECT
    i."id",
    i."createdOn",
    i."assetId",
    i."inspectorId",
    i."siteId",
    person."firstName" || ' ' || person."lastName" AS "inspectorName",
    a."name" AS "assetName",
    a."serialNumber" AS "assetSerialNumber",
    a."location" AS "assetLocation",
    a."placement" AS "assetPlacement",
    p."name" AS "productName",
    pc."name" AS "productCategoryName",
    pc."shortName" AS "productCategoryShortName",
    pc."icon" AS "productCategoryIcon",
    pc."color" AS "productCategoryColor",
    m."name" AS "manufacturerName",
    s."name" AS "siteName",
    t."serialNumber" AS "tagSerialNumber"
FROM "Inspection" i
JOIN "Asset" a ON i."assetId" = a."id"
JOIN "Product" p ON a."productId" = p."id"
JOIN "ProductCategory" pc ON p."productCategoryId" = pc."id"
JOIN "Manufacturer" m ON p."manufacturerId" = m."id"
JOIN "Site" s ON a."siteId" = s."id"
JOIN "Tag" t ON a."tagId" = t."id"
JOIN "Person" person ON i."inspectorId" = person."id"
WHERE ($1::timestamptz IS NULL OR i."createdOn" >= $1::timestamptz)
AND ($2::timestamptz IS NULL OR i."createdOn" <= $2::timestamptz);
