-- @param {String} $1:startDate The start date of the report
-- @param {String} $2:endDate The end date of the report

SELECT
    a."id",
    a."createdOn",
    a."modifiedOn",
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
    t."serialNumber" AS "tagSerialNumber"
FROM "Asset" a
JOIN "Product" p ON a."productId" = p."id"
JOIN "ProductCategory" pc ON p."productCategoryId" = pc."id"
JOIN "Manufacturer" m ON p."manufacturerId" = m."id"
JOIN "Site" s ON a."siteId" = s."id"
JOIN "Tag" t ON a."tagId" = t."id"
WHERE a."active" = TRUE
AND a."createdOn" >= $1::timestamptz
AND a."createdOn" <= $2::timestamptz;
