import express from 'express';
import { createHash, randomBytes } from 'node:crypto';

const app = express();
const PORT = 8888;

app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// ============================================================================
// Mock Gemini API
// ============================================================================
app.post('/v1beta/models/:model\\:generateContent', (req, res) => {
  // Simulate Gemini API latency (100-300ms for load testing)
  const delay = 100 + Math.random() * 200;

  setTimeout(() => {
    const recommendations = generateMockRecommendations(20);

    res.json({
      candidates: [
        {
          content: {
            parts: [
              {
                text: JSON.stringify({
                  recommendations: recommendations.map((r) => ({
                    imdbId: r.imdbId,
                    reason: r.reason,
                  })),
                }),
              },
            ],
            role: 'model',
          },
          finishReason: 'STOP',
          index: 0,
        },
      ],
      usageMetadata: {
        promptTokenCount: 500,
        candidatesTokenCount: 300,
        totalTokenCount: 800,
      },
    });
  }, delay);
});

// ============================================================================
// Mock OpenAI/Perplexity API
// ============================================================================
app.post('/chat/completions', (req, res) => {
  // Simulate OpenAI/Perplexity API latency (150-350ms for load testing)
  const delay = 150 + Math.random() * 200;

  setTimeout(() => {
    const recommendations = generateMockRecommendations(20);

    res.json({
      id: `chatcmpl-${randomBytes(16).toString('hex')}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: req.body.model || 'gpt-4',
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: JSON.stringify({
              recommendations: recommendations.map((r) => ({
                imdbId: r.imdbId,
                reason: r.reason,
              })),
            }),
          },
          finish_reason: 'stop',
        },
      ],
      usage: {
        prompt_tokens: 500,
        completion_tokens: 300,
        total_tokens: 800,
      },
    });
  }, delay);
});

// ============================================================================
// Mock Cinemeta API
// ============================================================================
const MOCK_TITLES = [
  'The Shawshank Redemption',
  'The Godfather',
  'The Dark Knight',
  'Pulp Fiction',
  'Forrest Gump',
  'Inception',
  'Fight Club',
  'The Matrix',
  'Goodfellas',
  'The Silence of the Lambs',
  'Interstellar',
  'The Green Mile',
  'Parasite',
  'Gladiator',
  'The Prestige',
  'The Departed',
  'Whiplash',
  'The Lion King',
  'Back to the Future',
  'Terminator 2',
  'Alien',
  'Die Hard',
  'Blade Runner',
  'Jurassic Park',
  'Star Wars',
  'Avatar',
];

const GENRES = [
  ['Action', 'Thriller'],
  ['Drama', 'Crime'],
  ['Sci-Fi', 'Adventure'],
  ['Comedy', 'Drama'],
  ['Horror', 'Thriller'],
  ['Romance', 'Drama'],
  ['Animation', 'Family'],
  ['Mystery', 'Thriller'],
  ['Fantasy', 'Adventure'],
];

app.get('/meta/:type/:imdbId.json', (req, res) => {
  // Simulate Cinemeta latency (200-500ms)
  const delay = 200 + Math.random() * 300;

  setTimeout(() => {
    const { type, imdbId } = req.params;
    const hash = parseInt(imdbId.replace(/\D/g, ''), 10) || 0;
    const titleIndex = hash % MOCK_TITLES.length;
    const genreIndex = hash % GENRES.length;

    res.json({
      meta: {
        id: imdbId,
        type: type,
        name: MOCK_TITLES[titleIndex],
        poster: `https://images.metahub.space/poster/medium/${imdbId}/img`,
        background: `https://images.metahub.space/background/medium/${imdbId}/img`,
        genres: GENRES[genreIndex],
        year: String(2000 + (hash % 24)),
        description: `Mock description for ${MOCK_TITLES[titleIndex]}. This is a load testing placeholder with realistic data structure.`,
        imdbRating: (7.0 + (hash % 30) / 10).toFixed(1),
        runtime: `${90 + (hash % 90)} min`,
        releaseInfo: String(2000 + (hash % 24)),
        logo: `https://images.metahub.space/logo/medium/${imdbId}/img`,
        videos: [
          {
            id: `${imdbId}-trailer`,
            title: 'Trailer',
            released: new Date().toISOString(),
          },
        ],
      },
    });
  }, delay);
});

