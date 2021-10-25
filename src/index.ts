// @deno-types="./types.ts"
import { ElementInternals } from './element-internals.ts';
import { CustomStateSet } from './CustomStateSet.ts';
import './element-internals.ts';
export * from './types.ts';

declare global {
  interface Window {
    CustomStateSet: typeof CustomStateSet;
    ElementInternals: typeof ElementInternals;
  }
  interface Element {
    /**
     * Attaches an ElementInternals instance to a custom element. Calling this method
     * on a built-in element will throw an error.
     */
    attachInternals?: () => ElementInternals
  }
}
