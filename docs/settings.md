# Settings Module

The settings module (`src/settings/`) provides a generic key-value settings block system backed by the database.

## Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/settings/global` | System admin | Get global settings |
| PATCH | `/settings/global` | System admin | Update global settings |

## How It Works

Settings are stored as JSON in `SettingsBlock` records identified by a `friendlyId`. The service handles:

- **Auto-creation**: If a settings block doesn't exist, it's created with default values
- **Default merging**: New default keys are automatically added to existing blocks
- **Caching**: Settings are cached in memory and invalidated on update

## Global Settings

The `global` settings block contains system-wide configuration:

- `systemEmailFromAddress` — Default sender for transactional emails
- `productRequestToAddress` — Where product request notifications are sent
- `landingFormLeadToAddress` — Where landing page form submissions go

## Key Files

- `src/settings/settings.controller.ts`
- `src/settings/settings.service.ts`
- `src/settings/dto/global-settings.dto.ts`
- `src/settings/constants.ts`
