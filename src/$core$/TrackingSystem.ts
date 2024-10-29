// @ts-ignore
import {subscribe} from "/externals/lib/object.js";

// @ts-ignore
import AxGesture, {grabForDrag} from "/externals/lib/interact.js";

// @ts-ignore
import {onContentObserve, unfixedClientZoom} from "/externals/lib/dom.js";

// @ts-ignore
import {
    redirectCell,
    relativeToAbsoluteInPx,
    absolutePxToRelativeInOrientPx,
    convertOrientPxToCX,
    animationSequence,
    convertPointerPxToOrientPx
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
        setProperty(element, "--p-cell-x", element.style.getPropertyValue("--cell-x"));
        setProperty(element, "--p-cell-y", element.style.getPropertyValue("--cell-y"));
        setProperty(element, "--cell-x", value[0]);
        setProperty(element, "--cell-y", value[1]);

        // may be reactive
        subscribe(value, (value, name)=>{
            if (name == 0) { setProperty(element, "--p-cell-x", element.style.getPropertyValue("--cell-x")); setProperty(element, "--cell-x", value[0]); };
            if (name == 1) { setProperty(element, "--p-cell-y", element.style.getPropertyValue("--cell-y")); setProperty(element, "--cell-y", value[1]); };
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
export const inflectInGrid = (gridSystem, items, page: any = {}, itemTag = "div")=>{

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
    onContentObserve(gridSystem, (boxSize)=>{
        if (page) { page.size = matchMedia("(orientation: landscape)").matches ? [boxSize.inlineSize, boxSize.blockSize] : [boxSize.blockSize, boxSize.inlineSize]; };
    });

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
                setProperty(newItem, "--p-cell-x", newItem.style.getPropertyValue("--cell-x"));
                setProperty(newItem, "--p-cell-y", newItem.style.getPropertyValue("--cell-y"));
            });

            //
            newItem.addEventListener("m-dragging", (ev)=>{
                const pointer = ev.detail.pointer;
                const current = pointer.current;

                //
                setProperty(newItem, "--drag-x", current[0]);
                setProperty(newItem, "--drag-y", current[1]);
            });

            //
            newItem.addEventListener("m-dragend", async (ev)=>{
                const pointer = ev.detail.pointer;
                const current = pointer.current;
                const args = {item, page, items};

                //
                const absolute = relativeToAbsoluteInPx(current, args);
                const orient = absolutePxToRelativeInOrientPx(absolute, args);
                const preCell = convertOrientPxToCX(orient, args);

                //
                item.cell = redirectCell(preCell, args);

                //
                await newItem.animate(animationSequence(), {
                    fill: "none",
                    duration: 150,
                    easing: "linear"
                }).finished;

                //
                setProperty(newItem, "--drag-x", 0);
                setProperty(newItem, "--drag-y", 0);
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
