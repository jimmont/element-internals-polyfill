import {
  internalsMap,
  refMap,
  refValueMap,
  shadowHostsMap,
  shadowRootMap,
  validationAnchorMap,
  validityMap,
  validationMessageMap,
} from './maps.ts';
import {
  createHiddenInput,
  findParentForm,
  initRef,
  overrideFormMethod,
  removeHiddenInputs,
  throwIfNotFormAssociated,
  upgradeInternals
} from './utils.ts';
import { initAom } from './aom.ts';
import { ValidityState, reconcileValidty, setValid } from './ValidityState.ts';
import { deferUpgrade, observerCallback, observerConfig } from './mutation-observers.ts';
import { IElementInternals, ICustomElement, LabelsList } from './types.ts';
import { CustomStateSet } from './CustomStateSet.ts';

export class ElementInternals implements IElementInternals {
  ariaAtomic: string;
  ariaAutoComplete: string;
  ariaBusy: string;
  ariaChecked: string;
  ariaColCount: string;
  ariaColIndex: string;
  ariaColSpan: string;
  ariaCurrent: string;
  ariaDisabled: string;
  ariaExpanded: string;
  ariaHasPopup: string;
  ariaHidden: string;
  ariaKeyShortcuts: string;
  ariaLabel: string;
  ariaLevel: string;
  ariaLive: string;
  ariaModal: string;
  ariaMultiLine: string;
  ariaMultiSelectable: string;
  ariaOrientation: string;
  ariaPlaceholder: string;
  ariaPosInSet: string;
  ariaPressed: string;
  ariaReadOnly: string;
  ariaRelevant: string;
  ariaRequired: string;
  ariaRoleDescription: string;
  ariaRowCount: string;
  ariaRowIndex: string;
  ariaRowSpan: string;
  ariaSelected: string;
  ariaSort: string;
  ariaValueMax: string;
  ariaValueMin: string;
  ariaValueNow: string;
  ariaValueText: string;
  role: string;

  states: CustomStateSet;

  static get isPolyfilled() {
    return true;
  }

  constructor(ref: ICustomElement) {
    if (!ref || !ref.tagName || ref.tagName.indexOf('-') === -1) {
      throw new TypeError('Illegal constructor');
    }
    const rootNode = ref.getRootNode();
    const validity = new ValidityState();
    this.states = new CustomStateSet(ref);
    refMap.set(this, ref);
    validityMap.set(this, validity);
    internalsMap.set(ref, this);
    initAom(ref, this);
    initRef(ref, this);
    Object.seal(this);

    upgradeInternals(ref);

    /**
     * If appended from a DocumentFragment, wait until it is connected
     * before attempting to upgrade the internals instance
     */
    if (rootNode instanceof DocumentFragment) {
      deferUpgrade(rootNode);
    }
  }

  /**
   * Will return true if the element is in a valid state
   */
  checkValidity(): boolean {
    const ref = refMap.get(this);
    throwIfNotFormAssociated(ref, `Failed to execute 'checkValidity' on 'ElementInternals': The target element is not a form-associated custom element.`);
    const validity = validityMap.get(this);
    if (!validity.valid) {
      const validityEvent = new Event('invalid', {
        bubbles: false,
        cancelable: true,
        composed: false
      });
      ref.dispatchEvent(validityEvent);
    }
    return validity.valid;
  }

  /** The form element the custom element is associated with */
  get form(): HTMLFormElement {
    const ref = refMap.get(this);
    throwIfNotFormAssociated(ref, `Failed to read the 'form' property from 'ElementInternals': The target element is not a form-associated custom element.`);
    let form;
    if (ref.constructor['formAssociated'] === true) {
      form = findParentForm(ref);
    }
    return form;
  }

  /** A list of all relative form labels for this element */
  get labels(): LabelsList {
    const ref = refMap.get(this);
    throwIfNotFormAssociated(ref, `Failed to read the 'labels' property from 'ElementInternals': The target element is not a form-associated custom element.`);
    const id = ref.getAttribute('id');
    const hostRoot = ref.getRootNode() as Element;
    if (hostRoot && id) {
      return hostRoot ? hostRoot.querySelectorAll(`[for=${id}]`) : [];
    }
    return [];
  }

