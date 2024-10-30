// @ts-ignore /* @vite-ignore */
import {subscribe} from "/externals/lib/object.js";

// @ts-ignore /* @vite-ignore */
import AxGesture, {grabForDrag} from "/externals/lib/interact.js";

// @ts-ignore /* @vite-ignore */
import {observeContentBox, unfixedClientZoom, MOCElement} from "/externals/lib/dom.js";

// @ts-ignore /* @vite-ignore */
import {
    redirectCell,
    relativeToAbsoluteInPx,
    absolutePxToRelativeInOrientPx,
    convertOrientPxToCX,
    animationSequence,
    convertPointerPxToOrientPx
// @ts-ignore /* @vite-ignore */
} from "/externals/core/grid.js";

//
const setProperty = (element, name, value)=>{
    const oldVal = element.style.getPropertyValue(name);
    if (oldVal != value || !oldVal) {
        element.style.setProperty(name, value);
    }
}

//
const whenChangedCell = (element, cell)=>{
    setProperty(element, "--cell-x", cell[0]);
    setProperty(element, "--cell-y", cell[1]);

    // may be reactive
    subscribe(cell, (value, name)=>{
        if (name == 0) { setProperty(element, "--cell-x", value); };
        if (name == 1) { setProperty(element, "--cell-y", value); };
    });
}

//
const whenChangedLayout = (gridSystem, layout)=>{
    setProperty(gridSystem, "--layout-c", layout[0]);
    setProperty(gridSystem, "--layout-r", layout[1]);

    // may be reactive
    subscribe(layout, (num, index)=>{
        if (index == 0) setProperty(gridSystem, "--layout-c", num);
        if (index == 1) setProperty(gridSystem, "--layout-r", num);
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
export const inflectInGrid = (gridSystem, items, page: any = {}, itemTag = "div")=>{
    //
    whenChangedLayout(gridSystem, page.layout);
    subscribe(page, (value, prop)=>{
        if (prop == "layout") { whenChangedLayout(gridSystem, value); };
        gridSystem.dispatchEvent(new CustomEvent("u2-grid-state-change", {
            detail: {page, value, prop},
            bubbles: true,
            cancelable: true
        }));
    });

    //
    observeContentBox(gridSystem, (boxSize)=>{
        if (page) { page.size = [boxSize.inlineSize, boxSize.blockSize]; };
    });

    //
    const createItem = (item)=>{
        const id = item?.id;

        // if exists, skip
        if (gridSystem.querySelector(`.u2-grid-item[data-id=\"${item?.id}\"]`)) {
            return item;
        }

        //
        const newItem = document.createElement(itemTag);
        newItem.classList.add('u2-grid-item');
        newItem.dataset.id = id;

        //
        gridSystem.appendChild(newItem);

        //
        whenChangedCell(newItem, item.cell);
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
        gesture.longPress({
            handler: "*",
            anyPointer: true,
            mouseImmediate: true,
            minHoldTime: 60 * 3600,
            maxHoldTime: 100
        }, (ev)=>{ grabForDrag(newItem, ev); });
        /*newItem.addEventListener("pointerdown", (ev)=>{
            grabForDrag(newItem, ev);
        });*/

        //
        newItem.addEventListener("m-dragstart", (ev)=>{
            const cbox = newItem?.getBoundingClientRect?.();
            const pbox = gridSystem?.getBoundingClientRect?.();
            const rel : [number, number] = [(cbox.left + cbox.right)/2 - pbox.left, (cbox.top + cbox.bottom)/2 - pbox.top];
            const cent: [number, number] = [(rel[0]) / unfixedClientZoom(), (rel[1]) / unfixedClientZoom()]

            //
            const args = {item, page, items};
            const orient = convertPointerPxToOrientPx(cent, args);
            const CXa    = convertOrientPxToCX(orient, args);

            //
            item.cell = redirectCell([Math.floor(CXa[0]), Math.floor(CXa[1])], args);
            setProperty(newItem, "--p-cell-x", item.cell[0]);
            setProperty(newItem, "--p-cell-y", item.cell[1]);

            //
            newItem.dataset.dragging = "true";
        });

        //
        newItem.addEventListener("m-dragging", (ev)=>{
            const pointer = ev.detail.pointer;
            const current = pointer.current;

            //
            //setProperty(newItem, "--drag-x", current[0]);
            //setProperty(newItem, "--drag-y", current[1]);
        });

        //
        newItem.addEventListener("m-dragend", async (ev)=>{
            const pointer = ev.detail.holding;
            const drag = [parseInt(newItem.style.getPropertyValue("--drag-x")), parseInt(newItem.style.getPropertyValue("--drag-y"))];//pointer.modified;
            const args = {item, page, items};

            //
            delete newItem.dataset.dragging;

            //
            const orient = convertPointerPxToOrientPx(relativeToAbsoluteInPx([drag[0], drag[1]], args), args);
            const CXa = convertOrientPxToCX(orient, args);

            //
            setProperty(newItem, "--p-cell-x", item.cell[0]);
            setProperty(newItem, "--p-cell-y", item.cell[1]);
            item.cell = redirectCell([Math.round(CXa[0]), Math.round(CXa[1])], args);

            //
            await newItem.animate(animationSequence(), {
                fill: "none",
                duration: 150,
                easing: "linear"
            }).finished;

            //
            setProperty(newItem, "--drag-x", 0);
            setProperty(newItem, "--drag-y", 0);
            setProperty(newItem, "--p-cell-x", item.cell[0]);
            setProperty(newItem, "--p-cell-y", item.cell[1]);
        });
    }

    //
    items.map(createItem);

    //
    subscribe(items, (item, index, old)=>{
        //
        if (item) {
            createItem(item);
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
