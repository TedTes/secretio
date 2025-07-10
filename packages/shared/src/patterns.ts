import { ApiKeyPattern } from './';

export const API_KEY_PATTERNS: Record<string, ApiKeyPattern> = {
  stripe_secret: {
    regex: /sk_live_[a-zA-Z0-9]{24,}/g,
    severity: 'high',
    description: 'Stripe Secret Key (Live)'
  },
  stripe_test: {
    regex: /sk_test_[a-zA-Z0-9]{24,}/g,
    severity: 'medium',
    description: 'Stripe Secret Key (Test)'
  },
  stripe_publishable: {
    regex: /pk_live_[a-zA-Z0-9]{24,}/g,
    severity: 'medium',
    description: 'Stripe Publishable Key (Live)'
  },
  aws_access_key: {
    regex: /AKIA[0-9A-Z]{16}/g,
    severity: 'high',
    description: 'AWS Access Key ID'
  },
  openai: {
    regex: /sk-[a-zA-Z0-9]{48}/g,
    severity: 'high',
    description: 'OpenAI API Key'
  },
  github_token: {
    regex: /ghp_[a-zA-Z0-9]{36}/g,
    severity: 'high',
    description: 'GitHub Personal Access Token'
  },
  github_oauth: {
    regex: /gho_[a-zA-Z0-9]{36}/g,
    severity: 'high',
    description: 'GitHub OAuth Access Token'
  },
  sendgrid: {
    regex: /SG\.[a-zA-Z0-9_-]{22}\.[a-zA-Z0-9_-]{43}/g,
    severity: 'high',
    description: 'SendGrid API Key'
  },
  mailgun: {
    regex: /key-[a-f0-9]{32}/g,
    severity: 'medium',
    description: 'Mailgun API Key'
  },
  twilio_sid: {
    regex: /AC[a-f0-9]{32}/g,
    severity: 'high',
    description: 'Twilio Account SID'
  },
  twilio_auth: {
    regex: /SK[a-f0-9]{32}/g,
    severity: 'high',
    description: 'Twilio Auth Token'
  },
  slack_token: {
    regex: /xox[baprs]-([0-9a-zA-Z]{10,48})/g,
    severity: 'high',
    description: 'Slack Token'
  },
  google_api: {
    regex: /AIza[0-9A-Za-z_-]{35}/g,
    severity: 'high',
    description: 'Google API Key'
  },
  jwt_token: {
    regex: /eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*/g,
    severity: 'medium',
    description: 'JSON Web Token'
  }
};

export const FILE_PATTERNS = {
  include: [
    '**/*.js',
    '**/*.ts',
    '**/*.jsx',
    '**/*.tsx',
    '**/*.json',
    '**/*.env*',
    '**/*.md',
    '**/*.yml',
    '**/*.yaml',
    '**/*.config.*',
    '**/*.toml',
    '**/*.ini',
    '**/.*rc',
    '**/.*rc.*'
  ],
  exclude: [
    '**/node_modules/**',
    '**/.next/**',
    '**/dist/**',
    '**/build/**',
    '**/.git/**',
    '**/coverage/**',
    '**/*.min.js',
    '**/*.bundle.js',
    '**/package-lock.json',
    '**/yarn.lock'
  ]
};