  /** Will report the elements validity state */
  reportValidity(): boolean {
    const ref = refMap.get(this);
    throwIfNotFormAssociated(ref, `Failed to execute 'reportValidity' on 'ElementInternals': The target element is not a form-associated custom element.`);
    const valid =  this.checkValidity();
    const anchor = validationAnchorMap.get(this);
    if (anchor && !ref.constructor['formAssociated']) {
      throw new DOMException(`Failed to execute 'setValidity' on 'ElementInternals': The target element is not a form-associated custom element.`);
    }
    if (!valid && anchor) {
      ref.focus();
      anchor.focus();
    }
    return valid;
  }

  /** Sets the element's value within the form */
  setFormValue(value: string | FormData | null): void {
    const ref = refMap.get(this);
    throwIfNotFormAssociated(ref, `Failed to execute 'setFormValue' on 'ElementInternals': The target element is not a form-associated custom element.`);
    removeHiddenInputs(this);
    if (value != null && !(value instanceof FormData)) {
      if (ref.getAttribute('name')) {
        const hiddenInput = createHiddenInput(ref, this);
        hiddenInput.value = value;
      }
    } else if (value != null && value instanceof FormData) {
      value.forEach((formDataValue, formDataKey) => {
        if (typeof formDataValue === 'string') {
          const hiddenInput = createHiddenInput(ref, this);
          hiddenInput.name = formDataKey;
          hiddenInput.value = formDataValue;
        }
      });
    }
    refValueMap.set(ref, value);
  }

  /**
   * Sets the element's validity. The first argument is a partial ValidityState object
   * reflecting the changes to be made to the element's validity. If the element is invalid,
   * the second argument sets the element's validition message.
   *
   * If the field is valid and a message is specified, the method will throw a TypeError.
   */
  setValidity(validityChanges: Partial<globalThis.ValidityState>, validationMessage?: string, anchor?: HTMLElement) {
    const ref = refMap.get(this);
    throwIfNotFormAssociated(ref, `Failed to execute 'setValidity' on 'ElementInternals': The target element is not a form-associated custom element.`);
    if (!validityChanges) {
      throw new TypeError('Failed to execute \'setValidity\' on \'ElementInternals\': 1 argument required, but only 0 present.');
    }
    validationAnchorMap.set(this, anchor);
    const validity = validityMap.get(this);
    const validityChangesObj: Partial<ValidityState> = {};
    for (const key in validityChanges) {
      validityChangesObj[key] = validityChanges[key];
    }
    if (Object.keys(validityChangesObj).length === 0) {
      setValid(validity);
    }
    const check = { ...validity, ...validityChangesObj };
    delete check.valid;
    const { valid } = reconcileValidty(validity, check);

    if (!valid && !validationMessage) {
      throw new DOMException(`Failed to execute 'setValidity' on 'ElementInternals': The second argument should not be empty if one or more flags in the first argument are true.`);
    }
    validationMessageMap.set(this, valid ? '' : validationMessage);
    ref.toggleAttribute('internals-invalid', !valid);
    ref.toggleAttribute('internals-valid', valid);
    ref.setAttribute('aria-invalid', `${!valid}`);
  }

  get shadowRoot(): ShadowRoot | null {
    const ref = refMap.get(this);
    const shadowRoot = shadowRootMap.get(ref);
    if (shadowRoot) {
      return shadowRootMap.get(ref);
    }
    return null;
  }

  /** The element's validation message set during a call to ElementInternals.setValidity */
  get validationMessage(): string {
    const ref = refMap.get(this);
    throwIfNotFormAssociated(ref, `Failed to read the 'validationMessage' property from 'ElementInternals': The target element is not a form-associated custom element.`);
    return validationMessageMap.get(this);
  }

  /** The current validity state of the object */
  get validity(): globalThis.ValidityState {
    const ref = refMap.get(this);
    throwIfNotFormAssociated(ref, `Failed to read the 'validity' property from 'ElementInternals': The target element is not a form-associated custom element.`);
    const validity = validityMap.get(this);
    return validity;
  }

  /** If true the element will participate in a form's constraint validation. */
  get willValidate(): boolean {
    const ref = refMap.get(this);
    throwIfNotFormAssociated(ref, `Failed to read the 'willValidate' property from 'ElementInternals': The target element is not a form-associated custom element.`);
    if (ref.disabled || ref.hasAttribute('disabled')) {
      return false;
    }
    return true;
  }
}

