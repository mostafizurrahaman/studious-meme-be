/* eslint-disable no-console */
import dns from 'dns';
// Fix DNS resolution issues on Windows/Node.js for MongoDB SRV
dns.setServers(['1.1.1.1', '8.8.8.8']);

import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import config from '../app/config';
import { ProductModel } from '../app/modules/Product/product.model';
import { isCloudinaryUrl } from '../app/utils/imageStorage';

export interface IMigrationRecord {
  productId: string;
  sku?: string;
  slug: string;
  title: string;
  originalImagesCount: number;
  removedCloudinaryImagesCount: number;
  remainingImagesCount: number;
  removedCloudinaryImages: string[];
  remainingImages: string[];
}

export interface IMigrationResult {
  totalScanned: number;
  productsWithCloudinary: number;
  totalCloudinaryImagesRemoved: number;
  productsWithZeroRemainingImages: number;
  productsWithActiveRemainingImages: number;
  updatedDocuments: number;
  reportFilePath?: string;
  isDryRun: boolean;
}

/**
 * Execute Cloudinary Images Migration on Products
 *
 * Scans all products, identifies any Cloudinary image URLs in the `images` array,
 * removes those Cloudinary image URLs, and updates the product document in MongoDB.
 *
 * @param dryRun If true, only identifies and reports changes without writing to DB.
 */
export const runCloudinaryImagesMigration = async (
  dryRun = false,
): Promise<IMigrationResult> => {
  const startTime = Date.now();
  console.log('='.repeat(70));
  console.log(`🚀 Starting Product Cloudinary Images Migration [${dryRun ? 'DRY-RUN' : 'LIVE'}]`);
  console.log('='.repeat(70));

  if (mongoose.connection.readyState !== 1) {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(config.db_url as string);
    console.log('✅ Connected to MongoDB successfully!');
  }

  const products = await ProductModel.find(
    {},
    { _id: 1, title: 1, slug: 1, sku: 1, images: 1, imageAlt: 1 },
  ).lean();

  console.log(`📋 Total products fetched: ${products.length}`);

  const migrationRecords: IMigrationRecord[] = [];
  const bulkOperations: any[] = [];
  let totalCloudinaryImagesCount = 0;
  let productsWithZeroRemaining = 0;
  let productsWithActiveRemaining = 0;

  for (const product of products) {
    const rawImages: string[] = Array.isArray(product.images) ? product.images : [];
    const cloudinaryImages: string[] = [];
    const nonCloudinaryImages: string[] = [];

    for (const url of rawImages) {
      if (typeof url === 'string' && isCloudinaryUrl(url)) {
        cloudinaryImages.push(url);
      } else if (typeof url === 'string' && url.trim()) {
        nonCloudinaryImages.push(url.trim());
      }
    }

    if (cloudinaryImages.length > 0) {
      totalCloudinaryImagesCount += cloudinaryImages.length;

      if (nonCloudinaryImages.length === 0) {
        productsWithZeroRemaining++;
      } else {
        productsWithActiveRemaining++;
      }

      migrationRecords.push({
        productId: String(product._id),
        sku: product.sku,
        slug: product.slug,
        title: product.title,
        originalImagesCount: rawImages.length,
        removedCloudinaryImagesCount: cloudinaryImages.length,
        remainingImagesCount: nonCloudinaryImages.length,
        removedCloudinaryImages: cloudinaryImages,
        remainingImages: nonCloudinaryImages,
      });

      bulkOperations.push({
        updateOne: {
          filter: { _id: product._id },
          update: {
            $set: {
              images: nonCloudinaryImages,
              ...(nonCloudinaryImages.length === 0 ? { imageAlt: [] } : {}),
            },
          },
        },
      });
    }
  }

  let updatedCount = 0;

  if (!dryRun && bulkOperations.length > 0) {
    console.log(`\n💾 Applying updates to MongoDB in batches of 500 (total ${bulkOperations.length} updates)...`);
    const BATCH_SIZE = 500;
    for (let i = 0; i < bulkOperations.length; i += BATCH_SIZE) {
      const batch = bulkOperations.slice(i, i + BATCH_SIZE);
      const res = await ProductModel.bulkWrite(batch, { ordered: false });
      updatedCount += res.modifiedCount;
      const progress = Math.min(i + BATCH_SIZE, bulkOperations.length);
      console.log(`   Processed ${progress} / ${bulkOperations.length} products...`);
    }
    console.log(`✅ MongoDB bulk update complete! Total documents modified: ${updatedCount}`);
  } else if (dryRun) {
    console.log(`\n🔍 DRY-RUN MODE: No database changes were applied.`);
    updatedCount = 0;
  } else {
    console.log(`\n🎉 No products found with Cloudinary images. Nothing to update!`);
  }

  // Generate audit report file
  let reportFilePath: string | undefined;
  if (migrationRecords.length > 0) {
    const logsDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportFileName = `migration_cloudinary_products_${dryRun ? 'dryrun_' : ''}${timestamp}.json`;
    reportFilePath = path.join(logsDir, reportFileName);

    const reportData = {
      timestamp: new Date().toISOString(),
      isDryRun: dryRun,
      summary: {
        totalProductsScanned: products.length,
        productsWithCloudinary: migrationRecords.length,
        totalCloudinaryImagesRemoved: totalCloudinaryImagesCount,
        productsWithZeroRemainingImages: productsWithZeroRemaining,
        productsWithActiveRemainingImages: productsWithActiveRemaining,
        databaseDocumentsUpdated: updatedCount,
      },
      records: migrationRecords,
    };

    fs.writeFileSync(reportFilePath, JSON.stringify(reportData, null, 2), 'utf-8');
    console.log(`📁 Audit report saved to: ${reportFilePath}`);
  }

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log('\n' + '='.repeat(70));
  console.log('📊 MIGRATION SUMMARY');
  console.log('='.repeat(70));
  console.log(`⏱  Duration:                           ${durationSec}s`);
  console.log(`📦 Total Products Scanned:             ${products.length}`);
  console.log(`🖼  Products with Cloudinary Images:    ${migrationRecords.length}`);
  console.log(`🚫 Total Cloudinary Images Removed:    ${totalCloudinaryImagesCount}`);
  console.log(`0️⃣  Products Left With 0 Images:        ${productsWithZeroRemaining}`);
  console.log(`✅ Products Left With ≥1 Valid Images: ${productsWithActiveRemaining}`);
  console.log(`📝 Database Documents Updated:         ${dryRun ? '0 (Dry-Run)' : updatedCount}`);
  console.log('='.repeat(70) + '\n');

  return {
    totalScanned: products.length,
    productsWithCloudinary: migrationRecords.length,
    totalCloudinaryImagesRemoved: totalCloudinaryImagesCount,
    productsWithZeroRemainingImages: productsWithZeroRemaining,
    productsWithActiveRemainingImages: productsWithActiveRemaining,
    updatedDocuments: updatedCount,
    reportFilePath,
    isDryRun: dryRun,
  };
};

// If run directly from CLI
if (require.main === module) {
  const isDryRun = process.argv.includes('--dry-run');
  runCloudinaryImagesMigration(isDryRun)
    .catch((err) => {
      console.error('Migration failed:', err);
      process.exit(1);
    })
    .finally(async () => {
      await mongoose.disconnect();
      console.log('🔌 Disconnected from MongoDB.');
    });
}
