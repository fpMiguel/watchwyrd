#!/usr/bin/env node
/**
 * Quick test to verify worker pool is functioning
 * Tests basic catalog generation with workers
 */

import { WorkerPool } from '../dist/workers/index.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  console.log('🧪 Testing worker pool...\n');

  // Create worker pool
  const workerScriptPath = path.join(__dirname, '..', 'dist', 'workers', 'catalog-worker.js');
  console.log('📁 Worker script:', workerScriptPath);

  const pool = new WorkerPool({
    workerScript: workerScriptPath,
    workerCount: 4,
  });

  console.log('✅ Worker pool created');
  console.log('📊 Stats:', pool.getStats());

  // Test config with userId
  const testConfig = {
    userId: '550e8400-e29b-41d4-a716-446655440000',
    aiProvider: 'gemini',
    geminiApiKey: 'test-key',
    geminiModel: 'gemini-2.5-flash',
    perplexityApiKey: '',
    perplexityModel: undefined,
    openaiApiKey: '',
    openaiModel: undefined,
    rpdbApiKey: undefined,
    timezone: 'UTC',
    country: 'US',
    weatherLocation: undefined,
    subtitleTolerance: 'no_preference',
    includeMovies: true,
    includeSeries: false,
    excludedGenres: [],
    enableWeatherContext: false,
    enableGrounding: false,
    showExplanations: false,
    catalogSize: 20,
    requestTimeout: 30,
  };

  try {
    console.log('\n🎬 Sending test catalog request...');
    const result = await pool.generateCatalog(testConfig, 'movie', 'fornow');
    console.log('✅ Catalog generated!');
    console.log('   Items:', result.metas.length);
    console.log('   First item:', result.metas[0]?.name || 'none');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }

  // Shutdown
  console.log('\n🛑 Shutting down worker pool...');
  await pool.shutdown();
  console.log('✅ Worker pool shut down');

  process.exit(0);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
