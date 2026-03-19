# Products Module

The products module (`src/products/`) manages the product catalog — the templates from which assets and consumables are created.

## Sub-Modules

### Products (`/products`)

The core catalog items. Products define what an asset is (type, manufacturer, category) and what questions should be asked during setup and inspection.

| Method | Path | Capability | Description |
|--------|------|-----------|-------------|
| POST | `/` | configure-products | Create product |
| GET | `/` | — | List with pagination |
| GET | `/:id` | — | Product with questions, categories, consumables |
| PATCH | `/:id` | configure-products | Update product |
| DELETE | `/:id` | configure-products | Delete product |
| POST | `/:id/questions` | configure-products | Add question to product |
| PATCH | `/:id/questions/:questionId` | configure-products | Update question |
| DELETE | `/:id/questions/:questionId` | configure-products | Remove question |

Products have a `ProductType`: `PRIMARY` (becomes an asset) or `CONSUMABLE` (becomes a supply).

### Manufacturers (`/manufacturers`)

Companies that make products.

| Method | Path | Capability | Description |
|--------|------|-----------|-------------|
| POST | `/` | configure-products | Create |
| GET | `/` | — | List with product counts |
| GET | `/generic` | — | Get or create generic manufacturer |
| GET | `/:id` | — | With products |
| PATCH | `/:id` | configure-products | Update |
| DELETE | `/:id` | configure-products | Delete |

The "generic" manufacturer is a system-level fallback created via `bypassRLS()`.

### Product Categories (`/product-categories`)

Groupings for products (e.g., "Fire Extinguishers", "First Aid Kits").

| Method | Path | Capability | Description |
|--------|------|-----------|-------------|
| POST | `/` | configure-products | Create |
| GET | `/` | — | List with product counts |
| GET | `/:id` | — | With products |
| PATCH | `/:id` | configure-products | Update |
| DELETE | `/:id` | configure-products | Delete |
| POST | `/:id/questions` | configure-products | Add category-level question |
| PATCH | `/:id/questions/:questionId` | configure-products | Update question |
| DELETE | `/:id/questions/:questionId` | configure-products | Remove question |

Category-level questions apply to all products in the category.

### ANSI Categories (`/ansi-categories`)

ANSI standard classification codes for products.

| Method | Path | Capability | Description |
|--------|------|-----------|-------------|
| POST | `/` | configure-products | Create |
| GET | `/` | — | List with pagination |
| GET | `/:id` | — | Get single |
| PATCH | `/:id` | configure-products | Update |
| DELETE | `/:id` | configure-products | Delete |

### Asset Questions (`/asset-questions`)

Configurable questions asked during asset setup and inspection. This is the most complex sub-module.

| Method | Path | Capability | Description |
|--------|------|-----------|-------------|
| GET | `/region-options/states` | — | US state options |
| GET | `/customizations` | — | Client question customizations |
| POST | `/customizations` | configure-products | Add customization |
| PATCH | `/customizations/:id` | configure-products | Update customization |
| DELETE | `/customizations/:id` | configure-products | Remove customization |
| GET | `/by-asset/:assetId` | — | Questions applicable to asset |
| GET | `/by-asset-properties` | — | Questions by product/category/metadata |
| GET | `/check-configuration-by-asset/:assetId` | — | Audit asset config |
| POST | `/` | configure-products | Create question |
| GET | `/` | — | List (parent questions only) |
| GET | `/:id` | — | With variants, conditions, alert criteria |
| PATCH | `/:id` | configure-products | Update |
| DELETE | `/:id` | configure-products | Delete |
| POST | `/:id/variants` | configure-products | Add variant |
| POST | `/:id/conditions` | configure-products | Add condition |
| PATCH | `/conditions/:id` | configure-products | Update condition |
| DELETE | `/conditions/:id` | configure-products | Remove condition |
| POST | `/migrate-to-conditions` | system admin | Legacy migration |

**Key concepts:**
- **Question types**: SETUP, INSPECTION, CONFIGURATION, BOTH
- **Response types**: BINARY, INDETERMINATE_BINARY, TEXT, TEXTAREA, DATE, NUMBER, IMAGE, SELECT
- **Conditions**: Rules that determine when a question applies (based on product, category, manufacturer, region, metadata)
- **Variants**: Question variations (parent/child hierarchy)
- **Client customizations**: Per-client toggles to enable/disable specific questions
- **Alert criteria**: Rules attached to questions that auto-generate alerts from responses
- **Consumable configs**: Map question responses to consumable fields (e.g., date → expiration)
- **Metadata configs**: Map question responses to asset/product metadata

## Key Files

- `src/products/products/` — Product CRUD with nested questions
- `src/products/manufacturers/` — Manufacturer CRUD
- `src/products/product-categories/` — Category CRUD with nested questions
- `src/products/ansi-categories/` — ANSI code CRUD
- `src/products/asset-questions/` — Question management, conditions, variants, customizations
