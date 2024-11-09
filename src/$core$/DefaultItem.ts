// @ts-ignore /* @vite-ignore */
import {subscribe} from "/externals/lib/object.js";

//
export const setProperty = (target, name, value, importance = "")=>{
    if ("attributeStyleMap" in target) {
        const raw = target.attributeStyleMap.get(name);
        const prop = raw?.[0] ?? raw?.value;
        if (parseFloat(prop) != value && prop != value || prop == null) {
            //if (raw?.[0] != null) { raw[0] = value; } else
            if (raw?.value != null) { raw.value = value; } else
            { target.attributeStyleMap.set(name, value); };
        }
    } else
    {
        const prop = target?.style?.getPropertyValue?.(name);
        if (parseFloat(prop) != value && prop != value || prop == null) {
            target.style.setProperty(name, value, importance);
        }
    }
}



//
export const whenChangedCell = (element, cell)=>{
    // may be reactive
    subscribe(cell, (v,p)=>setProperty(element, ["--cell-x","--cell-y"][parseInt(p)], v));
    //subscribe([cell, 0], (v)=>setProperty(element, "--cell-x", v));
    //subscribe([cell, 1], (v)=>setProperty(element, "--cell-y", v));
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
    newItem.style.setProperty("--ox-r-span", "1");
    newItem.style.setProperty("--ox-c-span", "1");

    //
    gridSystem?.appendChild?.(newItem);

    //
    //whenChangedCell(newItem, item.cell);
    subscribe(item, (state, property)=>trackItemState(newItem, item, [state, property]));

    //
    return newItem;
}

//
export default createItem;
