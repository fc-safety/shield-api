import { Injectable } from '@nestjs/common';
import { buildPrismaFindArgs } from 'src/common/validation';
import { PrismaService } from '../../prisma/prisma.service'; // Adjusted the import path
import { CreateVaultOwnershipDto } from './dto/create-vault-ownership.dto';
import { QueryViewOwnershipDto } from './dto/query-view-ownership.dto';
import { UpdateVaultOwnershipDto } from './dto/update-vault-ownership.dto';

@Injectable()
export class VaultOwnershipsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createVaultOwnershipDto: CreateVaultOwnershipDto) {
    return await this.prisma.forUser().then((prisma) =>
      prisma.vaultOwnership.create({
        data: createVaultOwnershipDto,
      }),
    );
  }

  async findAll(queryViewOwnershipDto: QueryViewOwnershipDto) {
    return await this.prisma
      .forContext()
      .then((prisma) =>
        prisma.vaultOwnership.findManyForPage(
          buildPrismaFindArgs<typeof prisma.vaultOwnership>(
            queryViewOwnershipDto,
          ),
        ),
      );
  }

  async findOne(id: string) {
    return await this.prisma.forContext().then((prisma) =>
      prisma.vaultOwnership.findUnique({
        where: { id },
      }),
    );
  }

  async findOneByKey(key: string) {
    return await this.prisma.forUser().then((prisma) =>
      prisma.vaultOwnership.findUnique({
        where: { key },
      }),
    );
  }

  async update(id: string, updateVaultOwnershipDto: UpdateVaultOwnershipDto) {
    return await this.prisma.forUser().then((prisma) =>
      prisma.vaultOwnership.update({
        where: { id },
        data: updateVaultOwnershipDto,
      }),
    );
  }

  async remove(id: string) {
    return await this.prisma.forUser().then((prisma) =>
      prisma.vaultOwnership.delete({
        where: { id },
      }),
    );
  }
}
