// @ts-ignore /* @vite-ignore */
import {subscribe} from "/externals/lib/object.js";

//
export const setProperty = (element, name, value)=>{
    const oldVal = element.style.getPropertyValue(name);
    if (oldVal != value || !oldVal) {
        element.style.setProperty(name, value);
    }
}

//
export const whenChangedCell = (element, cell)=>{
    setProperty(element, "--cell-x", cell[0]);
    setProperty(element, "--cell-y", cell[1]);

    // may be reactive
    subscribe(cell, (value, name)=>{
        if (name == 0) { setProperty(element, "--cell-x", value); };
        if (name == 1) { setProperty(element, "--cell-y", value); };
    });
}

//
export const trackItemState = (element, item, [value, prop])=>{
    if (prop == "cell") {
        whenChangedCell(element, value);
    }

    //
    element.dispatchEvent(new CustomEvent("u2-item-state-change", {
        detail: {item, value, prop},
        bubbles: true,
        cancelable: true
    }));
}

//
export const createItem = (item, gridSystem)=>{
    if (!item) return;

    // if exists, skip
    if (gridSystem?.querySelector?.(`.u2-grid-item[data-id=\"${item?.id}\"]`)) { return item; }

    //
    const newItem = document.createElement("div");
    const id = item?.id;

    //
    newItem.classList.add('u2-grid-item');
    newItem.dataset.id = id;

    //
    gridSystem?.appendChild?.(newItem);

    //
    whenChangedCell(newItem, item.cell);
    subscribe(item, (state, property)=>trackItemState(newItem, item, [state, property]));

    //
    return newItem;
}

//
export default createItem;
