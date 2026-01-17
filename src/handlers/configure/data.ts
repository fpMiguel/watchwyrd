/**
 * Watchwyrd - Configure Page Data
 *
 * Static data for timezone, country lists and other configuration options.
 * Separated for maintainability.
 */

export const TIMEZONES_BY_REGION: Record<string, string[]> = {
  Americas: [
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'America/Anchorage',
    'America/Phoenix',
    'America/Toronto',
    'America/Vancouver',
    'America/Mexico_City',
    'America/Bogota',
    'America/Lima',
    'America/Santiago',
    'America/Buenos_Aires',
    'America/Sao_Paulo',
    'America/Caracas',
    'Pacific/Honolulu',
  ],
  Europe: [
    'Europe/London',
    'Europe/Dublin',
    'Europe/Paris',
    'Europe/Berlin',
    'Europe/Rome',
    'Europe/Madrid',
    'Europe/Amsterdam',
    'Europe/Brussels',
    'Europe/Vienna',
    'Europe/Warsaw',
    'Europe/Prague',
    'Europe/Stockholm',
    'Europe/Oslo',
    'Europe/Helsinki',
    'Europe/Athens',
    'Europe/Moscow',
    'Europe/Istanbul',
  ],
  Asia: [
    'Asia/Tokyo',
    'Asia/Seoul',
    'Asia/Shanghai',
    'Asia/Hong_Kong',
    'Asia/Singapore',
    'Asia/Taipei',
    'Asia/Bangkok',
    'Asia/Jakarta',
    'Asia/Manila',
    'Asia/Kolkata',
    'Asia/Mumbai',
    'Asia/Dubai',
    'Asia/Riyadh',
    'Asia/Tehran',
    'Asia/Jerusalem',
    'Asia/Karachi',
    'Asia/Dhaka',
    'Asia/Kuala_Lumpur',
    'Asia/Ho_Chi_Minh',
  ],
  Oceania: [
    'Australia/Sydney',
    'Australia/Melbourne',
    'Australia/Brisbane',
    'Australia/Perth',
    'Australia/Adelaide',
    'Pacific/Auckland',
    'Pacific/Fiji',
    'Pacific/Guam',
  ],
  Africa: [
    'Africa/Cairo',
    'Africa/Johannesburg',
    'Africa/Lagos',
    'Africa/Nairobi',
    'Africa/Casablanca',
    'Africa/Algiers',
    'Africa/Tunis',
  ],
  Other: ['UTC'],
};

export interface CountryInfo {
  code: string;
  name: string;
}

export const COUNTRIES: CountryInfo[] = [
  { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'CA', name: 'Canada' },
  { code: 'AU', name: 'Australia' },
  { code: 'NZ', name: 'New Zealand' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'ES', name: 'Spain' },
  { code: 'IT', name: 'Italy' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'BE', name: 'Belgium' },
  { code: 'AT', name: 'Austria' },
  { code: 'CH', name: 'Switzerland' },
  { code: 'SE', name: 'Sweden' },
  { code: 'NO', name: 'Norway' },
  { code: 'DK', name: 'Denmark' },
  { code: 'FI', name: 'Finland' },
  { code: 'PL', name: 'Poland' },
  { code: 'PT', name: 'Portugal' },
  { code: 'IE', name: 'Ireland' },
  { code: 'JP', name: 'Japan' },
  { code: 'KR', name: 'South Korea' },
  { code: 'CN', name: 'China' },
  { code: 'TW', name: 'Taiwan' },
  { code: 'HK', name: 'Hong Kong' },
  { code: 'SG', name: 'Singapore' },
  { code: 'MY', name: 'Malaysia' },
  { code: 'TH', name: 'Thailand' },
  { code: 'PH', name: 'Philippines' },
  { code: 'ID', name: 'Indonesia' },
  { code: 'VN', name: 'Vietnam' },
  { code: 'IN', name: 'India' },
  { code: 'PK', name: 'Pakistan' },
  { code: 'AE', name: 'United Arab Emirates' },
  { code: 'SA', name: 'Saudi Arabia' },
  { code: 'IL', name: 'Israel' },
  { code: 'TR', name: 'Turkey' },
  { code: 'RU', name: 'Russia' },
  { code: 'BR', name: 'Brazil' },
  { code: 'MX', name: 'Mexico' },
  { code: 'AR', name: 'Argentina' },
  { code: 'CL', name: 'Chile' },
  { code: 'CO', name: 'Colombia' },
  { code: 'PE', name: 'Peru' },
  { code: 'ZA', name: 'South Africa' },
  { code: 'EG', name: 'Egypt' },
  { code: 'NG', name: 'Nigeria' },
  { code: 'KE', name: 'Kenya' },
  { code: 'OTHER', name: 'Other' },
];

