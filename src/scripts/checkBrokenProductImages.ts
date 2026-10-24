/* eslint-disable no-console */
import dns from 'dns';
// Fix DNS resolution issues on Windows/Node.js for MongoDB SRV and external domains
dns.setServers(['1.1.1.1', '8.8.8.8']);

import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import config from '../app/config';
import { ProductModel, type IProduct } from '../app/modules/Product/product.model';

interface IImageCheckResult {
  ok: boolean;
  status: number | string;
  error?: string;
}

interface IProblemProduct {
  productId: string;
  productname: string;
  slug: string;
  allImageUrls: string[];
  brokenImageUrls: string[];
  errorDetails: string[];
}

// In-memory cache for URLs so duplicate image URLs are not re-fetched
const urlStatusCache = new Map<string, IImageCheckResult>();

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

/**
 * Check if a single image URL is accessible and returns a valid status.
 */
async function checkImageUrl(url: string): Promise<IImageCheckResult> {
  const trimmed = typeof url === 'string' ? url.trim() : '';

  if (!trimmed) {
    return { ok: false, status: 'EMPTY_URL', error: 'Image URL is empty' };
  }

  // Check URL cache
  if (urlStatusCache.has(trimmed)) {
    return urlStatusCache.get(trimmed)!;
  }

  // Validate URL protocol
  if (!/^https?:\/\//i.test(trimmed)) {
    const res = {
      ok: false,
      status: 'INVALID_PROTOCOL',
      error: `Invalid URL format: "${trimmed}"`,
    };
    urlStatusCache.set(trimmed, res);
    return res;
  }

  try {
    // 1. Try HEAD request first for fast verification without downloading body
    let response: Response;
    try {
      response = await fetch(trimmed, {
        method: 'HEAD',
        headers: { 'User-Agent': USER_AGENT },
        signal: AbortSignal.timeout(8000),
      });
    } catch {
      // If HEAD network fails or timeout, attempt GET as fallback
      response = await fetch(trimmed, {
        method: 'GET',
        headers: {
          'User-Agent': USER_AGENT,
          Range: 'bytes=0-100', // Request only first bytes to avoid downloading entire file
        },
        signal: AbortSignal.timeout(8000),
      });
    }

    // If HEAD method not allowed (405) or forbidden (403), fallback to small GET
    if (response.status === 405 || response.status === 403) {
      try {
        const getResponse = await fetch(trimmed, {
          method: 'GET',
          headers: {
            'User-Agent': USER_AGENT,
            Range: 'bytes=0-100',
          },
          signal: AbortSignal.timeout(8000),
        });

        if (getResponse.ok || getResponse.status === 206) {
          const res = { ok: true, status: getResponse.status };
          urlStatusCache.set(trimmed, res);
          return res;
        }
        response = getResponse;
      } catch {
        // Stick with original response
      }
    }

    // Evaluate response status
    if (response.ok || response.status === 206 || response.status === 304) {
      const res = { ok: true, status: response.status };
      urlStatusCache.set(trimmed, res);
      return res;
    }

    // 404 or any other client/server error
    const statusText = response.status === 404 ? '404 Not Found' : `HTTP ${response.status}`;
    const res = {
      ok: false,
      status: response.status,
      error: statusText,
    };
    urlStatusCache.set(trimmed, res);
    return res;
  } catch (err: any) {
    let errorMsg = err?.message || 'Network Error';
    if (err?.name === 'TimeoutError') {
      errorMsg = 'Request Timeout (8s)';
    }

    const res = {
      ok: false,
      status: 'FETCH_ERROR',
      error: errorMsg,
    };
    urlStatusCache.set(trimmed, res);
    return res;
  }
}

/**
 * Concurrency runner: run an array of async tasks with a maximum concurrency limit
 */
async function runWithConcurrency<T, R>(
  items: T[],
  limit: number,
  task: (item: T, index: number) => Promise<R>,
  onProgress?: (completed: number, total: number) => void,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let currentIndex = 0;
  let completedCount = 0;

  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (currentIndex < items.length) {
      const index = currentIndex++;
      try {
        results[index] = await task(items[index], index);
      } catch (err) {
        results[index] = err as any;
      } finally {
        completedCount++;
        if (onProgress) {
          onProgress(completedCount, items.length);
        }
      }
    }
  });

  await Promise.all(workers);
  return results;
}

/**
 * Escape CSV cell value according to RFC 4180
 */
