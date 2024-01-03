
// 通用渲染器 不依赖于浏览器
function createRenderer(options) {
  const { createElement, insert, setElementText } = options;

  function mountElement(vnode, container) {
    const el = createElement(vnode.type);
    if (typeof vnode.children === 'string') {
      setElementText(el, vnode.children);
    }
    if (vnode.props) {
      for (const key in vnode.props) {
        el.setAttribute(key, vnode.props[key]);
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
  }
})

// test 
const vnode = {
  type: 'div',
  props: {
    id: 'foo',
  },
  children: 'hello'
}
renderer.render(vnode, document.getElementById('app'));