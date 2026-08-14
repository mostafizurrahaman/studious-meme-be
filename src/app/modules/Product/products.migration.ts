/* eslint-disable no-console */
import mongoose from 'mongoose';
import { ProductModel } from './product.model';
import { BrandModel } from '../Brand/brand.model';
import { CategoryModel } from '../Category/category.model';
import { ICategory } from '../Category/category.interface';

const waitForMongoConnection = async (): Promise<void> => {
  if (mongoose.connection.readyState === 1) {
    return;
  }
  await new Promise<void>((resolve, reject) => {
    mongoose.connection.once('connected', resolve);
    mongoose.connection.once('error', reject);
  });
};

interface IMigrationTrouble {
  id: string;
  sku: string;
  reason: string;
}

export const migrateProductBrandCategoryNames = async (): Promise<void> => {
  console.log('Product Brand & Category Names Migration started...');
  let migratedCount = 0;
  let skippedCount = 0;
  let failedCount = 0;

  const skippedProducts: IMigrationTrouble[] = [];
  const failedProducts: IMigrationTrouble[] = [];

  try {
    await waitForMongoConnection();

    // Optimized Query: শুধুমাত্র যেসব প্রোডাক্টে brandName/categoryName নেই,
    // অথবা যেসব প্রোডাক্টে subCategorySlug আছে কিন্তু subCategoryName নেই সেগুলোকে আনা হবে।
    // এর ফলে যেসব প্রোডাক্টের সাব-ক্যাটাগরি নেই, তারা লুপে পড়ে বারবার মাইগ্রেশন চালাবে না।
    const products = await ProductModel.find({
      $or: [
        { brandName: { $exists: false } },
        { categoryName: { $exists: false } },
        {
          $and: [
            { subCategorySlug: { $exists: true, $ne: null } },
            { subCategoryName: { $exists: false } },
          ],
        },
      ],
    }).lean();

    for (const product of products) {
      try {
        if (!product.brand || !product.category) {
          const missingFields = [];
          if (!product.brand) missingFields.push('brand');
          if (!product.category) missingFields.push('category');

          skippedProducts.push({
            id: String(product._id),
            sku: product.sku || 'N/A',
            reason: `Product document is missing these reference ID fields: ${missingFields.join(', ')}`,
          });
          skippedCount++;
          continue;
        }

        const brand = await BrandModel.findById(product.brand).lean();
        const category = (await CategoryModel.findById(
          product.category,
        ).lean()) as ICategory;

        if (!brand || !category) {
          const missingReferences = [];
          if (!brand) missingReferences.push('Brand');
          if (!category) missingReferences.push('Category');

          failedProducts.push({
            id: String(product._id),
            sku: product.sku || 'N/A',
            reason: `Referenced document(s) could not be found in DB: ${missingReferences.join(', ')}`,
          });
          failedCount++;
          continue;
        }

        // সফলভাবে Brand এবং Category পাওয়ার পর সাব-ক্যাটাগরি চেক করার মূল লজিক:
        let subCategoryName: string | null = null;
        const subCategorySlug = product?.subCategorySlug;

        if (subCategorySlug) {
          const subCategory = category.subCategories?.find(
            sub => sub.slug === subCategorySlug,
          );

          if (subCategory) {
            subCategoryName = subCategory.name;
          } else {
            failedProducts.push({
              id: String(product._id),
              sku: product.sku || 'N/A',
              reason: `SubCategory with slug "${subCategorySlug}" not found under Category "${category.name}"`,
            });
            failedCount++;
            continue;
          }
        }

        await ProductModel.updateOne(
          { _id: product._id },
          {
            $set: {
              brandName: brand.name,
              categoryName: category.name,
              // যদি সাব-ক্যাটাগরি না থাকে তবে null সেট করবে যেন কুয়েরি পুনরায় ট্রিপ না করে
              subCategoryName: subCategoryName,
            },
          },
        );

        migratedCount++;
        console.log(
          `Migrated SKU: ${product.sku} | Brand: ${brand.name} | Category: ${category.name} | Sub Category: ${subCategoryName || 'N/A'}`,
        );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (err: any) {
        console.error(`Failed to migrate product ID: ${product._id}`, err);
        failedProducts.push({
          id: String(product._id),
          sku: product.sku || 'N/A',
          reason: `Database / System error: ${err?.message || String(err)}`,
        });
        failedCount++;
      }
    }

    console.log('\n--- Migration Stats ---');
    console.log(`Total Products Migrated: ${migratedCount}`);
    console.log(`Total Products Skipped: ${skippedCount}`);
    console.log(`Total Products Failed: ${failedCount}`);

    // Log skipped products detail for audit
    if (skippedProducts.length > 0) {
      console.log('\n--- Skipped Products Detail (Missing Reference IDs) ---');
      skippedProducts.forEach(item => {
        console.log(
          `ID: ${item.id} | SKU: ${item.sku} | Reason: ${item.reason}`,
        );
      });
    }

    // Log failed products detail for manual correction
    if (failedProducts.length > 0) {
      console.log(
        '\n--- Failed Products Detail (Requires Manual Correction) ---',
      );
      failedProducts.forEach(item => {
        console.log(
          `ID: ${item.id} | SKU: ${item.sku} | Reason: ${item.reason}`,
        );
      });

      // Output clean list of IDs for easy copy-pasting
      console.log('\nRaw Failed Product IDs (JSON list):');
      console.log(JSON.stringify(failedProducts.map(p => p.id)));
    }

    console.log(
      '\nProduct Brand & Category Names Migration completed successfully!\n',
    );
  } catch (error) {
    console.error('Fatal error during migration:', error);
  }
};
