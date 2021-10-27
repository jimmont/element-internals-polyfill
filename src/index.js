import { ElementInternals } from './element-internals.js';
import { CustomStateSet } from './CustomStateSet.js';
import './element-internals.js';

if(!self.CustomStateSet){
	Object.assign(self, {CustomStateSet});
}
if(!self.ElementInternals){
	Object.assign(self, {ElementInternals});
}
/**
     * Attaches an ElementInternals instance to a custom element. Calling this method
     * on a built-in element will throw an error.
     */
