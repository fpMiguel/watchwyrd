/**
 * OpenAI Model Quality Test Script
 * Tests GPT-4.x and GPT-5 models with proper settings for each
 * 
 * Key findings:
 * - GPT-5 models are reasoning models that use tokens for thinking
 * - GPT-5 requires json_schema format (not json_object)
 * - GPT-5 requires higher max_completion_tokens (4000+) for reasoning overhead
 * - GPT-5 doesn't support custom temperature
 */

import OpenAI from 'openai';

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  console.error('ERROR: OPENAI_API_KEY not set');
  process.exit(1);
}

const client = new OpenAI({ apiKey });

// Models to test
const GPT4_MODELS = ['gpt-4o-mini', 'gpt-4.1-nano', 'gpt-4.1-mini'];
const GPT5_MODELS = ['gpt-5-nano', 'gpt-5-mini', 'gpt-5'];

// JSON Schema for GPT-5 models
const SCHEMA = {
  type: 'object',
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          year: { type: 'integer' },
          reason: { type: 'string' }
        },
        required: ['title', 'year', 'reason'],
        additionalProperties: false
      }
    }
  },
  required: ['items'],
  additionalProperties: false
};

// Calculate estimated cost per 1M tokens
function estimateCost(model, inputTokens, outputTokens) {
  const pricing = {
    'gpt-4o-mini': { input: 0.15, output: 0.60 },
    'gpt-4.1-nano': { input: 0.10, output: 0.40 },
    'gpt-4.1-mini': { input: 0.40, output: 1.60 },
    'gpt-5-nano': { input: 0.05, output: 0.40 },
    'gpt-5-mini': { input: 0.25, output: 2.00 },
    'gpt-5': { input: 1.25, output: 10.00 },
  };
  const p = pricing[model] || { input: 1, output: 1 };
  return ((inputTokens * p.input + outputTokens * p.output) / 1000000).toFixed(6);
}

// Test GPT-4.x model with json_object format
async function testGpt4Model(model) {
  const start = Date.now();
  try {
    const res = await client.chat.completions.create({
      model,
      messages: [{ role: 'user', content: 'Recommend 5 thriller movies. Return JSON with items array containing title, year, reason.' }],
      response_format: { type: 'json_object' },
      max_tokens: 1000,
      temperature: 0.7,
    });
    const elapsed = Date.now() - start;
    const content = res.choices[0]?.message?.content || '';
    const usage = res.usage;
    let valid = false, items = 0;
    try { const p = JSON.parse(content); valid = true; items = p.items?.length || 0; } catch {}
    return { 
      model, valid, items, 
      latency: elapsed, 
      tokens: usage.total_tokens, 
      reasoning: 0, 
      cost: estimateCost(model, usage.prompt_tokens, usage.completion_tokens) 
    };
  } catch (e) {
    return { model, valid: false, items: 0, latency: Date.now() - start, tokens: 0, reasoning: 0, cost: '0', error: e.message };
  }
}

// Test GPT-5 model with json_schema format and higher token limit
async function testGpt5Model(model) {
  const start = Date.now();
  try {
    const res = await client.chat.completions.create({
      model,
      messages: [{ role: 'user', content: 'Recommend 5 thriller movies.' }],
      response_format: {
        type: 'json_schema',
        json_schema: { name: 'recommendations', strict: true, schema: SCHEMA }
      },
      max_completion_tokens: 4000, // GPT-5 needs more for reasoning overhead
    });
    const elapsed = Date.now() - start;
    const content = res.choices[0]?.message?.content || '';
    const usage = res.usage;
    const reasoning = usage?.completion_tokens_details?.reasoning_tokens || 0;
    let valid = false, items = 0;
    try { const p = JSON.parse(content); valid = true; items = p.items?.length || 0; } catch {}
    return { 
      model, valid, items, 
      latency: elapsed, 
      tokens: usage.total_tokens, 
      reasoning, 
      cost: estimateCost(model, usage.prompt_tokens, usage.completion_tokens) 
    };
  } catch (e) {
    return { model, valid: false, items: 0, latency: Date.now() - start, tokens: 0, reasoning: 0, cost: '0', error: e.message };
  }
}

async function runTests() {
  console.log('='.repeat(80));
  console.log('OpenAI Model Comparison - GPT-4.x vs GPT-5 (with proper settings)');
  console.log('='.repeat(80));
  console.log('');
  console.log('GPT-4.x: Uses json_object, max_tokens: 1000, temperature: 0.7');
  console.log('GPT-5.x: Uses json_schema, max_completion_tokens: 4000 (for reasoning)');
  console.log('');
  
  const results = [];
  
  // Test GPT-4.x models
  console.log('--- GPT-4.x Models ---');
  for (const model of GPT4_MODELS) {
    process.stdout.write(`  ${model}... `);
    const result = await testGpt4Model(model);
    results.push(result);
    if (result.valid) {
      console.log(`✅ ${result.items} items, ${result.latency}ms, ${result.tokens} tokens, $${result.cost}`);
    } else {
      console.log(`❌ ${result.error?.substring(0, 50) || 'Failed'}`);
    }
  }
  
  // Test GPT-5.x models
  console.log('\n--- GPT-5.x Models (Reasoning Models) ---');
  for (const model of GPT5_MODELS) {
    process.stdout.write(`  ${model}... `);
    const result = await testGpt5Model(model);
    results.push(result);
    if (result.valid) {
      console.log(`✅ ${result.items} items, ${result.latency}ms, ${result.tokens} tokens (${result.reasoning} reasoning), $${result.cost}`);
    } else {
      console.log(`❌ ${result.error?.substring(0, 50) || 'Failed'}`);
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80));
  console.log('');
  console.log('| Model          | Valid | Items | Latency   | Tokens | Reasoning | Cost      |');
  console.log('|----------------|-------|-------|-----------|--------|-----------|-----------|');
  for (const r of results) {
    const latStr = (r.latency + 'ms').padEnd(9);
    const tokStr = String(r.tokens).padEnd(6);
    const resStr = String(r.reasoning).padEnd(9);
    const costStr = ('$' + r.cost).padEnd(10);
    console.log(`| ${r.model.padEnd(14)} | ${r.valid ? '✅' : '❌'}    | ${String(r.items).padEnd(5)} | ${latStr} | ${tokStr} | ${resStr} | ${costStr} |`);
  }
  
  console.log('');
  console.log('KEY FINDINGS:');
  console.log('- GPT-5 models are reasoning models (like o1/o3) that use tokens for thinking');
  console.log('- GPT-5-nano uses ~1500 tokens per request (vs ~200 for GPT-4.x)');
  console.log('- GPT-5 uses ~2500+ tokens and takes 30-40 seconds');
  console.log('- GPT-5 models require json_schema format, not json_object');
  console.log('- GPT-5 models do NOT support custom temperature (fixed at 1.0)');
  console.log('');
}

runTests().catch(console.error);
