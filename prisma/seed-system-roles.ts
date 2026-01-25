/**
 * Seed script for system roles that mirror common Keycloak group permissions.
 *
 * Usage:
 *   npx ts-node prisma/seed-system-roles.ts
 *
 * These roles are marked as isSystem=true and cannot be deleted through the API.
 */

import { PrismaPg } from '@prisma/adapter-pg';
import * as dotenv from 'dotenv';
import { ACTION_PERMISSIONS, VISIBILITY } from 'src/auth/permissions';
import { PrismaClient } from 'src/generated/prisma/client';

dotenv.config();

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({
  adapter,
});

/**
 * System roles with their associated permissions.
 * These mirror common Keycloak group configurations.
 */
const SYSTEM_ROLES = [
  {
    name: 'Super Admin',
    description:
      'Full system access across all clients. Can manage all resources and users.',
    permissions: [VISIBILITY.SUPER_ADMIN, ...ACTION_PERMISSIONS],
  },
  {
    name: 'Global Admin',
    description:
      'Cross-client visibility with full resource management capabilities.',
    permissions: [VISIBILITY.GLOBAL, ...ACTION_PERMISSIONS],
  },
  {
    name: 'Client Admin',
    description:
      'Full access within a single client, including all sites and resources.',
    permissions: [
      VISIBILITY.CLIENT_SITES,
      ...ACTION_PERMISSIONS.filter(
        (p) =>
          !p.includes('clients') &&
          !p.includes('ansi-categories') &&
          !p.includes('manufacturers'),
      ),
    ],
  },
  {
    name: 'Site Manager',
    description:
      'Manage assets, inspections, and alerts for assigned sites within a client.',
    permissions: [
      VISIBILITY.CLIENT_SITES,
      'read:assets',
      'create:assets',
      'update:assets',
      'read:consumables',
      'create:consumables',
      'update:consumables',
      'read:tags',
      'program:tags',
      'register:tags',
      'read:inspections',
      'create:inspections',
      'read:inspection-routes',
      'create:inspection-routes',
      'update:inspection-routes',
      'read:alerts',
      'resolve:alerts',
      'read:people',
      'read:sites',
      'read:products',
      'read:product-categories',
      'read:manufacturers',
      'setup:assets',
    ],
  },
  {
    name: 'Inspector',
    description: 'Can perform inspections and view assets at assigned site(s).',
    permissions: [
      VISIBILITY.SINGLE_SITE,
      'read:assets',
      'read:consumables',
      'read:tags',
      'read:inspections',
      'create:inspections',
      'read:inspection-routes',
      'read:alerts',
      'read:sites',
      'read:products',
      'read:product-categories',
    ],
  },
  {
    name: 'Viewer',
    description: 'Read-only access to assets and inspections at assigned site.',
    permissions: [
      VISIBILITY.SINGLE_SITE,
      'read:assets',
      'read:consumables',
      'read:tags',
      'read:inspections',
      'read:alerts',
      'read:sites',
      'read:products',
      'read:product-categories',
    ],
  },
];

async function seedSystemRoles() {
  console.log('Seeding system roles...');

  await prisma.$executeRaw`SELECT set_config('app.bypass_rls', 'on', FALSE)`;

  for (const roleData of SYSTEM_ROLES) {
    console.log(`  Creating role: ${roleData.name}`);

    // Check if global role already exists (null clientId doesn't work well with unique constraint)
    let role = await prisma.role.findFirst({
      where: {
        name: roleData.name,
        clientId: null,
      },
    });

    if (role) {
      // Update existing role
      role = await prisma.role.update({
        where: { id: role.id },
        data: {
          description: roleData.description,
          isSystem: true,
        },
      });
    } else {
      // Create new role
      role = await prisma.role.create({
        data: {
          name: roleData.name,
          description: roleData.description,
          isSystem: true,
          clientId: null,
        },
      });
    }

    // Get existing permissions
    const existingPermissions = await prisma.rolePermission.findMany({
      where: { roleId: role.id },
      select: { permission: true },
    });
    const existingPermissionSet = new Set(
      existingPermissions.map((p) => p.permission),
    );

    // Add missing permissions
    const permissionsToAdd = roleData.permissions.filter(
      (p) => !existingPermissionSet.has(p),
    );

    if (permissionsToAdd.length > 0) {
      await prisma.rolePermission.createMany({
        data: permissionsToAdd.map((permission) => ({
          roleId: role.id,
          permission,
        })),
        skipDuplicates: true,
      });
      console.log(`    Added ${permissionsToAdd.length} permissions`);
    }

    console.log(
      `    Role ${roleData.name} has ${roleData.permissions.length} total permissions`,
    );
  }

  await prisma.$executeRaw`SELECT set_config('app.bypass_rls', 'off', FALSE)`;

  console.log('System roles seeded successfully!');
}

// Run if called directly
if (require.main === module) {
  seedSystemRoles()
    .then(async () => {
      await prisma.$disconnect();
    })
    .catch(async (e) => {
      console.error('Error seeding system roles:', e);
      await prisma.$disconnect();
      process.exit(1);
    });
}

export { seedSystemRoles, SYSTEM_ROLES };
