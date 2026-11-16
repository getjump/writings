export function rehypeTableScroll() {
  const wrap = (node) => {
    if (!node.children) return;
    node.children = node.children.map((child) => {
      if (child.type === "element" && child.tagName === "table") {
        return { type: "element", tagName: "div", properties: { className: ["table-scroll"] }, children: [child] };
      }
      wrap(child);
      return child;
    });
  };
  return wrap;
}
