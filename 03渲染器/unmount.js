import { Fragment } from "./type.js";
// 卸载操作
export function unmount(vnode) {
  // 若类型为Fragment需要卸载其children
  if (vnode.type === Fragment) {
    vnode.children.forEach(c => unmount(c));
    return;
  }
  const parent = vnode.el.parentNode;
  if (parent) {
    parent.removeChild(el);
  }
}

