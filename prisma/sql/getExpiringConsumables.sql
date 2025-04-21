-- @param {String} $1:startDate? The start date of the report (optional)
-- @param {String} $2:endDate? The end date of the report (optional)

SELECT
    c."id",
    c."createdOn",
    c."modifiedOn",
    c."quantity" AS "quantity",
    c."expiresOn" AS "expiresOn",
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
    s."name" AS "siteName"
FROM "Consumable" c
JOIN "Product" p ON c."productId" = p."id"
JOIN "ProductCategory" pc ON p."productCategoryId" = pc."id"
JOIN "Manufacturer" m ON p."manufacturerId" = m."id"
JOIN "Site" s ON c."siteId" = s."id"
JOIN "Asset" a ON c."assetId" = a."id"
WHERE a."active" = TRUE
AND c."expiresOn" IS NOT NULL AND c."expiresOn" > NOW()
AND ($1::timestamptz IS NULL OR c."expiresOn" >= $1::timestamptz)
AND ($2::timestamptz IS NULL OR c."expiresOn" <= $2::timestamptz);
