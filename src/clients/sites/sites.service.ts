import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { as404OrThrow, isNil } from 'src/common/utils';
import { buildPrismaFindArgs } from 'src/common/validation';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateSiteDto } from './dto/create-site.dto';
import { QuerySiteDto } from './dto/query-site.dto';
import { UpdateSiteDto } from './dto/update-site.dto';

function buildSiteStatusCacheKey(siteExternalId: string) {
  return `siteStatus:externalId=${siteExternalId}`;
}

@Injectable()
export class SitesService {
  // Cache TTL for site status: 1 hour in milliseconds
  private readonly SITE_STATUS_CACHE_TTL_MS = 60 * 60 * 1000;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  private invalidateSiteStatusCache(siteExternalId: string) {
    const cacheKey = buildSiteStatusCacheKey(siteExternalId);
    this.cache.del(cacheKey);
  }

  /**
   * Gets the active status of a site by its external ID.
   * Results are cached for 1 hour.
   */
  public async getSiteStatus(siteExternalId: string): Promise<boolean | null> {
    const cacheKey = buildSiteStatusCacheKey(siteExternalId);
    const cachedValue = await this.cache.get<boolean>(cacheKey);

    if (!isNil(cachedValue)) {
      return cachedValue;
    }

    const siteResult = await this.prisma.bypassRLS().site.findUnique({
      where: { externalId: siteExternalId },
      select: { active: true },
    });

    if (siteResult) {
      // Cache the result for 1 hour.
      this.cache.set(cacheKey, siteResult.active, this.SITE_STATUS_CACHE_TTL_MS);
      return siteResult.active;
    }

    return null;
  }

  async create(createSiteDto: CreateSiteDto) {
    return this.prisma
      .forContext()
      .then((prisma) => prisma.site.create({ data: createSiteDto }));
  }

  async findAll(querySiteDto: QuerySiteDto) {
    return this.prisma.forContext().then((prisma) =>
      prisma.site.findManyForPage(
        buildPrismaFindArgs<typeof prisma.site>(querySiteDto, {
          include: {
            address: true,
            _count: { select: { subsites: true, assets: true } },
          },
        }),
      ),
    );
  }

  async findOne(id: string) {
    return this.prisma
      .forContext()
      .then((prisma) =>
        prisma.site.findUniqueOrThrow({
          where: { id },
          include: {
            address: true,
            subsites: {
              include: {
                address: true,
              },
            },
            parentSite: {
              include: {
                address: true,
              },
            },
            assets: {
              include: {
                product: {
                  include: {
                    productCategory: true,
                    manufacturer: true,
                  },
                },
              },
            },
          },
        }),
      )
      .catch(as404OrThrow);
  }

  async update(id: string, updateSiteDto: UpdateSiteDto) {
    const prisma = await this.prisma.forContext();
    const result = await prisma.site
      .update({
        where: { id },
        data: updateSiteDto,
      })
      .catch(as404OrThrow);
    this.invalidateSiteStatusCache(result.externalId);
    return result;
  }

  async remove(id: string) {
    const prisma = await this.prisma.forContext();
    const result = await prisma.site.delete({ where: { id } });
    // Invalidate cache to ensure deleted site status is not cached
    this.invalidateSiteStatusCache(result.externalId);
    return result;
  }
}
