import { shouldSetAsProps } from "./shouldSetAsProps.js";

// 通用渲染器 不依赖于浏览器
function createRenderer(options) {
  const { createElement, insert, setElementText, patchProps } = options;

  function mountElement(vnode, container) {
    const el = createElement(vnode.type);
    if (typeof vnode.children === 'string') {
      setElementText(el, vnode.children);
    }
    if (vnode.props) {
      for (const key in vnode.props) {
        patchProps(el, key, vnode.props[key]);
      }
    }
    insert(el, container);
  }

  function patch(n1, n2, container) {
    if (!n1) {
      mountElement(n2, container);
    } else {
      // TODO: n1 存在，意味着打补丁，暂时省略  
    }
  }

  function render(vnode, container) {
    if (vnode) {
      // 新 vnode 存在，将其与旧 vnode 一起传递给 patch 函数，进行打补丁
      patch(container._vnode, vnode, container);
    } else {
      // 新节点不在, 旧节点存在 说明是卸载操作
      if (container._vnode) {
        container.innerHTML = ''
      }
    }
    // 把vnode存储为_vnode, 即后续渲染的旧节点
    container._vnode = vnode;
  }

  return {
    mountElement,
    patch,
    render
  }
}

const renderer = createRenderer({
  createElement(tag) {
    return document.createElement(tag);
  },
  setElementText(el, text) {
    el.textContent = text;
  },
  insert(vnode, parent, anchor = null) {
    parent.insertBefore(vnode, anchor);
  },
  patchProps(el, key, value) {
    // 优先设置DOM Properties 其次设置HTML Attribute
    // 去除只读属性设置
    if (shouldSetAsProps(key, el)) {
      const type = typeof el[key];
      // 如果是布尔类型，并且 value 是空字符串，则将值矫正为 true
      if (type === 'boolean' && value === '') {
        el[key] = true;
      } else {
        el[key] = value;
      }
    }
    else {
      el.setAttribute(key, value);
    }
  }
})

// test
const vnode = {
  type: 'button',
  props: {
    disabled: '',
  },
  children: 'hello'
}
renderer.render(vnode, document.getElementById('app'));