import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { buildPrismaFindArgs } from 'src/common/validation';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateInspectionRoutePointDto } from './dto/create-inspection-route-point.dto';
import { CreateInspectionRouteDto } from './dto/create-inspection-route.dto';
import { QueryInspectionRoutePointDto } from './dto/query-inspection-route-point.dto';
import { QueryInspectionRouteDto } from './dto/query-inspection-route.dto';
import { ReorderInspectionRoutePointsDto } from './dto/reorder-inspection-route-points.dto';
import { UpdateInspectionRoutePointDto } from './dto/update-inspection-route-point.dto';
import { UpdateInspectionRouteDto } from './dto/update-inspection-route.dto';

@Injectable()
export class InspectionRoutesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createInspectionRouteDto: CreateInspectionRouteDto) {
    const prisma = await this.prisma.forUser();
    return prisma.inspectionRoute.create({
      data: createInspectionRouteDto,
    });
  }

  async findAll(query?: QueryInspectionRouteDto) {
    const prisma = await this.prisma.forUser();
    return prisma.inspectionRoute.findManyForPage(
      buildPrismaFindArgs(query, {
        include: {
          inspectionRoutePoints: {
            include: {
              asset: true,
            },
            orderBy: {
              order: 'asc',
            },
          },
        },
      }),
    );
  }

  async findOne(id: string) {
    const prisma = await this.prisma.forUser();
    return prisma.inspectionRoute.findUnique({
      where: { id },
      include: {
        inspectionRoutePoints: {
          include: {
            asset: true,
          },
          orderBy: {
            order: 'asc',
          },
        },
      },
    });
  }

  async update(id: string, updateInspectionRouteDto: UpdateInspectionRouteDto) {
    const prisma = await this.prisma.forUser();
    return prisma.inspectionRoute.update({
      where: { id },
      data: updateInspectionRouteDto,
    });
  }

  async remove(id: string) {
    const prisma = await this.prisma.forUser();
    return prisma.inspectionRoute.delete({
      where: { id },
    });
  }

  async findAllForAssetId(assetId: string) {
    return this.prisma.forUser().then((prisma) =>
      prisma.inspectionRoute.findMany({
        where: {
          inspectionRoutePoints: {
            some: {
              assetId,
            },
          },
        },
        include: {
          inspectionRoutePoints: true,
        },
      }),
    );
  }

  async createPoint(
    inspectionRouteId: string,
    createInspectionRoutePointDto: CreateInspectionRoutePointDto,
  ) {
    const prisma = await this.prisma.forUser();
    return prisma.inspectionRoute.update({
      where: { id: inspectionRouteId },
      data: {
        inspectionRoutePoints: {
          create: createInspectionRoutePointDto,
        },
      },
    });
  }

  async findAllPoints(
    inspectionRouteId: string,
    query?: QueryInspectionRoutePointDto,
  ) {
    const prisma = await this.prisma.forUser();
    return prisma.inspectionRoutePoint.findManyForPage(
      buildPrismaFindArgs(query, {
        where: {
          inspectionRouteId,
        },
      }),
    );
  }

  async findOnePoint(inspectionRouteId: string, id: string) {
    const prisma = await this.prisma.forUser();
    return prisma.inspectionRoutePoint.findUnique({
      where: { id, inspectionRouteId },
    });
  }

  async updatePoint(
    inspectionRouteId: string,
    id: string,
    updateInspectionRoutePointDto: UpdateInspectionRoutePointDto,
  ) {
    const prisma = await this.prisma.forUser();
    return prisma.inspectionRoute.update({
      where: { id: inspectionRouteId },
      data: {
        inspectionRoutePoints: {
          update: {
            where: { id },
            data: updateInspectionRoutePointDto,
          },
        },
      },
    });
  }

  async removePoint(inspectionRouteId: string, id: string) {
    const prisma = await this.prisma.forUser();
    return prisma.inspectionRoute.update({
      where: { id: inspectionRouteId },
      data: {
        inspectionRoutePoints: {
          delete: {
            id,
          },
        },
      },
    });
  }

  async reorderPoints(
    inspectionRouteId: string,
    reorderInspectionRoutePointsDto: ReorderInspectionRoutePointsDto,
  ) {
    const prisma = await this.prisma.forUser();
    const allPoints = await prisma.inspectionRoutePoint.findMany({
      where: { inspectionRouteId },
      orderBy: { order: 'asc' },
    });

    // Get current index of point to move.
    const currentIndex = allPoints.findIndex(
      (point) => point.id === reorderInspectionRoutePointsDto.id,
    );

    // Get point to move and remove it from the allPoints array.
    const pointToMove = allPoints.splice(currentIndex, 1)[0];

    const moveForward =
      reorderInspectionRoutePointsDto.order > pointToMove.order;

    // Get new index of point to move by finding the number of points that
    // have an order less than the new order. If this is ZERO it
    // will be inserted at the beginning of the array.
    //
    // If we're moving forward (meaning we're moving the point higher up in the
    // order), then we want it to be placed after any points with the same order.
    // If not, we want it to be placed before any points with the same order.
    const newIndex = allPoints.filter(
      (point) =>
        (moveForward &&
          point.order === reorderInspectionRoutePointsDto.order) ||
        point.order < reorderInspectionRoutePointsDto.order,
    ).length;

    // Insert point to move at new index.
    allPoints.splice(newIndex, 0, pointToMove);

    // Create an array of points to update.
    const pointsToUpdate: Prisma.InspectionRoutePointUpdateManyWithWhereWithoutInspectionRouteInput[] =
      [];

    // If point order needs to be updated, add to the pointsToUpdate array. This makes sure
    // that point orders are kept orderly.
    allPoints.forEach((point, idx) => {
      if (point.order !== idx) {
        pointsToUpdate.push({
          where: { id: point.id },
          data: { order: idx },
        });
      }
    });

    // Update the points.
    return prisma.inspectionRoute.update({
      where: { id: inspectionRouteId },
      data: {
        inspectionRoutePoints: {
          updateMany: pointsToUpdate,
        },
      },
    });
  }
}