// ============================================================================
// Mock Weather API
// ============================================================================
const WEATHER_CONDITIONS = [
  'Sunny',
  'Partly cloudy',
  'Cloudy',
  'Overcast',
  'Light rain',
  'Moderate rain',
  'Heavy rain',
  'Clear',
  'Foggy',
  'Snowy',
];

app.get('/v1/current.json', (req, res) => {
  // Simulate weather API latency (100-300ms)
  const delay = 100 + Math.random() * 200;

  setTimeout(() => {
    const temp = 5 + Math.random() * 30; // 5-35°C
    const conditionIndex = Math.floor(Math.random() * WEATHER_CONDITIONS.length);

    res.json({
      location: {
        name: req.query.q || 'Mock City',
        region: 'Mock Region',
        country: 'Mock Country',
        lat: 40.7128,
        lon: -74.006,
        tz_id: 'America/New_York',
        localtime: new Date().toISOString().replace('T', ' ').substring(0, 19),
      },
      current: {
        temp_c: temp,
        temp_f: (temp * 9) / 5 + 32,
        condition: {
          text: WEATHER_CONDITIONS[conditionIndex],
          icon: '//cdn.weatherapi.com/weather/64x64/day/113.png',
          code: 1000,
        },
        wind_kph: Math.random() * 30,
        humidity: 40 + Math.random() * 50,
        cloud: Math.random() * 100,
        feelslike_c: temp - 2 + Math.random() * 4,
      },
    });
  }, delay);
});

// ============================================================================
// Health Check
// ============================================================================
app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    service: 'mock-server',
    uptime: process.uptime(),
  });
});

// ============================================================================
// Helper Functions
// ============================================================================
function generateMockRecommendations(count) {
  const recommendations = [];
  const reasons = [
    'Perfect for a cozy evening with its heartwarming story',
    'Intense action sequences will keep you on the edge of your seat',
    'Critically acclaimed with stunning cinematography',
    'A thought-provoking narrative that stays with you',
    'Great ensemble cast with compelling character development',
    'Visually stunning with groundbreaking special effects',
    'A modern classic with timeless themes',
    'Fast-paced thriller with unexpected twists',
    'Emotionally powerful with brilliant performances',
    'Innovative storytelling that redefines the genre',
  ];

  for (let i = 0; i < count; i++) {
    const imdbNum = 7000000 + Math.floor(Math.random() * 9000000);
    recommendations.push({
      imdbId: `tt${imdbNum}`,
      reason: reasons[Math.floor(Math.random() * reasons.length)],
    });
  }

  return recommendations;
}

// ============================================================================
// Error Handling
// ============================================================================
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: {
      message: 'Internal server error',
      type: 'mock_server_error',
    },
  });
});

// ============================================================================
// Start Server
// ============================================================================
app.listen(PORT, '0.0.0.0', () => {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║          Mock Server for Load Testing                 ║');
  console.log('╟────────────────────────────────────────────────────────╢');
  console.log(`║  Status: Running on http://localhost:${PORT}            ║`);
  console.log('║                                                        ║');
  console.log('║  Mocked APIs:                                          ║');
  console.log('║    - Gemini API (3-5s latency)                         ║');
  console.log('║    - OpenAI/Perplexity API (4-6s latency)              ║');
  console.log('║    - Cinemeta API (200-500ms latency)                  ║');
  console.log('║    - Weather API (100-300ms latency)                   ║');
  console.log('║                                                        ║');
  console.log('║  Health Check: http://localhost:8888/health            ║');
  console.log('╚════════════════════════════════════════════════════════╝');
  console.log('');
  console.log('Ready for load testing...');
  console.log('');
});
