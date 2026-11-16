export function attachTips(root: HTMLElement, onHover?: (el: Element | null) => void) {
  const tip = root.querySelector<HTMLElement>(".hr-tip");
  if (!tip) return;
  let cur: Element | null = null;

  const hide = () => {
    tip.classList.remove("is-on");
    if (cur) {
      cur = null;
      onHover?.(null);
    }
  };

  const move = (e: PointerEvent) => {
    const el = (e.target as Element | null)?.closest?.("[data-tip]") ?? null;
    if (!el || !root.contains(el)) {
      hide();
      return;
    }
    if (el !== cur) {
      cur = el;
      tip.replaceChildren();
      (el.getAttribute("data-tip") || "").split("|").forEach((line, i) => {
        const row = document.createElement("div");
        if (i === 0) {
          const b = document.createElement("b");
          b.textContent = line;
          row.append(b);
        } else {
          row.className = "hr-tip__dim";
          row.textContent = line;
        }
        tip.append(row);
      });
      onHover?.(el);
    }
    const box = root.getBoundingClientRect();
    tip.classList.add("is-on");
    const tw = tip.offsetWidth;
    const th = tip.offsetHeight;
    let left = e.clientX - box.left + 14;
    if (left + tw > box.width - 4) left = e.clientX - box.left - tw - 14;
    left = Math.max(4, Math.min(left, box.width - tw - 4));
    let top = e.clientY - box.top - th - 12;
    if (top < 0) top = e.clientY - box.top + 18;
    tip.style.left = `${left}px`;
    tip.style.top = `${top}px`;
  };

  root.addEventListener("pointermove", move);
  root.addEventListener("pointerdown", move);
  root.addEventListener("pointerleave", hide);
  document.addEventListener("pointerdown", (e) => {
    if (!root.contains(e.target as Node)) hide();
  });
}
