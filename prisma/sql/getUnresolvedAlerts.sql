-- @param {String} $1:startDate? The start date of the report (optional)
-- @param {String} $2:endDate? The end date of the report (optional)

SELECT
    alert."id",
    alert."createdOn",
    alert."modifiedOn",
    alert."alertLevel",
    alert."message",
    alert."resolved",
    alert."resolvedOn",
    alert."resolutionNote",
    a."name" AS "assetName",
    a."serialNumber" AS "assetSerialNumber",
    a."location" AS "assetLocation",
    a."placement" AS "assetPlacement",
    i."createdOn" AS "inspectionDate",
    person."firstName" || ' ' || person."lastName" AS "inspectorName",
    p."name" AS "productName",
    pc."name" AS "productCategoryName",
    pc."shortName" AS "productCategoryShortName",
    pc."icon" AS "productCategoryIcon",
    pc."color" AS "productCategoryColor",
    m."name" AS "manufacturerName",
    s."name" AS "siteName"
FROM "Alert" alert
JOIN "Asset" a ON alert."assetId" = a."id"
JOIN "Product" p ON a."productId" = p."id"
JOIN "ProductCategory" pc ON p."productCategoryId" = pc."id"
JOIN "Manufacturer" m ON p."manufacturerId" = m."id"
JOIN "Site" s ON alert."siteId" = s."id"
JOIN "Inspection" i ON alert."inspectionId" = i."id"
JOIN "Person" person ON i."inspectorId" = person."id"
WHERE a."active" = TRUE AND alert."resolved" = FALSE
AND ($1::timestamptz IS NULL OR alert."createdOn" >= $1::timestamptz)
AND ($2::timestamptz IS NULL OR alert."createdOn" <= $2::timestamptz);
