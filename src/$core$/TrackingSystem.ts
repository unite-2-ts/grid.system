// @ts-ignore
import {subscribe} from "/externals/lib/object.js";

// @ts-ignore
import AxGesture, {grabForDrag} from "/externals/lib/interact.js";

// @ts-ignore
import {
    redirectCell,
    relativeToAbsoluteInPx,
    absolutePxToRelativeInOrientPx,
    convertOrientPxToCX
// @ts-ignore
} from "/externals/lib/grid.js";

//
const setProperty = (element, name, value)=>{
    const oldVal = element.style.getPropertyValue(name);
    if (oldVal != value || !oldVal) {
        element.style.setProperty(name, value);
    }
}

//
export const trackItemState = (element, item, [value, name])=>{
    if (name == "cell") {
        setProperty(element, "--p-cell-x", element.style.getPropertyValue("--p-cell-x"));
        setProperty(element, "--p-cell-y", element.style.getPropertyValue("--p-cell-y"));
        setProperty(element, "--cell-x", value[0]);
        setProperty(element, "--cell-y", value[1]);

        // may be reactive
        subscribe(value, (value, name)=>{
            if (name == 0) { setProperty(element, "--p-cell-x", element.style.getPropertyValue("--p-cell-x")); setProperty(element, "--cell-x", value[0]); };
            if (name == 1) { setProperty(element, "--p-cell-y", element.style.getPropertyValue("--p-cell-y")); setProperty(element, "--cell-y", value[1]); };
        });
    }

    //
    element.dispatchEvent(new CustomEvent("u2-item-state-change", {
        detail: {item, value, name},
        bubbles: true,
        cancelable: true
    }));
}

//
export const inflectInGrid = (gridSystem, items, page = {}, itemTag = "div")=>{

    //
    subscribe(items, (item, index, old)=>{
        const id = item?.id;

        //
        if (item) {
            // if exists, skip
            if (gridSystem.querySelector(`.u2-grid-item[data-id=\"${old?.id}\"]`)) {
                return item;
            }

            //
            const newItem = document.createElement(itemTag);
            newItem.classList.add('u2-grid-item');
            newItem.dataset.id = id;

            //
            gridSystem.appendChild(newItem);
            subscribe(item, (state, property)=>{
                trackItemState(newItem, item, [state, property]);
            });

            //
            newItem.dispatchEvent(new CustomEvent("u2-item-added", {
                detail: {item},
                bubbles: true,
                cancelable: true
            }));

            //
            const gesture = new AxGesture(newItem);
            gesture.longPress({}, (ev)=>{ grabForDrag(newItem); });

            //
            newItem.addEventListener("m-dragstart", (ev)=>{
                const args = {item, page, items};
                item.cell = redirectCell(item.cell, args);
            });

            //
            newItem.addEventListener("m-dragging", (ev)=>{
                const pointer = ev.detail.pointer;
                const current = pointer.current;
                setProperty(newItem, "--drag-x", current[0]);
                setProperty(newItem, "--drag-y", current[1]);
            });

            //
            newItem.addEventListener("m-dragend", (ev)=>{
                const pointer = ev.detail.pointer;
                const current = pointer.current;
                const args = {item, page, items};

                //
                const absolute = relativeToAbsoluteInPx(current, args);
                const orient = absolutePxToRelativeInOrientPx(absolute, args);
                const preCell = convertOrientPxToCX(orient, args);

                //
                item.cell = redirectCell(preCell, args);
            });
        } else {
            const oldItem = gridSystem.querySelector(`.u2-grid-item[data-id=\"${old?.id}\"]`);
            if (oldItem) {
                oldItem.dispatchEvent(new CustomEvent("u2-item-removed", {
                    detail: {item},
                    bubbles: true,
                    cancelable: true
                }));
                oldItem.remove();
            }
        }
    });
}
