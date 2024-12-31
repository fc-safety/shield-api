import { Injectable } from '@nestjs/common';
import { as404OrThrow } from 'src/common/utils';
import { buildPrismaFindArgs } from 'src/common/validation';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateClientDto } from './dto/create-client.dto';
import { QueryClientDto } from './dto/query-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';

@Injectable()
export class ClientsService {
  constructor(private readonly prisma: PrismaService) {}

  create(createClientDto: CreateClientDto) {
    return this.prisma.bypassRLS().client.create({ data: createClientDto });
  }

  findAll(queryClientDto?: QueryClientDto) {
    return this.prisma
      .bypassRLS()
      .client.findManyForPage(
        buildPrismaFindArgs<typeof this.prisma.client>(queryClientDto),
      );
  }

  findOne(id: string) {
    return this.prisma
      .bypassRLS()
      .client.findUniqueOrThrow({ where: { id } })
      .catch(as404OrThrow);
  }

  update(id: string, updateClientDto: UpdateClientDto) {
    return this.prisma
      .bypassRLS()
      .client.update({
        where: { id },
        data: updateClientDto,
      })
      .catch(as404OrThrow);
  }

  remove(id: string) {
    return this.prisma.bypassRLS().client.delete({ where: { id } });
  }
}
