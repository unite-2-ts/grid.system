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
import $createItem, { setProperty } from "./DefaultItem";

//
const whenChangedLayout = (gridSystem, layout)=>{
    // may be reactive
    //subscribe([layout, 0], (v)=>setProperty(gridSystem, "--layout-c", v));
    //subscribe([layout, 1], (v)=>setProperty(gridSystem, "--layout-r", v));
    subscribe(layout, (v,p)=>setProperty(gridSystem, ["--layout-c","--layout-r"][parseInt(p)], v));
}

//
const getSpan = (el, ax)=>{
    const prop = el.style.getPropertyValue(["--ox-c-span", "--ox-r-span"][ax]);
    const factor = ((parseFloat(prop || "1") || 1) - 1);
    return Math.min(Math.max(factor-1, 0), 1);
}

//
export const inflectInGrid = (gridSystem, items, page: any = {}, createItem = $createItem)=>{
    //whenChangedLayout(gridSystem, page.layout);

    //
    subscribe([page, "layout"], (v)=>whenChangedLayout(gridSystem, v));
    subscribe(page, (value, prop)=>{
        gridSystem?.dispatchEvent?.(new CustomEvent("u2-grid-state-change", {
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
    const bindInternal = (newItem, item)=>{
        //
        const gesture = new AxGesture(newItem);
        gesture.longPress({
            handler: "*",
            anyPointer: true,
            mouseImmediate: true,
            minHoldTime: 60 * 3600,
            maxHoldTime: 100
        }, (ev)=>{ grabForDrag(newItem, ev); });

        //
        newItem.addEventListener("m-dragstart", (ev)=>{
            //
            setProperty(newItem, "--p-cell-x", item.cell[0]);
            setProperty(newItem, "--p-cell-y", item.cell[1]);

            //
            const cbox = newItem?.getBoundingClientRect?.();
            const pbox = gridSystem?.getBoundingClientRect?.();

            //
            const rel : [number, number] = [(cbox.left /*+ cbox.right*/)/1 - pbox.left, (cbox.top /*+ cbox.bottom*/)/1 - pbox.top];
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
        /*newItem.addEventListener("m-dragging", (ev)=>{
            const pointer = ev.detail.pointer;
            const current = pointer.current;
        });*/

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

            // set previous cell in style
            setProperty(newItem, "--p-cell-x", item.cell[0]);
            setProperty(newItem, "--p-cell-y", item.cell[1]);

            //
            item.cell = redirectCell([Math.round(CXa[0]), Math.round(CXa[1])], args);
            const animation = newItem.animate(animationSequence(), {
                fill: "forwards",
                duration: 150,
                easing: "linear"
            });

            //
            let shifted = false;
            const onShift: [any, any] = [()=>{
                if (!shifted) {
                    animation?.commitStyles?.();
                    animation?.cancel?.();

                    //
                    setProperty(newItem, "--drag-x", 0);
                    setProperty(newItem, "--drag-y", 0);
                    setProperty(newItem, "--p-cell-x", item.cell[0]);
                    setProperty(newItem, "--p-cell-y", item.cell[1]);

                    //
                    shifted = true;
                    newItem?.removeEventListener?.("m-dragstart", ...onShift);
                }
            }, {once: true}];

            //
            newItem?.addEventListener?.("m-dragstart", ...onShift);
            await animation?.finished?.catch?.(console.warn.bind(console));

            // commit dragging result
            onShift?.[0]?.();
        });

        //
        newItem?.dispatchEvent?.(new CustomEvent("u2-item-added", {
            detail: {item},
            bubbles: true,
            cancelable: true
        }));

        //
        return newItem;
    }

    //
    const elements: HTMLElement[] = [];//Array.from(items.values()).map((item)=>bindInternal(createItem(item, gridSystem), item));

    //
    subscribe(items, (item, index, old)=>{
        if (item) {
            const newItem = bindInternal(createItem(item, gridSystem), item);
            elements.push(newItem);
        } else {
            const oldItem = gridSystem.querySelector(`.u2-grid-item[data-id=\"${old?.id}\"]`);
            if (oldItem) {
                //
                const idx = elements.indexOf(oldItem);
                if (idx >= 0) { elements.splice(idx, 1); };

                //
                oldItem?.dispatchEvent?.(new CustomEvent("u2-item-removed", {
                    detail: {item},
                    bubbles: true,
                    cancelable: true
                }));
                oldItem.remove();
            }
        }
    });

    //
    return elements;
}
