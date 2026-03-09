# Media & Vault Ownerships

## Overview

The media module manages file ownership records through "vault ownerships." A vault ownership links a file (stored in an external vault/storage service) to a specific record in the database, establishing which entity owns each uploaded file.

## Vault Ownerships

A `VaultOwnership` record tracks:
- **key** — Unique identifier for the file in the external vault
- **ownerType** — The type of entity that owns the file (e.g., asset, inspection)
- **ownerId** — The ID of the owning entity

This allows the API to track which files belong to which records without storing the files directly.

## CRUD Operations

Standard CRUD endpoints are provided:
- `POST /vault-ownerships` — Create a new ownership record
- `GET /vault-ownerships` — List ownership records (with pagination)
- `GET /vault-ownerships/:id` — Get a specific ownership record
- `PATCH /vault-ownerships/:id` — Update an ownership record
- `DELETE /vault-ownerships/:id` — Delete an ownership record

Additionally, `findOneByKey()` allows lookup by the vault key.

## Key Files

- `src/media/vault-ownerships/vault-ownerships.controller.ts` - REST endpoints
- `src/media/vault-ownerships/vault-ownerships.service.ts` - CRUD service
- `src/media/vault-ownerships/dto/` - Create, update, and query DTOs
- `src/media/media.module.ts` - Parent module
