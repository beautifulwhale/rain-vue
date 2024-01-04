// 卸载操作
export function unmount(vnode) {
  const parent = vnode.el.parentNode;
  if (parent) {
    parent.removeChild(el);
  }
}

