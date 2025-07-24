import { Module } from '@nestjs/common';
import { AnsiCategoriesModule } from './ansi-categories/ansi-categories.module';
import { AssetQuestionsModule } from './asset-questions/asset-questions.module';
import { ManufacturersModule } from './manufacturers/manufacturers.module';
import { ProductCategoriesModule } from './product-categories/product-categories.module';
import { ProductsModule as ProductsResourceModule } from './products/products.module';

@Module({
  imports: [
    ManufacturersModule,
    ProductsResourceModule,
    ProductCategoriesModule,
    AnsiCategoriesModule,
    AssetQuestionsModule,
  ],
})
export class ProductsModule {}
