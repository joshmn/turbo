import {
    FetchMethod,
    FetchRequest,
    FetchRequestDelegate,
    FetchResponse,
    FormSubmission,
    FormSubmissionDelegate,
    Location,
    Locatable
} from "../fake_dist/turbolinks"

import { nextFrame, scrollToElement } from "helpers";
class TurbolinksFrameElement extends HTMLElement {
    constructor() {
        super();
        this.controller = new FrameController(this);
    }
    static get observedAttributes() {
        return ["src"];
    }
    connectedCallback() {
        this.controller.connect();
    }
    disconnectedCallback() {
        this.controller.disconnect();
    }
    attributeChangedCallback() {
        if (this.src && this.isActive) {
            const value = this.controller.visit(this.src);
            Object.defineProperty(this, "loaded", { value, configurable: true });
        }
    }
    formSubmissionIntercepted(element) {
        this.controller.formSubmissionIntercepted(element);
    }
    get src() {
        return this.getAttribute("src");
    }
    set src(value) {
        if (value) {
            this.setAttribute("src", value);
        }
        else {
            this.removeAttribute("src");
        }
    }
    get loaded() {
        return Promise.resolve(undefined);
    }
    get disabled() {
        return this.hasAttribute("disabled");
    }
    set disabled(value) {
        if (value) {
            this.setAttribute("disabled", "");
        }
        else {
            this.removeAttribute("disabled");
        }
    }
    get autoscroll() {
        return this.hasAttribute("autoscroll");
    }
    set autoscroll(value) {
        if (value) {
            this.setAttribute("autoscroll", "");
        }
        else {
            this.removeAttribute("autoscroll");
        }
    }
    get isActive() {
        return this.ownerDocument === document && !this.isPreview;
    }
    get isPreview() {
        var _a, _b;
        return (_b = (_a = this.ownerDocument) === null || _a === void 0 ? void 0 : _a.documentElement) === null || _b === void 0 ? void 0 : _b.hasAttribute("data-turbolinks-preview");
    }
}
class FrameController {
    constructor(element) {
        this.resolveVisitPromise = () => { };
        this.element = element;
        this.linkInterceptor = new LinkInterceptor(this, this.element);
        this.formInterceptor = new FormInterceptor(this, this.element);
    }
    connect() {
        this.linkInterceptor.start();
        this.formInterceptor.start();
    }
    disconnect() {
        this.linkInterceptor.stop();
        this.formInterceptor.stop();
    }
    shouldInterceptLinkClick(element, url) {
        return this.shouldInterceptNavigation(element);
    }
    linkClickIntercepted(element, url) {
        const frame = this.findFrameElement(element);
        frame.src = url;
    }
    shouldInterceptFormSubmission(element) {
        return this.shouldInterceptNavigation(element);
    }
    formSubmissionIntercepted(element) {
        if (this.formSubmission) {
            this.formSubmission.stop();
        }
        this.formSubmission = new FormSubmission(this, element);
        this.formSubmission.start();
    }
    async visit(url) {
        const location = Location.wrap(url);
        const request = new FetchRequest(this, FetchMethod.get, location);
        return new Promise(resolve => {
            this.resolveVisitPromise = () => {
                this.resolveVisitPromise = () => { };
                resolve();
            };
            request.perform();
        });
    }
    additionalHeadersForRequest(request) {
        return { "X-Turbolinks-Frame": this.id };
    }
    requestStarted(request) {
        this.element.setAttribute("busy", "");
    }
    requestPreventedHandlingResponse(request, response) {
        this.resolveVisitPromise();
    }
    async requestSucceededWithResponse(request, response) {
        await this.loadResponse(response);
        this.resolveVisitPromise();
    }
    requestFailedWithResponse(request, response) {
        console.error(response);
        this.resolveVisitPromise();
    }
    requestErrored(request, error) {
        console.error(error);
        this.resolveVisitPromise();
    }
    requestFinished(request) {
        this.element.removeAttribute("busy");
    }
    formSubmissionStarted(formSubmission) {
    }
    formSubmissionSucceededWithResponse(formSubmission, response) {
        const frame = this.findFrameElement(formSubmission.formElement);
        frame.controller.loadResponse(response);
    }
    formSubmissionFailedWithResponse(formSubmission, fetchResponse) {
    }
    formSubmissionErrored(formSubmission, error) {
    }
    formSubmissionFinished(formSubmission) {
    }
    findFrameElement(element) {
        var _a;
        const id = element.getAttribute("data-turbolinks-frame");
        return (_a = getFrameElementById(id)) !== null && _a !== void 0 ? _a : this.element;
    }
    async loadResponse(response) {
        const fragment = fragmentFromHTML(await response.responseHTML);
        const element = await this.extractForeignFrameElement(fragment);
        if (element) {
            await nextFrame();
            this.loadFrameElement(element);
            this.scrollFrameIntoView(element);
            await nextFrame();
            this.focusFirstAutofocusableElement();
        }
    }
    async extractForeignFrameElement(container) {
        let element;
        const id = CSS.escape(this.id);
        if (element = activateElement(container.querySelector(`turbolinks-frame#${id}`))) {
            return element;
        }
        if (element = activateElement(container.querySelector(`turbolinks-frame[src][recurse~=${id}]`))) {
            await element.loaded;
            return await this.extractForeignFrameElement(element);
        }
    }
    loadFrameElement(frameElement) {
        var _a;
        const destinationRange = document.createRange();
        destinationRange.selectNodeContents(this.element);
        destinationRange.deleteContents();
        const sourceRange = (_a = frameElement.ownerDocument) === null || _a === void 0 ? void 0 : _a.createRange();
        if (sourceRange) {
            sourceRange.selectNodeContents(frameElement);
            this.element.appendChild(sourceRange.extractContents());
        }
    }
    focusFirstAutofocusableElement() {
        const element = this.firstAutofocusableElement;
        if (element) {
            element.focus();
            return true;
        }
        return false;
    }
    scrollFrameIntoView(frame) {
        if (this.element.autoscroll || frame.autoscroll) {
            const element = this.element.firstElementChild;
            const block = readScrollLogicalPosition(this.element.getAttribute("data-autoscroll-block"), "end");
            if (element) {
                scrollToElement(element, { block });
                return true;
            }
        }
        return false;
    }
    shouldInterceptNavigation(element) {
        const id = element.getAttribute("data-turbolinks-frame") || this.element.getAttribute("links-target");
        if (!this.enabled || id == "top") {
            return false;
        }
        if (id) {
            const frameElement = getFrameElementById(id);
            if (frameElement) {
                return !frameElement.disabled;
            }
        }
        return true;
    }
    get firstAutofocusableElement() {
        const element = this.element.querySelector("[autofocus]");
        return element instanceof HTMLElement ? element : null;
    }
    get id() {
        return this.element.id;
    }
    get enabled() {
        return !this.element.disabled;
    }
}
function getFrameElementById(id) {
    if (id != null) {
        const element = document.getElementById(id);
        if (element instanceof TurbolinksFrameElement) {
            return element;
        }
    }
}
function readScrollLogicalPosition(value, defaultValue) {
    if (value == "end" || value == "start" || value == "center" || value == "nearest") {
        return value;
    }
    else {
        return defaultValue;
    }
}
function fragmentFromHTML(html = "") {
    const foreignDocument = document.implementation.createHTMLDocument();
    return foreignDocument.createRange().createContextualFragment(html);
}
function activateElement(element) {
    if (element && element.ownerDocument !== document) {
        element = document.importNode(element, true);
    }
    if (element instanceof TurbolinksFrameElement) {
        return element;
    }
}
class LinkInterceptor {
    constructor(delegate, element) {
        this.clickBubbled = (event) => {
            if (this.respondsToEventTarget(event.target)) {
                this.clickEvent = event;
            }
            else {
                delete this.clickEvent;
            }
        };
        this.linkClicked = ((event) => {
            if (this.clickEvent && this.respondsToEventTarget(event.target)) {
                if (this.delegate.shouldInterceptLinkClick(event.target, event.data.url)) {
                    this.clickEvent.preventDefault();
                    event.preventDefault();
                    this.delegate.linkClickIntercepted(event.target, event.data.url);
                }
            }
            delete this.clickEvent;
        });
        this.willVisit = () => {
            delete this.clickEvent;
        };
        this.delegate = delegate;
        this.element = element;
    }
    start() {
        this.element.addEventListener("click", this.clickBubbled);
        document.addEventListener("turbolinks:click", this.linkClicked);
        document.addEventListener("turbolinks:before-visit", this.willVisit);
    }
    stop() {
        this.element.removeEventListener("click", this.clickBubbled);
        document.removeEventListener("turbolinks:click", this.linkClicked);
        document.removeEventListener("turbolinks:before-visit", this.willVisit);
    }
    respondsToEventTarget(target) {
        const element = target instanceof Element
            ? target
            : target instanceof Node
                ? target.parentElement
                : null;
        return element && element.closest("turbolinks-frame, html") == this.element;
    }
}
class FormInterceptor {
    constructor(delegate, element) {
        this.submitBubbled = (event) => {
            if (event.target instanceof HTMLFormElement) {
                const form = event.target;
                if (this.delegate.shouldInterceptFormSubmission(form)) {
                    event.preventDefault();
                    event.stopImmediatePropagation();
                    this.delegate.formSubmissionIntercepted(form);
                }
            }
        };
        this.delegate = delegate;
        this.element = element;
    }
    start() {
        this.element.addEventListener("submit", this.submitBubbled);
    }
    stop() {
        this.element.removeEventListener("submit", this.submitBubbled);
    }
}
class RedirectController {
    constructor(element) {
        this.element = element;
        this.linkInterceptor = new LinkInterceptor(this, element);
        this.formInterceptor = new FormInterceptor(this, element);
    }
    start() {
        this.linkInterceptor.start();
        this.formInterceptor.start();
    }
    stop() {
        this.linkInterceptor.stop();
        this.formInterceptor.stop();
    }
    shouldInterceptLinkClick(element, url) {
        return this.shouldRedirect(element);
    }
    linkClickIntercepted(element, url) {
        const frame = this.findFrameElement(element);
        if (frame) {
            frame.src = url;
        }
    }
    shouldInterceptFormSubmission(element) {
        return this.shouldRedirect(element);
    }
    formSubmissionIntercepted(element) {
        const frame = this.findFrameElement(element);
        if (frame) {
            frame.formSubmissionIntercepted(element);
        }
    }
    shouldRedirect(element) {
        const frame = this.findFrameElement(element);
        return frame ? frame != element.closest("turbolinks-frame") : false;
    }
    findFrameElement(element) {
        const id = element.getAttribute("data-turbolinks-frame");
        if (id && id != "top") {
            const frame = this.element.querySelector(`#${id}:not([disabled])`);
            if (frame instanceof TurbolinksFrameElement) {
                return frame;
            }
        }
    }
}
customElements.define("turbolinks-frame", TurbolinksFrameElement);
new RedirectController(document.documentElement).start();
