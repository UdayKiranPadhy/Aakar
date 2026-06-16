/**
 * Prism ships each language grammar as a side-effecting JS module that augments
 * the global `Prism.languages`. These modules carry no bundled type
 * declarations, so we declare them as ambient modules for the side-effect
 * `import "prismjs/components/prism-python"` in highlight.ts.
 *
 * Registering another language later = one more import there + (only if it's a
 * new path) one more line here.
 */
declare module "prismjs/components/prism-python";
