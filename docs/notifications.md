# Notifications System

## Overview

Shield API uses BullMQ for background job processing with two notification queues. Emails are sent via Resend and SMS via Telnyx. Email templates are built with React Email.

## Architecture

```
NotificationsService
  │
  ├─ sendEmail()        → Direct send via Resend
  ├─ sendSms()          → Direct send via Telnyx
  ├─ queueEmail()       → Queue for async processing
  └─ queueNewProductRequestEmail()
        │
        ▼
  BullMQ Queues
  ├─ shield:send-notifications    → NotificationsProcessor
  └─ shield:client-notifications  → ClientNotificationsProcessor
```

## Queues

### `send-notifications`

General-purpose notification queue. Handles:
- `SEND_EMAIL` — Send a templated email
- `SEND_NEW_PRODUCT_REQUEST_EMAIL` — Send product request notification

**Retry policy:** 3 attempts with exponential backoff (5s base delay).

### `client-notifications`

Client-specific notification queue. Handles:
- `SEND_INSPECTION_ALERT_TRIGGERED_EMAIL` — Alert notification to subscribed users

**Retry policy:** Currently no retry configured (see TODO in module).

All queues use the prefix `shield:` in Redis.

## Notification Types

Defined in `src/notifications/notification-types.ts`. These represent notification groups that users can subscribe to:

| Group ID | Description |
|----------|-------------|
| `inspection_reminder` | Due in 25 days or 85% of inspection period |
| `inspection_due_soon_alert_level_1` | Due in 14 days or 50% of period |
| `inspection_due_soon_alert_level_2` | Due in 10 days or 35% of period |
| `inspection_due_soon_alert_level_3` | Due in 7 days or 25% of period |
| `inspection_due_soon_alert_level_4` | Due in 3 days or 15% of period |
| `monthly_compliance_report` | Monthly asset compliance summary |
| `monthly_consumables_report` | Monthly expiring consumables report |
| `inspection_alert_triggered` | Real-time alert on failed inspections |

Each reminder level uses a dual-threshold system: whichever is reached first (percentage of inspection period OR absolute days) triggers the notification.

## Email Templates

Templates are React Email components in `src/notifications/templates/`. Each template exports:

- **Default export** — The React component
- **Subject** — Email subject (string or function of props)
- **Text** — Plain text version (function of props)
- **PreviewProps** — Default props for development/testing

Template mapping is in `src/notifications/lib/templates.ts` via `TEMPLATE_NAME_MAP`.

### Development

```bash
npm run email:dev    # Start React Email dev server
```

### Sending a templated email

```typescript
// Queue for async processing
await this.notifications.queueEmail({
  templateName: 'inspection_reminder',
  to: ['user@example.com'],
  templateProps: { ... },
});

// Or send directly
await this.notifications.sendTemplateEmail({
  templateName: 'test',
  to: ['user@example.com'],
});
```

## SMS

SMS is sent via Telnyx using the configured `TELNYX_PHONE_NUMBER` as the sender:

```typescript
await this.notifications.sendSms({
  to: '+15551234567',
  text: 'Your inspection is due soon.',
});
```

## Scheduler

`NotificationsScheduler` (`src/notifications/notifications.scheduler.ts`) runs cron-based jobs for recurring notifications like inspection reminders and monthly reports.

## Job Management

The `NotificationsController` provides endpoints for viewing and managing queue jobs:

- View failed, waiting, and active jobs across all queues
- Retry failed jobs
- Remove jobs

## Key Files

- `src/notifications/notifications.service.ts` - Core service (send, queue, manage)
- `src/notifications/notifications.module.ts` - Module with queue registration
- `src/notifications/notifications.scheduler.ts` - Cron-based scheduling
- `src/notifications/processors/notifications.processor.ts` - General queue processor
- `src/notifications/processors/client-notifications.processor.ts` - Client queue processor
- `src/notifications/notification-types.ts` - Notification group definitions
- `src/notifications/lib/templates.ts` - Template registry
- `src/notifications/lib/constants.ts` - Queue names and job names
- `src/notifications/templates/` - React Email templates
