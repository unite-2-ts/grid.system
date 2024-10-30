// @ts-ignore /* @vite-ignore */
import {subscribe as $subscribe$} from "/externals/lib/object.js";

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
export const trackItemState = (element, item, [value, name], subscribe = $subscribe$)=>{
    if (name == "cell") {
        setProperty(element, "--cell-x", value[0]);
        setProperty(element, "--cell-y", value[1]);

        // may be reactive
        subscribe(value, (value, name)=>{
            if (name == 0) { setProperty(element, "--cell-x", value[0]); };
            if (name == 1) { setProperty(element, "--cell-y", value[1]); };
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
/*document.addEventListener("pointerdown", (ev)=>{
    const newItem = MOCElement(ev.target, ".u2-grid-item");
    if (newItem) grabForDrag(newItem, ev);
});*/

//
export const inflectInGrid = (gridSystem, items, page: any = {}, itemTag = "div", subscribe = $subscribe$)=>{

    //
    subscribe(page, (value, prop)=>{
        //
        if (prop == "layout") {
            setProperty(gridSystem, "--layout-c", value[0]);
            setProperty(gridSystem, "--layout-r", value[1]);

            //
            subscribe(value, (num, index)=>{
                if (index == 0) setProperty(gridSystem, "--layout-c", num);
                if (index == 1) setProperty(gridSystem, "--layout-r", num);
            });
        }
    });

    //
    setProperty(gridSystem, "--layout-c", page.layout[0]);
    setProperty(gridSystem, "--layout-r", page.layout[1]);
    observeContentBox(gridSystem, (boxSize)=>{
        //if (page) { page.size = matchMedia("(orientation: landscape)").matches ? [boxSize.inlineSize, boxSize.blockSize] : [boxSize.blockSize, boxSize.inlineSize]; };
        //if (page) { page.size = matchMedia("(orientation: portrait)").matches ? [boxSize.inlineSize, boxSize.blockSize] : [boxSize.blockSize, boxSize.inlineSize]; };
        if (page) page.size = [boxSize.inlineSize, boxSize.blockSize];
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
        subscribe(item, (state, property)=>{
            trackItemState(newItem, item, [state, property], subscribe);
        });

        //
        setProperty(newItem, "--p-cell-x", item.cell[0]);
        setProperty(newItem, "--p-cell-y", item.cell[1]);
        setProperty(newItem, "--cell-x", item.cell[0]);
        setProperty(newItem, "--cell-y", item.cell[1]);

        // may be reactive
        subscribe(item.cell, (value, name)=>{
            if (name == 0) { setProperty(newItem, "--cell-x", value); };
            if (name == 1) { setProperty(newItem, "--cell-y", value); };
        });

        //
        newItem.dispatchEvent(new CustomEvent("u2-item-added", {
            detail: {item},
            bubbles: true,
            cancelable: true
        }));

        //
        const gesture = new AxGesture(newItem);
        //gesture.longPress({}, (ev)=>{ grabForDrag(newItem, ev); });
        newItem.addEventListener("pointerdown", (ev)=>{
            grabForDrag(newItem, ev);
        });

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
