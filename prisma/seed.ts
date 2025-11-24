import { PrismaPg } from '@prisma/adapter-pg';
import * as dotenv from 'dotenv';
import { PrismaClient } from 'src/generated/prisma/client';
dotenv.config();

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({
  adapter,
});

async function main() {
  await prisma.$executeRaw`SELECT set_config('app.bypass_rls', 'on', FAlSE)`;

  // Clients
  const tzClient = await prisma.client.upsert({
    where: { externalId: 'z2q1bjupejrlun8zlrhposr6' },
    update: {},
    create: {
      externalId: 'z2q1bjupejrlun8zlrhposr6',
      name: 'ThreatZero Solutions LLC',
      startedOn: '2024-12-01T00:00:00.00000-06:00',
      address: {
        create: {
          street1: '393 W. Bacall Drive',
          city: 'Meridian',
          state: 'ID',
          zip: '83646',
        },
      },
      phoneNumber: '+12089540660',
    },
  });
  await prisma.site.upsert({
    where: { externalId: 'fjw2c5cqm4n7fiz42x9bz2ye' },
    update: {},
    create: {
      externalId: 'fjw2c5cqm4n7fiz42x9bz2ye',
      name: 'Mapleton Office',
      primary: false,
      address: {
        create: {
          street1: '1307 W 1000 S',
          city: 'Mapleton',
          state: 'UT',
          zip: '84664',
        },
      },
      phoneNumber: '+12089540660',
      client: {
        connect: {
          id: tzClient.id,
        },
      },
    },
  });

  // Product Categories
  const hepaCategory = await prisma.productCategory.create({
    data: {
      name: 'Air Purifier',
      shortName: 'HEPA',
    },
  });
  const aedCategory = await prisma.productCategory.create({
    data: {
      name: 'Automated External Defibrillator',
      shortName: 'AED',
    },
  });
  const bckCategory = await prisma.productCategory.create({
    data: {
      name: 'Bleeding Control Kit',
      shortName: 'BCK',
    },
  });
  const bagCategory = await prisma.productCategory.create({
    data: {
      name: 'Emergency Backpack',
      shortName: 'BAG',
    },
  });
  const eyeCategory = await prisma.productCategory.create({
    data: {
      name: 'Eye Wash Station',
      shortName: 'EYE',
    },
  });
  const fexCategory = await prisma.productCategory.create({
    data: {
      name: 'Fire Extinguisher',
      shortName: 'FEX',
    },
  });
  const firstAidCategory = await prisma.productCategory.create({
    data: {
      name: 'First Aid',
      shortName: 'FA',
    },
  });

  await prisma.manufacturer.create({
    data: {
      name: 'Generic',
    },
  });
  await prisma.manufacturer.create({
    data: {
      name: 'Cardiac Science',
      products: {
        createMany: {
          data: [
            {
              name: 'G5',
              type: 'PRIMARY',
              productCategoryId: aedCategory.id,
            },
            {
              name: 'G3',
              type: 'PRIMARY',
              productCategoryId: aedCategory.id,
            },
          ],
        },
      },
    },
  });
  await prisma.manufacturer.create({
    data: {
      name: 'Cisco',
      products: {
        createMany: {
          data: [
            {
              name: 'Cisco EPR Bag 2023',
              description: 'Cisco Emergency Backpack',
              type: 'PRIMARY',
              productCategoryId: bagCategory.id,
            },
          ],
        },
      },
    },
  });
  await prisma.manufacturer.create({
    data: {
      name: 'Defibtech',
      products: {
        createMany: {
          data: [
            {
              name: 'Defibtech LifeLine View',
              type: 'PRIMARY',
              productCategoryId: aedCategory.id,
            },
          ],
        },
      },
    },
  });
  await prisma.manufacturer.create({
    data: {
      name: 'Fellowes',
      products: {
        createMany: {
          data: [
            {
              name: 'AERAMAX PRO AM3',
              description: 'Commercial Coverage for 300-550 square feet',
              sku: 'AM3',
              type: 'PRIMARY',
              productCategoryId: hepaCategory.id,
            },
            {
              name: 'AERAMAX PRO AM4',
              description: 'Commercial Coverage for 650-1,100 square feet',
              sku: 'AM4',
              type: 'PRIMARY',
              productCategoryId: hepaCategory.id,
            },
          ],
        },
      },
    },
  });
  await prisma.manufacturer.create({
    data: {
      name: 'Fendall',
      products: {
        createMany: {
          data: [
            {
              name: '2000',
              type: 'PRIMARY',
              productCategoryId: eyeCategory.id,
            },
          ],
        },
      },
    },
  });
  await prisma.manufacturer.create({
    data: {
      name: 'Fire Extinguishers',
      products: {
        createMany: {
          data: [
            {
              name: 'Class A (Solid Combustible Materials)',
              description:
                'Fire extinguishers for fires involving ordinary combustible materials, such as wood, paper, and cloth.',
              type: 'PRIMARY',
              productCategoryId: fexCategory.id,
            },
            {
              name: 'Class B (Flammable Gases)',
              description:
                'Fire extinguishers to extinguish fires involving flammable and combustible liquids.',
              type: 'PRIMARY',
              productCategoryId: fexCategory.id,
            },
            {
              name: 'Class C (Flammable Gases)',
              description:
                'Fire extinguishers for use with fires involving energized electrical circuits.',
              type: 'PRIMARY',
              productCategoryId: fexCategory.id,
            },
            {
              name: 'Class D (Combustible Metals)',
              description:
                'Fire extinguishers for fires involving combustible metals.',
              type: 'PRIMARY',
              productCategoryId: fexCategory.id,
            },
          ],
        },
      },
    },
  });
  await prisma.manufacturer.create({
    data: {
      name: 'Guardian',
      products: {
        createMany: {
          data: [
            {
              name: 'Plumbed',
              type: 'PRIMARY',
              productCategoryId: eyeCategory.id,
            },
          ],
        },
      },
    },
  });
  await prisma.manufacturer.create({
    data: {
      name: 'Haws',
      products: {
        createMany: {
          data: [
            {
              name: '8300-8309 AXION® MSR EMERGENCY SHOWER AND EYE/FACE WASH',
              description: 'Plumbed Combination Drench Shower Eyewash',
              type: 'PRIMARY',
              productCategoryId: eyeCategory.id,
            },
          ],
        },
      },
    },
  });
  await prisma.manufacturer.create({
    data: {
      name: 'HeartSine',
      products: {
        createMany: {
          data: [
            {
              name: '350P',
              type: 'PRIMARY',
              productCategoryId: aedCategory.id,
            },
            {
              name: '360P',
              type: 'PRIMARY',
              productCategoryId: aedCategory.id,
            },
            {
              name: '450P',
              type: 'PRIMARY',
              productCategoryId: aedCategory.id,
            },
          ],
        },
      },
    },
  });
  await prisma.manufacturer.create({
    data: {
      name: 'North American Rescue',
      products: {
        createMany: {
          data: [
            {
              name: 'STB',
              description: 'Bleeding Control Kit',
              type: 'PRIMARY',
              productCategoryId: bckCategory.id,
            },
          ],
        },
      },
    },
  });
  await prisma.manufacturer.create({
    data: {
      name: 'Philips',
      products: {
        createMany: {
          data: [
            {
              name: 'Philips Onsite (HS1)',
              type: 'PRIMARY',
              productCategoryId: aedCategory.id,
            },
            {
              name: 'FRx',
              type: 'PRIMARY',
              productCategoryId: aedCategory.id,
            },
          ],
        },
      },
    },
  });
  await prisma.manufacturer.create({
    data: {
      name: 'Physio-Control',
      products: {
        createMany: {
          data: [
            {
              name: 'LIFEPAK CR Plus',
              type: 'PRIMARY',
              productCategoryId: aedCategory.id,
            },
            {
              name: 'LIFEPAK® CR2',
              type: 'PRIMARY',
              productCategoryId: aedCategory.id,
            },
          ],
        },
      },
    },
  });
  await prisma.manufacturer.create({
    data: {
      name: 'Smart Compliance',
      products: {
        createMany: {
          data: [
            {
              name: 'XL 150 with Meds',
              description:
                'General Business First Aid Cabinet with Medications',
              type: 'PRIMARY',
              productCategoryId: firstAidCategory.id,
            },
            {
              name: 'XL 150 without Meds',
              description:
                'General Business First Aid Cabinet Without Medications',
              type: 'PRIMARY',
              productCategoryId: firstAidCategory.id,
            },
            {
              name: 'M 25 without Meds',
              type: 'PRIMARY',
              productCategoryId: firstAidCategory.id,
            },
            {
              name: 'Large SmartCompliance First Aid Cabinet With Medication',
              type: 'PRIMARY',
              productCategoryId: firstAidCategory.id,
            },
            {
              name: 'Large Plastic SmartCompliance First Aid Cabinet Without Medication',
              type: 'PRIMARY',
              productCategoryId: firstAidCategory.id,
            },
            {
              name: 'First Aid Cabinet',
              description:
                '25 Person Medium First Aid Cabinet Without Medicatio',
              type: 'PRIMARY',
              productCategoryId: firstAidCategory.id,
            },
            {
              name: 'Heavy Duty Vehicl Kit',
              description: 'ANSI A Vehicle Kit',
              type: 'PRIMARY',
              productCategoryId: firstAidCategory.id,
            },
          ],
        },
      },
    },
  });
  await prisma.manufacturer.create({
    data: {
      name: 'Surgically Clean Air',
      products: {
        createMany: {
          data: [
            {
              name: 'Jade',
              type: 'PRIMARY',
              productCategoryId: hepaCategory.id,
            },
          ],
        },
      },
    },
  });
  await prisma.manufacturer.create({
    data: {
      name: 'Zoll',
      products: {
        createMany: {
          data: [
            {
              name: 'Zoll Plus',
              type: 'PRIMARY',
              productCategoryId: aedCategory.id,
            },
            {
              name: 'Zoll AED 3',
              type: 'PRIMARY',
              productCategoryId: aedCategory.id,
            },
          ],
        },
      },
    },
  });
  await prisma.$executeRaw`SELECT set_config('app.bypass_rls', 'off', FAlSE)`;
}
main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
