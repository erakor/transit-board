import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'
import prettier from 'eslint-config-prettier/flat'
import storybook from 'eslint-plugin-storybook'

/** Secret-looking env var names. A name that matches but is safe in the browser goes in REVIEWED_PUBLIC_ENV. */
const SECRET_ENV_NAME = 'TOKEN|SECRET|PASSWORD|PRIVATE|CREDENTIAL|(^|_)KEY(_|$)'

/** Reviewed and safe in the browser. Adding a name here is a security decision: say why. */
const REVIEWED_PUBLIC_ENV = []

const REVIEWED = REVIEWED_PUBLIC_ENV.length ? `(${REVIEWED_PUBLIC_ENV.join('|')})` : '(?!)'
const PROCESS_ENV = "MemberExpression[object.object.name='process'][object.property.name='env']"
const PUBLIC_ENV_MESSAGE =
  'Next.js inlines this into the browser bundle. TRANSIT_TOKEN and DASHBOARD_KEY must stay on the server: read the private name there, or add a reviewed exception to REVIEWED_PUBLIC_ENV in eslint.config.mjs.'

// Next.js inlines every `process.env.NEXT_PUBLIC_*` read into the browser bundle. Dot and string-bracket access are
// both covered.
const PUBLIC_SECRET_READS = ['property.name', 'property.value'].map(property => ({
  selector: `${PROCESS_ENV}[${property}=/^NEXT_PUBLIC_.*(${SECRET_ENV_NAME})/]:not([${property}=/^NEXT_PUBLIC_${REVIEWED}$/])`,
  message: PUBLIC_ENV_MESSAGE,
}))

// Every key of the next.config.ts `env` block is inlined too, prefixed or not.
const SECRETS_IN_NEXT_CONFIG_ENV = ['property.name', 'property.value'].map(property => ({
  selector: `Property:matches([key.name='env'], [key.value='env']) > ObjectExpression ${PROCESS_ENV}[${property}=/${SECRET_ENV_NAME}/]:not([${property}=/^${REVIEWED}$/])`,
  message: PUBLIC_ENV_MESSAGE,
}))

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  ...storybook.configs['flat/recommended'],
  prettier,
  {
    // Destructuring a prop only to keep it out of `...rest` (or a `_`-prefixed arg) is deliberate.
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn', { ignoreRestSiblings: true, argsIgnorePattern: '^_' }],
    },
  },
  {
    // A later block setting the same rule replaces these options rather than merging, so next.config repeats them.
    files: ['**/*.{js,jsx,mjs,cjs,ts,tsx}'],
    rules: { 'no-restricted-syntax': ['error', ...PUBLIC_SECRET_READS] },
  },
  {
    files: ['next.config.*'],
    rules: { 'no-restricted-syntax': ['error', ...PUBLIC_SECRET_READS, ...SECRETS_IN_NEXT_CONFIG_ENV] },
  },
  globalIgnores([
    '.next/**',
    'out/**',
    'next-env.d.ts',
    'src/lib/transit-api.d.ts',
    '!.storybook',
    'storybook-static',
    'screenshots',
  ]),
])

export default eslintConfig
