import { Module } from '@nestjs/common';
import { ShopifyModule } from 'src/shopify/shopify.module';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

@Module({
  imports: [ShopifyModule],
  controllers: [ProductsController],
  providers: [ProductsService],
})
export class ProductsModule {}
