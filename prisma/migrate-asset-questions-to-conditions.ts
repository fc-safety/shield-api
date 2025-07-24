import { PrismaClient } from '../src/generated/prisma/client';

const prisma = new PrismaClient();

async function migrateAssetQuestionsToConditions() {
  console.log(
    'Starting migration of AssetQuestions to AssetQuestionConditions...',
  );

  try {
    // Use a transaction to ensure atomicity
    await prisma.$transaction(async (tx) => {
      // Bypass RLS for this migration
      await tx.$executeRaw`SELECT set_config('app.bypass_rls', 'on', TRUE)`;

      // Get all AssetQuestions with productCategoryId
      const questionsWithCategory = await tx.assetQuestion.findMany({
        where: {
          productCategoryId: { not: null },
        },
        include: {
          productCategory: true,
        },
      });

      console.log(
        `Found ${questionsWithCategory.length} questions with productCategoryId`,
      );

      // Migrate productCategoryId to conditions
      for (const question of questionsWithCategory) {
        if (!question.productCategoryId || !question.productCategory) continue;

        // Check if condition already exists
        const existingCondition = await tx.assetQuestionCondition.findFirst({
          where: {
            assetQuestionId: question.id,
            conditionType: 'PRODUCT_CATEGORY',
            value: {
              array_contains: [question.productCategoryId],
            },
          },
        });

        if (!existingCondition) {
          await tx.assetQuestionCondition.create({
            data: {
              assetQuestionId: question.id,
              conditionType: 'PRODUCT_CATEGORY',
              value: [question.productCategoryId],
              description: 'Migrated from productCategoryId field',
              clientId: question.productCategory.clientId,
            },
          });
          console.log(
            `Created PRODUCT_CATEGORY condition for question ${question.id}`,
          );
        }
      }

      // Get all AssetQuestions with productId
      const questionsWithProduct = await tx.assetQuestion.findMany({
        where: {
          productId: { not: null },
        },
        include: {
          product: true,
        },
      });

      console.log(
        `Found ${questionsWithProduct.length} questions with productId`,
      );

      // Migrate productId to conditions
      for (const question of questionsWithProduct) {
        if (!question.productId || !question.product) continue;

        // Check if condition already exists
        const existingCondition = await tx.assetQuestionCondition.findFirst({
          where: {
            assetQuestionId: question.id,
            conditionType: 'PRODUCT',
            value: {
              array_contains: [question.productId],
            },
          },
        });

        if (!existingCondition) {
          await tx.assetQuestionCondition.create({
            data: {
              assetQuestionId: question.id,
              conditionType: 'PRODUCT',
              value: [question.productId],
              description: 'Migrated from productId field',
              clientId: question.product.clientId,
            },
          });
          console.log(`Created PRODUCT condition for question ${question.id}`);
        }
      }

      // Clear productCategoryId and productId fields
      const categoryUpdateResult = await tx.assetQuestion.updateMany({
        where: {
          productCategoryId: { not: null },
          conditions: {
            some: {
              conditionType: 'PRODUCT_CATEGORY',
            },
          },
        },
        data: {
          productCategoryId: null,
        },
      });

      console.log(
        `Cleared productCategoryId from ${categoryUpdateResult.count} questions`,
      );

      const productUpdateResult = await tx.assetQuestion.updateMany({
        where: {
          productId: { not: null },
          conditions: {
            some: {
              conditionType: 'PRODUCT',
            },
          },
        },
        data: {
          productId: null,
        },
      });

      console.log(
        `Cleared productId from ${productUpdateResult.count} questions`,
      );
    });

    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
migrateAssetQuestionsToConditions().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
