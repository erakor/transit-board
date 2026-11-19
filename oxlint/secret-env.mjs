// Oxlint JS plugin: keeps secret-looking env vars out of the browser bundle.
//
// Next.js inlines every `process.env.NEXT_PUBLIC_*` read into client code, and every key of the
// next.config `env` block, prefixed or not. TRANSIT_TOKEN and DASHBOARD_KEY must stay on the server.
//
// A name that looks secret but is safe in the browser goes in the rule's `allow` option in
// .oxlintrc.json. Adding one is a security decision: say why next to it.

const SECRET = /TOKEN|SECRET|PASSWORD|PRIVATE|CREDENTIAL|(^|_)KEY(_|$)/

const MESSAGE =
  'Next.js inlines this into the browser bundle. TRANSIT_TOKEN and DASHBOARD_KEY must stay on the server: ' +
  'read the private name there, or add a reviewed exception to the rule\'s "allow" option in .oxlintrc.json.'

/** The variable name of a `process.env.NAME` or `process.env['NAME']` read, else null. */
function envName(node) {
  const object = node.object
  if (
    object?.type !== 'MemberExpression' ||
    object.object?.type !== 'Identifier' ||
    object.object.name !== 'process' ||
    object.computed ||
    object.property?.name !== 'env'
  ) {
    return null
  }
  if (!node.computed) return node.property.name
  return typeof node.property.value === 'string' ? node.property.value : null
}

/** True inside the value of an `env: { ... }` property (next.config's inlined env block). */
function insideEnvBlock(node) {
  for (let parent = node.parent; parent; parent = parent.parent) {
    if (
      parent.type === 'Property' &&
      parent.value?.type === 'ObjectExpression' &&
      (parent.key?.name === 'env' || parent.key?.value === 'env')
    ) {
      return true
    }
  }
  return false
}

const options = [
  {
    type: 'object',
    properties: { allow: { type: 'array', items: { type: 'string' } } },
    additionalProperties: false,
  },
]

function allowed(context, name) {
  return (context.options[0]?.allow ?? []).includes(name)
}

const plugin = {
  meta: { name: 'secret-env' },
  rules: {
    // Every file: a NEXT_PUBLIC_ name that looks secret.
    'no-public-secret': {
      meta: { type: 'problem', schema: options },
      create(context) {
        return {
          MemberExpression(node) {
            const name = envName(node)
            if (
              name?.startsWith('NEXT_PUBLIC_') &&
              SECRET.test(name.slice('NEXT_PUBLIC_'.length)) &&
              !allowed(context, name)
            ) {
              context.report({ node, message: MESSAGE })
            }
          },
        }
      },
    },
    // next.config only: any secret-looking name read inside the `env` block.
    'no-secret-in-config-env': {
      meta: { type: 'problem', schema: options },
      create(context) {
        return {
          MemberExpression(node) {
            const name = envName(node)
            if (name && SECRET.test(name) && !allowed(context, name) && insideEnvBlock(node)) {
              context.report({ node, message: MESSAGE })
            }
          },
        }
      },
    },
  },
}

export default plugin