function escapeCsvValue(val: unknown): string {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

/**
 * Main script function
 */
async function main() {
  console.log('='.repeat(70));
  console.log('🔍 PRODUCT IMAGE NOT FOUND / BROKEN LINK CHECKER');
  console.log('='.repeat(70));

  const startTime = Date.now();

  try {
    // 1. Connect to Database
    console.log('\n🔌 Connecting to MongoDB...');
    await mongoose.connect(config.db_url as string);
    console.log('✅ Connected to MongoDB successfully!');

    // 2. Fetch all products
    console.log('\n📦 Fetching all products from database...');
    const products = await ProductModel.find(
      {},
      { _id: 1, title: 1, slug: 1, images: 1 },
    ).lean();

    console.log(`📋 Found ${products.length} products to check.\n`);

    if (products.length === 0) {
      console.log('No products found in database.');
      await mongoose.disconnect();
      return;
    }

    const problemProducts: IProblemProduct[] = [];
    let checkedProductsCount = 0;
    let notFoundImagesCount = 0;

    // 3. Process products with concurrency
    const CONCURRENCY_LIMIT = 20; // Check 20 products in parallel
    console.log(`🚀 Checking product images with concurrency limit = ${CONCURRENCY_LIMIT}...`);

    let lastLoggedPercent = -1;

    await runWithConcurrency<any, void>(
      products,
      CONCURRENCY_LIMIT,
      async (product: any) => {
        const productId = String(product._id);
        const title = product.title || '';
        const slug = product.slug || '';
        const images: string[] = Array.isArray(product.images) ? product.images : [];

        // Check if product has no images at all
        if (images.length === 0) {
          problemProducts.push({
            productId,
            productname: title,
            slug,
            allImageUrls: [],
            brokenImageUrls: ['NO_IMAGE_FOUND'],
            errorDetails: ['Product has empty images array []'],
          });
          return;
        }

        // Check each image in product.images
        const brokenUrls: string[] = [];
        const errors: string[] = [];

        for (const imgUrl of images) {
          const res = await checkImageUrl(imgUrl);
          if (!res.ok) {
            brokenUrls.push(imgUrl);
            errors.push(`${imgUrl} -> [${res.error || res.status}]`);
            notFoundImagesCount++;
          }
        }

        // If any image has a problem, list this product
        if (brokenUrls.length > 0) {
          problemProducts.push({
            productId,
            productname: title,
            slug,
            allImageUrls: images,
            brokenImageUrls: brokenUrls,
            errorDetails: errors,
          });
        }
      },
      (completed, total) => {
        checkedProductsCount = completed;
        const percent = Math.floor((completed / total) * 100);
        // Log progress every 5%
        if (percent % 5 === 0 && percent !== lastLoggedPercent) {
          lastLoggedPercent = percent;
          process.stdout.write(
            `\r⏳ Progress: ${completed}/${total} products checked (${percent}%) | ❌ Problematic products found so far: ${problemProducts.length}`,
          );
        }
      },
    );

    process.stdout.write('\n\n');

    // 4. Generate CSV
    console.log('📄 Generating CSV file...');
    const csvFileName = 'broken_product_images.csv';
    const csvFilePath = path.join(process.cwd(), csvFileName);

    // CSV Headers as requested: productId, productname, slug, productImages urls
    // Additional helpful columns included: brokenImageUrls, errorDetails
    const headers = [
      'productId',
      'productname',
      'slug',
      'productImages urls',
      'brokenImageUrls',
      'errorDetails',
    ];

    const csvRows = [headers.join(',')];

    for (const item of problemProducts) {
      const row = [
        escapeCsvValue(item.productId),
        escapeCsvValue(item.productname),
        escapeCsvValue(item.slug),
        escapeCsvValue(item.allImageUrls.join(' | ')),
        escapeCsvValue(item.brokenImageUrls.join(' | ')),
        escapeCsvValue(item.errorDetails.join(' ; ')),
      ];
      csvRows.push(row.join(','));
    }

    fs.writeFileSync(csvFilePath, csvRows.join('\n'), 'utf-8');

    const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);

    // 5. Display Summary
    console.log('='.repeat(70));
    console.log('📊 EXECUTION SUMMARY');
    console.log('='.repeat(70));
    console.log(`⏱  Time Taken:               ${durationSec} seconds`);
    console.log(`📦 Total Products Checked:     ${products.length}`);
    console.log(`🖼  Unique URLs Checked:       ${urlStatusCache.size}`);
    console.log(`✅ Healthy Products:          ${products.length - problemProducts.length}`);
    console.log(`❌ Problematic Products:       ${problemProducts.length}`);
    console.log(`🚫 Total Broken/404 Images:    ${notFoundImagesCount}`);
    console.log(`📁 CSV File Created:          ${csvFilePath}`);
    console.log('='.repeat(70));

    if (problemProducts.length > 0) {
      console.log('\n🔍 Preview of first 5 problematic products:');
      problemProducts.slice(0, 5).forEach((p, idx) => {
        console.log(`\n${idx + 1}. [${p.productId}] ${p.productname}`);
        console.log(`   Slug:   ${p.slug}`);
        console.log(`   Images: ${p.allImageUrls.join(', ')}`);
        console.log(`   Broken: ${p.brokenImageUrls.join(', ')}`);
        console.log(`   Error:  ${p.errorDetails.join(' | ')}`);
      });
    } else {
      console.log('\n🎉 Fantastic! All product images are valid and accessible!');
    }
  } catch (error) {
    console.error('❌ Script failed with error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 MongoDB disconnected. Done!\n');
  }
}

main();
