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
import $createItem, { setProperty, trackItemState } from "./DefaultItem";

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
        }, (ev)=>{
            if (!newItem.dataset.dragging)
            {
                grabForDrag(newItem, ev, {
                    propertyName: "drag",
                    shifting: [
                        parseFloat(newItem?.style?.getPropertyValue("--drag-x")) || 0,
                        parseFloat(newItem?.style?.getPropertyValue("--drag-y")) || 0
                    ],
                });
            }
        });

        //
        newItem.addEventListener("m-dragstart", (ev)=>{
            const cbox = newItem?.getBoundingClientRect?.();
            const pbox = gridSystem?.getBoundingClientRect?.();

            //
            const rel : [number, number] = [(cbox.left /*+ cbox.right*/)/1 - pbox.left, (cbox.top /*+ cbox.bottom*/)/1 - pbox.top];
            //const rel : [number, number] = [(cbox.left + cbox.right)/2 - pbox.left, (cbox.top + cbox.bottom)/2 - pbox.top];
            const cent: [number, number] = [(rel[0]) / unfixedClientZoom(), (rel[1]) / unfixedClientZoom()]

            //
            const args = {item, page, items};
            const orient = convertPointerPxToOrientPx(cent, args);
            const CXa    = convertOrientPxToCX(orient, args);

            //
            const prev = [item.cell[0], item.cell[1]];
            const cell = redirectCell([Math.floor(CXa[0]), Math.floor(CXa[1])], args);

            //
            if (prev[0] != cell[0] || prev[1] != cell[1]) {
                if (ev?.detail?.holding?.modified != null) {
                    setProperty(newItem, "--drag-x", ev.detail.holding.modified[0] = 0);
                    setProperty(newItem, "--drag-y", ev.detail.holding.modified[1] = 0);
                } else {
                    setProperty(newItem, "--drag-x", 0);
                    setProperty(newItem, "--drag-y", 0);
                }
                item.cell = cell;
                setProperty(newItem, "--p-cell-x", item.cell[0]);
                setProperty(newItem, "--p-cell-y", item.cell[1]);
            }

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
            const orient = convertPointerPxToOrientPx(relativeToAbsoluteInPx([drag[0], drag[1]], args), args);
            const CXa = convertOrientPxToCX(orient, args);

            //
            //const prev = [item.cell[0], item.cell[1]];
            const cell = redirectCell([Math.round(CXa[0]), Math.round(CXa[1])], args);
            const animation = newItem.animate(animationSequence(drag, item.cell, cell), {
                fill: "both",
                duration: 150,
                easing: "linear"
            });

            //
            let shifted = false;
            const onShift: [any, any] = [(ev)=>{
                if (!shifted) {
                    shifted = true;
                    //animation?.commitStyles?.();
                    animation?.cancel?.();
                }

                //
                newItem?.removeEventListener?.("m-dragstart", ...onShift);
            }, {once: true}];

            // not fact, but for animation
            setProperty(newItem, "--p-cell-x", item.cell[0]);
            setProperty(newItem, "--p-cell-y", item.cell[1]);

            //
            setProperty(newItem, "--cell-x", cell[0]);
            setProperty(newItem, "--cell-y", cell[1]);

            //
            newItem?.addEventListener?.("m-dragstart", ...onShift);
            //await new Promise((r)=>requestAnimationFrame(r));
            await animation?.finished?.catch?.(console.warn.bind(console));

            //
            if (!shifted) {
                // commit dragging result
                item.cell = cell;
                onShift?.[0]?.();

                //
                setProperty(newItem, "--p-cell-x", item.cell[0]);
                setProperty(newItem, "--p-cell-y", item.cell[1]);

                //
                if (ev?.detail?.holding?.modified != null) {
                    setProperty(newItem, "--drag-x", ev.detail.holding.modified[0] = 0);
                    setProperty(newItem, "--drag-y", ev.detail.holding.modified[1] = 0);
                } else {
                    setProperty(newItem, "--drag-x", 0);
                    setProperty(newItem, "--drag-y", 0);
                }

                //
                delete newItem.dataset.dragging;
            }
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
            const newItem = createItem(item, gridSystem);
            const id = item?.id; newItem.dataset.id = id;
            if (!newItem.classList.contains('u2-grid-item')) {
                newItem.classList.add('u2-grid-item');
            }

            //
            if (!gridSystem?.contains?.(newItem)) {
                gridSystem?.appendChild?.(newItem);
                bindInternal(newItem, item);
                subscribe(item, (state, property)=>trackItemState(newItem, item, [state, property]));
            }

            //
            if (elements.indexOf(newItem) < 0) { elements.push(newItem); };
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