declare global {
  interface Window {
    ElementInternals: typeof ElementInternals
  }
}

if (!window.CustomStateSet) {
  window.CustomStateSet = CustomStateSet;
}

export function isElementInternalsSupported(): boolean {
  if (!window.ElementInternals) {
    return false;
  }

  class ElementInternalsFeatureDetection extends HTMLElement {
    internals: IElementInternals;

    constructor() {
      super();
      this.internals = this.attachInternals();
    }
  }
  const randomName = `element-internals-feature-detection-${Math.random().toString(36).replace(/[^a-z]+/g, '')}`;
  customElements.define(randomName, ElementInternalsFeatureDetection);
  const featureDetectionElement = new ElementInternalsFeatureDetection();
  return [
    "shadowRoot",
    "form",
    "states",
    "willValidate",
    "validity",
    "validationMessage",
    "labels",
    "setFormValue",
    "setValidity",
    "checkValidity",
    "reportValidity"
  ].every(prop => prop in featureDetectionElement.internals);
}

if (!isElementInternalsSupported()) {
  window.ElementInternals = ElementInternals;


  function attachShadowObserver(...args) {
    const shadowRoot = attachShadow.apply(this, args);
    const observer = new MutationObserver(observerCallback);
    shadowRootMap.set(this, shadowRoot);
    observer.observe(shadowRoot, observerConfig);
    shadowHostsMap.set(this, observer);
    return shadowRoot;
  }

  function checkValidityOverride(...args): boolean {
    let returnValue = checkValidity.apply(this, args);
    return overrideFormMethod(this, returnValue, 'checkValidity');
  }

  function reportValidityOverride(...args): boolean {
    let returnValue = reportValidity.apply(this, args);
    return overrideFormMethod(this, returnValue, 'reportValidity');
  }

  /**
   * Attaches an ElementInternals instance to a custom element. Calling this method
   * on a built-in element will throw an error.
   */
  Object.defineProperty(HTMLElement.prototype, 'attachInternals', {
    get() {
      return () => {
        const { localName } = this;
        if(localName.includes('-')) {
          this.customElementTagList.add( localName );
        }else{
          throw new Error(`Failed to execute 'attachInternals' on 'HTMLElement': Unable to attach ElementInternals to non-custom elements.`);
        }
        return new ElementInternals(this);
      };
    }
  });

  const elements = Object.getOwnPropertyDescriptor(HTMLFormElement.prototype, 'elements').get;
  Object.defineProperties(HTMLFormElement.prototype, {
    _elements: {get: elements},
    // @note {@link https://developer.mozilla.org/docs/Web/API/HTMLFormElement/elements} NOTE specific tags
    customElementTagList: {value: new Set(['button', 'fieldset', 'input:not([type="image"])', 'object', 'output', 'select', 'textarea'])},
    elements: {get: function(){
      const { customElementTagList } = this;
      const nodes = this.querySelectorAll(Array.from(customElementTagList).join(', '));

      // @ref {@link https://developer.mozilla.org/docs/Web/API/HTMLFormControlsCollection} general behavior
      nodes.forEach(decorateNamedItemsCollection, nodes);
      nodes.namedItem = namedItem;

      return nodes;
    }}
  });

  const attachShadow = Element.prototype.attachShadow;
  Element.prototype.attachShadow = attachShadowObserver;

  const documentObserver = new MutationObserver(observerCallback);
  documentObserver.observe(document.documentElement, observerConfig);

  const checkValidity = HTMLFormElement.prototype.checkValidity;
  HTMLFormElement.prototype.checkValidity = checkValidityOverride;

  const reportValidity = HTMLFormElement.prototype.reportValidity;
  HTMLFormElement.prototype.reportValidity = reportValidityOverride;
}

function decorateNamedCollection(node, name){
  const { type } = node;
  if(type === 'radio'){
    if(this[name] === undefined || !Array.isArray(this[name])){
      this[name] = [];
    }
    this[name].push(node);
  }else{
    this[name] = node;
  }
}
function decorateNamedItemsCollection(node){
  const { name, id } = node;
  if(name){
    decorateNamedCollection.call(this, node, name);
  }
  if(id){
    decorateNamedCollection.call(this, node, id);
  }
}

function namedItem(name){
  return this[name] || null;
}

