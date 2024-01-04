import { shouldSetAsProps } from "./shouldSetAsProps.js";
import { unmount } from "./unmount.js";

// 通用渲染器 不依赖于浏览器
function createRenderer(options) {
  const { createElement, insert, setElementText, patchProps } = options;

  function mountElement(vnode, container) {
    // vnode.el 关联真实DOM 以便卸载
    const el = vnode.el = createElement(vnode.type);
    if (typeof vnode.children === 'string') {
      setElementText(el, vnode.children);
    } else if (Array.isArray(vnode.children)) {
      vnode.children.forEach(child => {
        patch(null, child, el);
      })
    }

    if (vnode.props) {
      for (const key in vnode.props) {
        patchProps(el, key, null, vnode.props[key]);
      }
    }
    insert(el, container);
  }

  function patch(n1, n2, container) {
    // 若标签名不相同, 卸载旧节点,挂载新节点
    if (n1 && n1.type !== n2.type) {
      unmount(n1);
      n1 = null; // 保证后续挂载新节点
    }
    // 不同类型的vnode需要提供不同方式的挂载或者打补丁
    const { type } = n2;
    if (typeof type === 'string') {
      // 处理正常标签类型
      if (!n1) {
        mountElement(n2, container);
      } else {
        // TODO: n1 存在，意味着打补丁，暂时省略  
        // patchElement(n1, n2)
      }
    } else if (typeof type === 'object') {
      // 处理组件类型
    } else {
      // etc...
    }
  }

  function render(vnode, container) {
    if (vnode) {
      // 新 vnode 存在，将其与旧 vnode 一起传递给 patch 函数，进行打补丁
      patch(container._vnode, vnode, container);
    } else {
      // 新节点不在, 旧节点存在 说明是卸载操作
      if (container._vnode) {
        unmount(container._vnode);
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
  patchProps(el, key, preValue, nextValue) {
    // 事件处理: 基本思路伪造事件处理函数invoker, 把真实的事件处理函数赋值为invoker.value, 若更新直接更新invoker.value即可
    if (/^on/.test(key)) {
      // 真实事件名称
      const name = key.slice(2).toLocaleLowerCase();
      // 设定为对象类型来处理多种事件函数
      const invokers = el._vei || (el._vei = {});
      let invoker = invokers[key];
      if (nextValue) {
        if (!invoker) {
          invoker = el._vei[key] = (e) => {
            // 如果事件发生的事件早于事件绑定的事件, 不去触发
            if (e.timeStamp < invoker.attached) return;

            if (Array.isArray(invoker.value)) {
              invoker.value.forEach(fn => fn(e));
            } else {
              invoker.value(e);
            }
          }
          invoker.value = nextValue;
          // 添加绑定事件的时间
          invoker.attached = performance.now();

          document.addEventListener(name, invoker);
        } else {
          // 更新事件
          invoker.value = nextValue;
        }
      } else {
        // 卸载事件
        document.removeEventListener(name, invoker);
      }
    }
    // 优先设置DOM Properties 其次设置HTML Attribute
    else if (key === 'class') {
      // 提高性能
      el.className = nextValue;
    } else if (shouldSetAsProps(key, el)) {
      const type = typeof el[key];
      // 如果是布尔类型，并且 nextValue 是空字符串，则将值矫正为 true
      if (type === 'boolean' && nextValue === '') {
        el[key] = true;
      } else {
        el[key] = nextValue;
      }
    }
    else {
      el.setAttribute(key, nextValue);
    }
  }
})

// test
const vnode = {
  type: 'button',
  props: {
    onClick: [
      () => {
        console.log('button clicked');
      },
      () => {
        console.log('button not clicked');
      }
    ]
  },
  children: 'hello'
}
renderer.render(vnode, document.getElementById('app'));