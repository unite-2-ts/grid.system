// @ts-ignore
import styles from "./GridSystem.scss?inline";

// @ts-ignore
import html from "./GridSystem.html?raw";

//
export const preInit = URL.createObjectURL(new Blob([styles], {type: "text/css"}));

//
class GridSystemElement extends HTMLElement {
    #initialized: boolean = false;

    //
    #initialize() {
        if (!this.#initialized) {
            this.#initialized = true;
            this.dataset.hidden = "true";
            this.classList.add("u2-grid-layout");

            //
            const shadow = this.attachShadow({mode: 'open'});
            const parser = new DOMParser();
            const dom = parser.parseFromString(html, "text/html");

            //
            this.innerHTML = "";
            dom.querySelector("template")?.content?.childNodes.forEach(cp => {
                shadow.appendChild(cp.cloneNode(true));
            });

            //
            const style = document.createElement("style");
            style.innerHTML = `@import url("${preInit}");`;
            shadow.appendChild(style);
        }
    }

    //
    constructor() {
        super();
    }

    //
    connectedCallback() {
        this.#initialize();
    }
}

//
customElements.define("u-grid-system", GridSystemElement);

//
export default () => {};
export { GridSystemElement };
