/**
 * Gemini Model Quality Test Script
 * Tests all available Gemini models for recommendation quality
 */

import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error('ERROR: GEMINI_API_KEY not set');
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);

// Models to test - available models Jan 2026
const MODELS = [
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-2.5-pro',
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-3-flash-preview',
  'gemini-3-pro-preview',
];

// Number of runs per model for statistical reliability
const RUNS_PER_MODEL = 3;

// JSON Schema for structured output
const SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    items: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          title: { type: SchemaType.STRING },
          year: { type: SchemaType.INTEGER },
          reason: { type: SchemaType.STRING }
        },
        required: ['title', 'year', 'reason']
      }
    }
  },
  required: ['items']
};

// Pricing per 1M tokens (Jan 2026)
// Note: Gemini has free tier limits, pricing is for paid usage
const PRICING = {
  'gemini-2.5-flash': { input: 0.15, output: 0.60 },
  'gemini-2.5-flash-lite': { input: 0.075, output: 0.30 },
  'gemini-2.5-pro': { input: 1.25, output: 10.00 },
  'gemini-2.0-flash': { input: 0.10, output: 0.40 },
  'gemini-2.0-flash-lite': { input: 0.075, output: 0.30 },
  'gemini-3-flash-preview': { input: 0.15, output: 0.60 },
  'gemini-3-pro-preview': { input: 1.25, output: 10.00 },
};

function estimateCost(model, inputTokens, outputTokens) {
  const p = PRICING[model] || { input: 0.10, output: 0.40 };
  return ((inputTokens * p.input + outputTokens * p.output) / 1000000).toFixed(6);
}

async function testModel(modelName) {
  const start = Date.now();
  try {
    // For Gemini 3 models, add thinkingConfig to suppress thinking tokens
    const isGemini3 = modelName.includes('gemini-3');
    
    const generationConfig = {
      temperature: isGemini3 ? undefined : 0.7, // Gemini 3 doesn't support custom temp with thinking
      maxOutputTokens: 1000,
      responseMimeType: 'application/json',
      responseSchema: SCHEMA,
    };
    
    // Add thinking config for Gemini 3 models
    if (isGemini3) {
      generationConfig.thinkingConfig = {
        thinkingBudget: 0, // Disable thinking for structured output
      };
    }
    
    const model = genAI.getGenerativeModel({
      model: modelName,
      generationConfig,
    });

    const result = await model.generateContent(
      'Recommend 5 thriller movies. Return JSON with items array containing title, year, reason.'
    );
    
    const elapsed = Date.now() - start;
    const response = result.response;
    const content = response.text();
    const usage = response.usageMetadata || {};
    const inputTokens = usage.promptTokenCount || 0;
    const outputTokens = usage.candidatesTokenCount || 0;
    const totalTokens = usage.totalTokenCount || inputTokens + outputTokens;
    
    let valid = false, items = 0, parseError = null;
    try { 
      const p = JSON.parse(content); 
      valid = true; 
      items = p.items?.length || 0; 
    } catch (e) {
      parseError = e.message;
    }
    
    return { 
      model: modelName, 
      valid, 
      items, 
      latency: elapsed, 
      inputTokens,
      outputTokens,
      totalTokens, 
      cost: estimateCost(modelName, inputTokens, outputTokens),
      parseError,
      content: content?.substring(0, 100)
    };
  } catch (e) {
    return { 
      model: modelName, 
      valid: false, 
      items: 0, 
      latency: Date.now() - start, 
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0, 
      cost: '0', 
      error: e.message 
    };
  }
}

async function runTests() {
  console.log('='.repeat(85));
  console.log('Gemini Model Comparison Test');
  console.log('='.repeat(85));
  console.log('');
  console.log('Testing with: 5 thriller movie recommendations, structured JSON output');
  console.log(`Running ${RUNS_PER_MODEL} iterations per model for statistical reliability`);
  console.log('');
  
  const allResults = {};
  
  for (const model of MODELS) {
    allResults[model] = [];
    console.log(`\n--- ${model} ---`);
    
    for (let i = 0; i < RUNS_PER_MODEL; i++) {
      process.stdout.write(`  Run ${i + 1}/${RUNS_PER_MODEL}... `);
      const result = await testModel(model);
      allResults[model].push(result);
      
      if (result.valid) {
        console.log(`✅ ${result.items} items, ${result.latency}ms, $${result.cost}`);
      } else if (result.parseError) {
        console.log(`⚠️ JSON parse error: ${result.parseError}`);
      } else {
        console.log(`❌ ${result.error?.substring(0, 60) || 'Failed'}`);
      }
      // Small delay to avoid rate limits
      await new Promise(r => setTimeout(r, 1000));
    }
  }
  
  // Calculate statistics
  console.log('\n' + '='.repeat(85));
  console.log('AGGREGATE STATISTICS');
  console.log('='.repeat(85));
  console.log('');
  console.log('| Model                    | Success | Avg Lat | Min Lat | Max Lat | Avg Cost   |');
  console.log('|--------------------------|---------|---------|---------|---------|------------|');
  
  for (const model of MODELS) {
    const runs = allResults[model];
    const valid = runs.filter(r => r.valid);
    const successRate = `${valid.length}/${runs.length}`;
    
    if (valid.length > 0) {
      const avgLat = Math.round(valid.reduce((s, r) => s + r.latency, 0) / valid.length);
      const minLat = Math.min(...valid.map(r => r.latency));
      const maxLat = Math.max(...valid.map(r => r.latency));
      const avgCost = (valid.reduce((s, r) => s + parseFloat(r.cost), 0) / valid.length).toFixed(6);
      
      console.log(`| ${model.padEnd(24)} | ${successRate.padEnd(7)} | ${(avgLat + 'ms').padEnd(7)} | ${(minLat + 'ms').padEnd(7)} | ${(maxLat + 'ms').padEnd(7)} | $${avgCost.padEnd(9)} |`);
    } else {
      console.log(`| ${model.padEnd(24)} | ${successRate.padEnd(7)} | N/A     | N/A     | N/A     | N/A        |`);
    }
  }
  
  console.log('');
}

runTests().catch(console.error);
