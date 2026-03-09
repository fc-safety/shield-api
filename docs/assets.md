# Assets Module

The assets module (`src/assets/`) is the core domain of Shield API. It manages physical equipment, inspections, alerts, NFC tags, consumable supplies, inspection routes, product requests, and reports.

## Sub-Modules

### Assets (`/assets`)

CRUD for physical items to be inspected. Assets are linked to products, tags, and sites.

| Method | Path | Capability | Description |
|--------|------|-----------|-------------|
| POST | `/` | manage-assets | Create asset |
| GET | `/` | — | List with pagination |
| GET | `/latest-inspection` | — | List with latest inspection per asset |
| GET | `/metadata-keys` | — | All metadata keys across assets |
| GET | `/metadata-values/:key` | — | Distinct values for a metadata key |
| GET | `/:id` | — | Full asset details |
| PATCH | `/:id` | manage-assets | Update asset |
| POST | `/:id/add-tag` | manage-assets | Associate NFC tag |
| POST | `/:id/configure` | manage-assets / perform-inspections / register-tags | Configure with question responses |
| POST | `/:id/setup` | manage-assets / perform-inspections / register-tags | Complete initial setup |
| PATCH | `/:id/setup` | manage-assets / perform-inspections / register-tags | Update setup fields |
| POST | `/:id/send-reminder-notifications` | — | Send email/SMS reminders (throttled) |
| DELETE | `/:id` | manage-assets | Delete asset |

**Key behaviors:**
- **Setup** creates consumables from question config mappings and sets metadata from config responses (transactional)
- **Alert triggering** happens on inspection creation — alert criteria rules evaluate question responses
- **Metadata** is flexible key-value pairs (STATIC values or DYNAMIC from responses)

### Inspections (`/inspections`)

Records of asset inspections with GPS tracking and question responses.

| Method | Path | Capability | Description |
|--------|------|-----------|-------------|
| POST | `/` | — | Create inspection (with optional session/route) |
| GET | `/` | — | List with pagination |
| GET | `/active-sessions/asset/:assetId` | — | Active sessions for asset |
| GET | `/sessions/:id` | — | Session with completion status |
| POST | `/sessions/:id/cancel` | perform-inspections | Cancel active session |
| GET | `/:id` | — | Full inspection with responses and alerts |
| PATCH | `/:id` | perform-inspections | Update inspection |
| DELETE | `/:id` | perform-inspections | Delete inspection |

**Public endpoints** (`/inspections-public`) for unauthenticated tag scanning:
- `GET /is-valid-tag-url` — Validate signed tag URL
- `GET /is-valid-tag-id` — Check tag existence, get inspection token
- `GET /history` — Inspection history (requires token header)
- `GET /validate-token` — Validate inspection token

**Key behaviors:**
- Inspection tokens are HMAC-signed, valid for 1 hour, format: `serialNumber.externalId.expiresOn.timestamp.keyId.signature`
- Sessions track progress through routes (PENDING → COMPLETE or EXPIRED)
- Alert rules are evaluated on creation within a transaction
- Inspection is recorded under the asset's site, not the inspector's

### Alerts (`/alerts`)

Generated from inspection responses based on configurable alert criteria.

| Method | Path | Capability | Description |
|--------|------|-----------|-------------|
| GET | `/` | — | List alerts with pagination |
| GET | `/:id` | — | Full alert details |
| POST | `/:id/resolve` | resolve-alerts | Resolve with optional note |
| POST | `/:id/attach-inspection-image` | perform-inspections | Attach evidence image |

**Key behaviors:**
- Auto-created when inspection responses match alert criteria (string matching, number ranges, date comparisons)
- Can have auto-resolve flag (resolves immediately on creation)
- Alert levels: LOW, MEDIUM, HIGH, CRITICAL
- Resolution tracks who resolved and when

### Tags (`/tags`)

Physical NFC labels linked to assets for inspection identification.

