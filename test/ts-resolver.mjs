// Node loader for the node:test files: the repo imports its own modules with
// `.js` extensions (webpack's extensionAlias resolves them to `.ts`); Node's
// type-stripping runner does not, so this hook tries the `.ts` twin first.
//   node --experimental-strip-types --import ./scripts/ts-resolver.mjs --test scripts/<file>.test.ts
import { register } from 'node:module'
import { pathToFileURL } from 'node:url'

register(
  'data:text/javascript,' +
    encodeURIComponent(`
      import { existsSync } from 'node:fs'
      import { fileURLToPath } from 'node:url'
      export async function resolve(specifier, context, next) {
        if (specifier.startsWith('.') && specifier.endsWith('.js') && context.parentURL) {
          const url = new URL(specifier, context.parentURL)
          const ts = url.href.replace(/\\.js$/, '.ts')
          if (existsSync(fileURLToPath(ts))) return next(ts, context)
        }
        return next(specifier, context)
      }
    `),
  pathToFileURL('./'),
)
