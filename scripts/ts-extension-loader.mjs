import { access } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { dirname, resolve as resolvePath } from 'node:path';

async function fileExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export async function resolve(specifier, context, nextResolve) {
  if (
    (specifier.startsWith('./') || specifier.startsWith('../'))
    && !/\.[cm]?[jt]sx?$/.test(specifier)
    && context.parentURL?.startsWith('file:')
  ) {
    const parentPath = new URL(context.parentURL).pathname;
    const candidate = resolvePath(dirname(parentPath), `${specifier}.ts`);
    if (await fileExists(candidate)) {
      return {
        shortCircuit: true,
        url: pathToFileURL(candidate).href,
      };
    }
  }

  return nextResolve(specifier, context);
}