| Method | Path | Capability | Description |
|--------|------|-----------|-------------|
| POST | `/` | manage-assets | Create tag |
| GET | `/` | — | List with pagination |
| GET | `/for-inspection/:externalId` | — | Tag with asset and inspection questions |
| GET | `/for-asset-setup/:externalId` | — | Tag with asset and setup questions |
| GET | `/check-registration` | — | Check via inspection token |
| GET | `/:id` | — | Tag details |
| PATCH | `/:id` | manage-assets | Update tag |
| DELETE | `/:id` | manage-assets | Delete tag |
| POST | `/generate-signed-url` | program-tags | Generate single signed URL |
| POST | `/bulk-generate-signed-url/json` | program-tags | Bulk URLs as NDJSON stream |
| POST | `/bulk-generate-signed-url/csv` | program-tags | Bulk URLs as CSV stream |
| POST | `/register-tag` | register-tags | Register unregistered tag |

**Key behaviors:**
- HMAC-signed URLs for tag programming
- Unregistered tags (no client) are accessible to anyone
- Bulk generation supports serial number ranges with optional zero-padding
- Multi-client access validation respects role scope hierarchy

### Consumables (`/consumables`)

Items with expiration dates and quantities, publicly known as "Supplies."

| Method | Path | Capability | Description |
|--------|------|-----------|-------------|
| POST | `/` | manage-assets | Create |
| GET | `/` | — | List with pagination |
| GET | `/:id` | — | Get with asset and product |
| PATCH | `/:id` | manage-assets | Update |
| DELETE | `/:id` | manage-assets | Delete |

Auto-created during asset setup via question config mappings (e.g., a date response becomes an expiration date).

### Inspection Routes (`/inspection-routes`)

Predefined paths for systematic inspections with ordered points.

| Method | Path | Capability | Description |
|--------|------|-----------|-------------|
| POST | `/` | manage-routes | Create route |
| GET | `/` | — | List routes |
| GET | `/asset/:assetId` | — | Routes containing asset |
| GET | `/:id` | — | Route with sessions and points |
| PATCH | `/:id` | manage-routes | Update route |
| DELETE | `/:id` | manage-routes | Delete route |
| POST | `/:id/points` | manage-routes | Add point |
| GET | `/:id/points` | — | List points |
| GET | `/:id/points/:pointId` | — | Get point |
| PATCH | `/:id/points/:pointId` | manage-routes | Update point |
| DELETE | `/:id/points/:pointId` | manage-routes | Remove point |
| POST | `/:id/points/reorder` | manage-routes | Reorder points |

Sessions track an inspector's progress through a route (PENDING → COMPLETE or EXPIRED).

### Product Requests (`/product-requests`)

Workflow for requesting new products or supplies.

| Method | Path | Capability | Description |
|--------|------|-----------|-------------|
| POST | `/` | submit-requests | Submit request |
| GET | `/` | — | List with pagination |
| GET | `/:id` | — | Full details |
| PATCH | `/statuses` | approve-requests | Bulk update statuses |
| PATCH | `/:id` | submit-requests | Update request |
| DELETE | `/:id` | submit-requests | Delete |
| DELETE | `/:id/cancel` | submit-requests | Cancel request |
| PATCH | `/:id/review` | approve-requests | Add approval/review |

Workflow: NEW → APPROVED → RECEIVED → COMPLETE (or CANCELLED at any non-terminal state). Admin email notification queued on creation.

### Reports (`/reports`)

Canned compliance reports with CSV export.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | List available reports |
| GET | `/:id` | Build report with query filters |
| GET | `/:id/csv` | Export as CSV stream |

Reports are defined in configuration with configurable columns and date range filtering.

## Key Files

- `src/assets/assets/` — Asset CRUD, setup, configuration, alert triggering
- `src/assets/inspections/` — Inspection CRUD, sessions, public tag scanning
- `src/assets/alerts/` — Alert resolution and tracking
- `src/assets/tags/` — Tag management, signed URLs, registration
- `src/assets/consumables/` — Supply/consumable lifecycle
- `src/assets/inspection-routes/` — Route and point management
- `src/assets/product-requests/` — Request workflow
- `src/assets/reports/` — Canned reporting
