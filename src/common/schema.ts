import { Prisma } from 'src/generated/prisma/client';
import { z } from 'zod';
import { PrismaOrderEmum, prismaStringFilter } from './validation';

export const createAddressSchema = z.object({
  street1: z.string(),
  street2: z.string().optional(),
  city: z.string(),
  state: z.string(),
  zip: z.string(),
}) satisfies z.Schema<Prisma.AddressCreateInput>;

export const filterAddressSchema = z
  .object({
    street1: prismaStringFilter(z.string()),
    street2: prismaStringFilter(z.string()),
    city: prismaStringFilter(z.string()),
    state: prismaStringFilter(z.string()),
    zip: prismaStringFilter(z.string()),
  })
  .partial() satisfies z.Schema<Prisma.AddressWhereInput>;

export const orderAddressSchema = z
  .object({
    street1: PrismaOrderEmum,
    street2: PrismaOrderEmum,
    city: PrismaOrderEmum,
    state: PrismaOrderEmum,
    zip: PrismaOrderEmum,
  })
  .partial() satisfies z.Schema<Prisma.AddressOrderByWithRelationInput>;

export const CreateRegulatoryCodeSchema = z.object({
  active: z.boolean().default(true),
  codeIdentifier: z.string(),
  title: z.string(),
  section: z.string().optional(),
  governingBody: z.string(),
  jurisdiction: z.string().optional(),
  description: z.string().optional(),
  requirements: z.string().optional(),
  sourceUrl: z.string().url().optional(),
  documentVersion: z.string().optional(),
  effectiveDate: z.string().datetime().optional(),
  supersededDate: z.string().datetime().optional(),
  inspectionFrequency: z.string().optional(),
  complianceNotes: z.string().optional(),
}) satisfies z.Schema<Prisma.RegulatoryCodeCreateInput>;
