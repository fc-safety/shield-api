/**
 * Seed script for system roles with capabilities and scope.
 *
 * Usage:
 *   npx ts-node prisma/seed-system-roles.ts
 *
 * These roles are marked as isSystem=true and cannot be deleted through the API.
 */

import { PrismaPg } from '@prisma/adapter-pg';
import * as dotenv from 'dotenv';
import { CAPABILITIES, TCapability } from 'src/auth/utils/capabilities';
import { RoleScope } from 'src/auth/utils/scope';
import { PrismaClient } from 'src/generated/prisma/client';

dotenv.config();

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({
  adapter,
});

/**
 * System roles with their associated scope and capabilities.
 */
const DEFAULT_ROLES: Array<{
  name: string;
  description: string;
  isSystem: boolean;
  scope: RoleScope;
  capabilities: TCapability[];
  clientAssignable: boolean;
}> = [
  {
    name: 'Super Admin',
    description:
      'Full system access across all clients. Can manage all resources and users.',
    isSystem: true,
    scope: RoleScope.SYSTEM,
    capabilities: Object.values(CAPABILITIES),
    clientAssignable: false,
  },
  {
    name: 'Program Administrator',
    description:
      'Full access within a single client, including all sites and resources.',
    isSystem: false,
    scope: RoleScope.CLIENT,
    capabilities: [
      CAPABILITIES.PERFORM_INSPECTIONS,
      CAPABILITIES.SUBMIT_REQUESTS,
      CAPABILITIES.MANAGE_ASSETS,
      CAPABILITIES.MANAGE_ROUTES,
      CAPABILITIES.RESOLVE_ALERTS,
      CAPABILITIES.VIEW_REPORTS,
      CAPABILITIES.MANAGE_USERS,
      CAPABILITIES.APPROVE_REQUESTS,
      CAPABILITIES.REGISTER_TAGS,
    ],
    clientAssignable: true,
  },
  {
    name: 'Site Group Manager',
    description:
      'Manage assets, inspections, and alerts for assigned site group and site subgroups within a client.',
    isSystem: false,
    scope: RoleScope.SITE_GROUP,
    capabilities: [
      CAPABILITIES.PERFORM_INSPECTIONS,
      CAPABILITIES.SUBMIT_REQUESTS,
      CAPABILITIES.MANAGE_ASSETS,
      CAPABILITIES.MANAGE_ROUTES,
      CAPABILITIES.RESOLVE_ALERTS,
      CAPABILITIES.VIEW_REPORTS,
      CAPABILITIES.MANAGE_USERS,
      CAPABILITIES.APPROVE_REQUESTS,
      CAPABILITIES.REGISTER_TAGS,
    ],
    clientAssignable: true,
  },
  {
    name: 'Site Manager',
    description:
      'Manage assets, inspections, and alerts for assigned site within a client.',
    isSystem: false,
    scope: RoleScope.SITE,
    capabilities: [
      CAPABILITIES.PERFORM_INSPECTIONS,
      CAPABILITIES.SUBMIT_REQUESTS,
      CAPABILITIES.MANAGE_ASSETS,
      CAPABILITIES.MANAGE_ROUTES,
      CAPABILITIES.RESOLVE_ALERTS,
      CAPABILITIES.VIEW_REPORTS,
      CAPABILITIES.REGISTER_TAGS,
    ],
    clientAssignable: true,
  },
  {
    name: 'Inspector',
    description: 'Can perform inspections and view assets at assigned site(s).',
    isSystem: false,
    scope: RoleScope.SITE,
    capabilities: [
      CAPABILITIES.PERFORM_INSPECTIONS,
      CAPABILITIES.SUBMIT_REQUESTS,
    ],
    clientAssignable: true,
  },
  {
    name: 'Viewer',
    description: 'Read-only access to assets and inspections at assigned site.',
    isSystem: false,
    scope: RoleScope.SITE,
    capabilities: [CAPABILITIES.VIEW_REPORTS],
    clientAssignable: true,
  },
  {
    name: 'Product Manager',
    description:
      'Can configure products, categories, and manufacturers globally.',
    isSystem: false,
    scope: RoleScope.GLOBAL,
    capabilities: [CAPABILITIES.CONFIGURE_PRODUCTS],
    clientAssignable: false,
  },
  {
    name: 'Tag Programmer',
    description: 'Can program and register NFC tags.',
    isSystem: false,
    scope: RoleScope.GLOBAL,
    capabilities: [CAPABILITIES.PROGRAM_TAGS],
    clientAssignable: false,
  },
];

async function seedSystemRoles() {
  console.log('Seeding system roles...');

  await prisma.$executeRaw`SELECT set_config('app.bypass_rls', 'on', FALSE)`;

  for (const roleData of DEFAULT_ROLES) {
    console.log(`  Creating role: ${roleData.name}`);

    // Check if global role already exists (null clientId doesn't work well with unique constraint)
    let role = await prisma.role.findFirst({
      where: {
        name: roleData.name,
      },
    });

    if (role) {
      // Update existing role
      role = await prisma.role.update({
        where: { id: role.id },
        data: {
          description: roleData.description,
          isSystem: roleData.isSystem,
          scope: roleData.scope,
          capabilities: roleData.capabilities,
          clientAssignable: roleData.clientAssignable,
        },
      });
      console.log(`    Updated existing role`);
    } else {
      // Create new role
      role = await prisma.role.create({
        data: {
          name: roleData.name,
          description: roleData.description,
          isSystem: roleData.isSystem,
          scope: roleData.scope,
          capabilities: roleData.capabilities,
          clientAssignable: roleData.clientAssignable,
        },
      });
      console.log(`    Created new role`);
    }

    console.log(
      `    Role ${roleData.name}: scope=${roleData.scope}, ${roleData.capabilities.length} capabilities`,
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

export { seedSystemRoles, DEFAULT_ROLES as SYSTEM_ROLES };
