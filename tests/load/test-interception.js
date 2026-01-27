/**
 * Quick test to verify mock interception is working
 * Tests that Gemini API requests are redirected to mock server
 */

// Import the mock interceptor to enable it
import { enableMockInterception } from '../../dist/config/mockInterceptor.js';

// Enable interception FIRST
enableMockInterception();

import https from 'node:https';

console.log('Testing mock interception...\n');

// This would normally go to Google's servers
const options = {
  hostname: 'generativelanguage.googleapis.com',
  port: 443,
  path: '/v1beta/models/gemini-2.5-flash:generateContent',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
};

console.log(`Making request to: https://${options.hostname}${options.path}`);
console.log('Expected: Should be intercepted and redirected to localhost:8888\n');

const req = https.request(options, (res) => {
  console.log(`✓ Response received!`);
  console.log(`  Status: ${res.statusCode}`);
  const isLocal =
    res.req?.socket?.remoteAddress === '127.0.0.1' ||
    res.req?.socket?.remoteAddress === '::1' ||
    res.req?.socket?.remoteAddress === '::ffff:127.0.0.1';
  console.log(`  Intercepted: ${isLocal ? 'YES ✓' : 'NO ✗'}`);
  console.log(`  Remote address: ${res.req?.socket?.remoteAddress}:${res.req?.socket?.remotePort}`);

  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      console.log('\n✓ Response is valid JSON');
      console.log(`  Has candidates: ${json.candidates ? 'YES' : 'NO'}`);

      if (isLocal && json.candidates) {
        console.log('\n✅ SUCCESS: Mock interception is working correctly!');
        console.log('   Requests to Google API are being redirected to mock server.');
        process.exit(0);
      } else {
        console.log('\n❌ FAILURE: Mock interception is NOT working!');
        console.log('   Requests are still hitting real APIs.');
        process.exit(1);
      }
    } catch (err) {
      console.error('\n❌ Response is not valid JSON:', err.message);
      console.log('Response body:', data.substring(0, 200));
      process.exit(1);
    }
  });
});

req.on('error', (err) => {
  console.error('❌ Request failed:', err.message);
  console.log('\nMake sure mock server is running:');
  console.log('  node tests/load/mock-server.js');
  process.exit(1);
});

const payload = JSON.stringify({
  contents: [
    {
      parts: [
        {
          text: 'Test request',
        },
      ],
    },
  ],
});

req.write(payload);
req.end();
