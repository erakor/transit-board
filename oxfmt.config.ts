import base from '@erakor/toolchain/oxfmt'

// The shared style comes from erakor/toolchain; only what is this repo's own goes here.
const config = {
  ...base,
  sortTailwindcss: {
    stylesheet: 'src/app/globals.css',
    functions: ['cn', 'cva'],
  },
  ignorePatterns: [
    'node_modules/',
    '.next/',
    'out/',
    'storybook-static/',
    '.vercel/',
    '*.tsbuildinfo',
    'coverage/',
    'screenshots/',
    'src/lib/transit-api.d.ts',
    'next-env.d.ts',
    'pnpm-lock.yaml',
    '.env*',
    '*.log',
    '.claude/skills/',
    '.claude/settings.local.json',
  ],
}

export default config