export const TZ_TO_COUNTRY: Record<string, string> = {
  'America/New_York': 'US',
  'America/Chicago': 'US',
  'America/Denver': 'US',
  'America/Los_Angeles': 'US',
  'America/Phoenix': 'US',
  'America/Anchorage': 'US',
  'Pacific/Honolulu': 'US',
  'America/Toronto': 'CA',
  'America/Vancouver': 'CA',
  'Europe/London': 'GB',
  'Europe/Dublin': 'IE',
  'Europe/Paris': 'FR',
  'Europe/Berlin': 'DE',
  'Europe/Rome': 'IT',
  'Europe/Madrid': 'ES',
  'Europe/Amsterdam': 'NL',
  'Europe/Brussels': 'BE',
  'Europe/Vienna': 'AT',
  'Europe/Warsaw': 'PL',
  'Europe/Prague': 'CZ',
  'Europe/Stockholm': 'SE',
  'Europe/Oslo': 'NO',
  'Europe/Helsinki': 'FI',
  'Europe/Athens': 'GR',
  'Europe/Moscow': 'RU',
  'Europe/Istanbul': 'TR',
  'Asia/Tokyo': 'JP',
  'Asia/Seoul': 'KR',
  'Asia/Shanghai': 'CN',
  'Asia/Hong_Kong': 'HK',
  'Asia/Singapore': 'SG',
  'Asia/Taipei': 'TW',
  'Asia/Bangkok': 'TH',
  'Asia/Jakarta': 'ID',
  'Asia/Manila': 'PH',
  'Asia/Kolkata': 'IN',
  'Asia/Mumbai': 'IN',
  'Asia/Dubai': 'AE',
  'Asia/Riyadh': 'SA',
  'Asia/Tehran': 'IR',
  'Asia/Jerusalem': 'IL',
  'Australia/Sydney': 'AU',
  'Australia/Melbourne': 'AU',
  'Australia/Brisbane': 'AU',
  'Australia/Perth': 'AU',
  'Pacific/Auckland': 'NZ',
  'America/Mexico_City': 'MX',
  'America/Bogota': 'CO',
  'America/Lima': 'PE',
  'America/Santiago': 'CL',
  'America/Buenos_Aires': 'AR',
  'America/Sao_Paulo': 'BR',
  'Africa/Cairo': 'EG',
  'Africa/Johannesburg': 'ZA',
  'Africa/Lagos': 'NG',
  'Africa/Nairobi': 'KE',
};

export interface PresetProfile {
  id: string;
  name: string;
  icon: string;
  description: string;
}

export const PRESET_PROFILES: PresetProfile[] = [
  {
    id: 'casual',
    name: 'Casual Viewer',
    icon: '🍿',
    description: 'Popular picks, easy watching',
  },
  {
    id: 'cinephile',
    name: 'Cinephile',
    icon: '🎬',
    description: 'Critically acclaimed, award winners',
  },
  {
    id: 'adventurous',
    name: 'Adventurous',
    icon: '🌍',
    description: 'International cinema, hidden gems',
  },
  {
    id: 'family',
    name: 'Family Friendly',
    icon: '👨‍👩‍👧‍👦',
    description: 'Safe content for all ages',
  },
  {
    id: 'custom',
    name: 'Custom',
    icon: '⚙️',
    description: 'Full control over all settings',
  },
];

export interface AIProvider {
  id: string;
  name: string;
  icon: string;
  description: string;
  features: string[];
}

export const AI_PROVIDERS: AIProvider[] = [
  {
    id: 'perplexity',
    name: 'Perplexity AI',
    icon: '🔮',
    description: 'Real-time web search for latest releases',
    features: ['Live web search', 'Up-to-date info', 'Fast responses'],
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    icon: '✨',
    description: 'Powerful AI with free tier available',
    features: ['Free tier', 'Large context', 'High quality'],
  },
];

export const CATALOG_SIZE_OPTIONS = [
  { value: 5, label: '5 items', description: 'Minimal' },
  { value: 10, label: '10 items', description: 'Quick' },
  { value: 20, label: '20 items', description: 'Default' },
  { value: 30, label: '30 items', description: 'Extended' },
  { value: 50, label: '50 items', description: 'Maximum' },
];

export const ALL_GENRES = [
  'Action',
  'Adventure',
  'Animation',
  'Comedy',
  'Crime',
  'Documentary',
  'Drama',
  'Family',
  'Fantasy',
  'History',
  'Horror',
  'Music',
  'Mystery',
  'Romance',
  'Science Fiction',
  'Thriller',
  'War',
  'Western',
];
