/**
 * Backfill script to sync Keycloak user profile data to Person records.
 *
 * This script reads user attributes from Keycloak (phoneNumber, position, active)
 * and updates the corresponding Person records in the database.
 *
 * Usage:
 *   npx ts-node scripts/backfill-person-profile.ts
 *
 * Environment variables required:
 *   DATABASE_URL - PostgreSQL connection string
 *   KEYCLOAK_ADMIN_CLIENT_BASE_URL - Keycloak base URL
 *   KEYCLOAK_ADMIN_CLIENT_ADMIN_REALM - Keycloak admin realm
 *   KEYCLOAK_ADMIN_CLIENT_DEFAULT_REALM - Keycloak default realm
 *   KEYCLOAK_ADMIN_CLIENT_CLIENT_ID - Keycloak client ID
 *   KEYCLOAK_ADMIN_CLIENT_CLIENT_SECRET - Keycloak client secret
 */

import KeycloakAdminClient from '@keycloak/keycloak-admin-client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as dotenv from 'dotenv';
import { PrismaClient } from 'src/generated/prisma/client';

dotenv.config();

// Initialize Prisma client
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({
  adapter,
});

// Initialize Keycloak client
const keycloak = new KeycloakAdminClient({
  realmName: process.env.KEYCLOAK_ADMIN_CLIENT_ADMIN_REALM,
  baseUrl: process.env.KEYCLOAK_ADMIN_CLIENT_BASE_URL,
});

interface BackfillStats {
  totalUsers: number;
  updated: number;
  skipped: number;
  notFound: number;
  errors: number;
}

async function authenticateKeycloak() {
  await keycloak.auth({
    grantType: 'client_credentials',
    clientId: process.env.KEYCLOAK_ADMIN_CLIENT_CLIENT_ID!,
    clientSecret: process.env.KEYCLOAK_ADMIN_CLIENT_CLIENT_SECRET!,
  });

  keycloak.setConfig({
    realmName: process.env.KEYCLOAK_ADMIN_CLIENT_DEFAULT_REALM,
  });
}

async function getAllKeycloakUsers() {
  const allUsers: Array<{
    userId: string;
    phoneNumber: string | null;
    position: string | null;
    active: boolean;
  }> = [];

  let first = 0;
  const max = 100;
  let hasMore = true;

  console.log('Fetching users from Keycloak...');

  while (hasMore) {
    const users = await keycloak.users.find({ first, max });

    for (const user of users) {
      const userId = user.attributes?.user_id?.[0];
      if (!userId) continue;

      allUsers.push({
        userId,
        phoneNumber: user.attributes?.phone_number?.[0] ?? null,
        position: user.attributes?.user_position?.[0] ?? null,
        active: user.enabled ?? true,
      });
    }

    console.log(`  Fetched ${allUsers.length} users so far...`);

    if (users.length < max) {
      hasMore = false;
    } else {
      first += max;
    }
  }

  console.log(`Total Keycloak users with user_id: ${allUsers.length}`);
  return allUsers;
}

async function backfillPersonProfiles(): Promise<BackfillStats> {
  const stats: BackfillStats = {
    totalUsers: 0,
    updated: 0,
    skipped: 0,
    notFound: 0,
    errors: 0,
  };

  // Bypass RLS for this operation
  await prisma.$executeRaw`SELECT set_config('app.bypass_rls', 'on', FALSE)`;

  try {
    // Get all Keycloak users
    const keycloakUsers = await getAllKeycloakUsers();
    stats.totalUsers = keycloakUsers.length;

    console.log('\nBackfilling Person records...');

    for (const kcUser of keycloakUsers) {
      try {
        // Check if Person exists
        const person = await prisma.person.findUnique({
          where: { id: kcUser.userId },
        });

        if (!person) {
          stats.notFound++;
          continue;
        }

        // Check if any fields need updating
        const needsUpdate =
          person.phoneNumber !== kcUser.phoneNumber ||
          person.position !== kcUser.position ||
          person.active !== kcUser.active;

        if (!needsUpdate) {
          stats.skipped++;
          continue;
        }

        // Update Person record
        await prisma.person.update({
          where: { id: kcUser.userId },
          data: {
            phoneNumber: kcUser.phoneNumber,
            position: kcUser.position,
            active: kcUser.active,
          },
        });

        stats.updated++;

        if (stats.updated % 50 === 0) {
          console.log(`  Updated ${stats.updated} records...`);
        }
      } catch (error) {
        console.error(`  Error updating Person ${kcUser.userId}:`, error);
        stats.errors++;
      }
    }
  } finally {
    // Restore RLS
    await prisma.$executeRaw`SELECT set_config('app.bypass_rls', 'off', FALSE)`;
  }

  return stats;
}

async function main() {
  console.log('=== Person Profile Backfill Script ===\n');

  // Authenticate with Keycloak
  console.log('Authenticating with Keycloak...');
  await authenticateKeycloak();
  console.log('Authenticated successfully.\n');

  // Run backfill
  const stats = await backfillPersonProfiles();

  // Print summary
  console.log('\n=== Backfill Complete ===');
  console.log(`Total Keycloak users processed: ${stats.totalUsers}`);
  console.log(`Person records updated: ${stats.updated}`);
  console.log(`Person records skipped (no changes): ${stats.skipped}`);
  console.log(`Person records not found: ${stats.notFound}`);
  console.log(`Errors: ${stats.errors}`);
}

// Run if called directly
if (require.main === module) {
  main()
    .then(async () => {
      await prisma.$disconnect();
      process.exit(0);
    })
    .catch(async (e) => {
      console.error('Error during backfill:', e);
      await prisma.$disconnect();
      process.exit(1);
    });
}

export { backfillPersonProfiles };
