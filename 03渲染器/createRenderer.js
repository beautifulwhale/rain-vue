import { reactive } from '../02非原始值的响应式方案/reactive.js';
import { effect, flushJob } from '../02非原始值的响应式方案/effect.js';
import { unmount } from "./unmount.js";
import { shouldSetAsProps } from "./shouldSetAsProps.js";
import { Text, Fragment } from "./type.js";

// 通用渲染器 不依赖于浏览器
function createRenderer(options) {
  const {
    createElement,
    insert,
    setElementText,
    patchProps,
    createText,
    setText } = options;

  function mountElement(vnode, container, anchor) {
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
    insert(el, container, anchor);
  }

  function patch(n1, n2, container, anchor) {
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
        mountElement(n2, container, anchor);
      } else {
        // n1 存在，意味着打补丁
        patchElement(n1, n2)
      }
    } else if (typeof type === Text) {
      // 若没有旧文本节点
      if (!n1) {
        const el = n2.el = createText(n2.children);
        insert(el, container);
      } else {
        // 存在旧文本节点, 更新为新文本节点
        const el = n2.el = n1.el;
        if (n1.children !== n2.children) {
          setText(el, n2.children);
        }
      }
    } else if (typeof type === Fragment) {
      // Fragment只处理子节点就可以
      // 若不存在旧节点, 直接挂载新节点
      if (!n1) {
        n2.children.forEach(c => patch(null, c, container))
      } else {
        patchChildren(n1, n2, container)
      }
    } else if (typeof type === 'object') {
      // 处理组件类型
      if (!n1) {
        mountComponent(n2, container, anchor);
      } else {
        patchComponent(n1, n2);
      }
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

  function patchElement(n1, n2) {
    // 取出被打补丁的节点  新节点指向真实DOM
    const el = n2.el = n1.el;
    // patch props
    const oldProps = n1.props;
    const newProps = n2.props;
    for (const key in newProps) {
      if (newProps[key] !== oldProps[key]) {
        patchProps(el, key, oldProps[key], newProps[key])
      }
    }

    // 去除旧props
    for (const key in oldProps) {
      if (!(key in newProps)) {
        patchProps(el, key, oldProps[key], null)
      }
    }
    // patch children
    patchChildren(n1, n2, el)
  }

  function patchChildren(n1, n2, container) {
    if (typeof n2.children === 'string') {
      if (Array.isArray(n1.children)) {
        n1.children.forEach(c => unmount(c));
      }
      setElementText(container, n2.children);
    } else if (Array.isArray(n2.children)) {
      if (Array.isArray(n1.children)) {
        // 简单diff算法 但性能并非最佳
        // diff减少开销 新节点与旧节点先patch 若长度不一样, 适当挂载与卸载
        const oldChildren = n1.children;
        const newChildren = n2.children;
        let lastIndex = 0;
        // const oldLen = oldChildren.length;
        // const newLen = newChildren.length;
        // // 取出公共长度
        // const commonLength = Math.min(oldLen, newLen);
        // for (let i = 0; i < commonLength; i++) {
        //   patch(oldChildren[i], newChildren[i], container);
        // }
        // // 挂载新的
        // if (newLen > oldLen) {
        //   for (let i = commonLength; i < newLen; i++) {
        //     patch(null, newChildren[i], container);
        //   }
        // }

        // // 卸载旧的多余的
        // if (oldLen > newLen) {
        //   for (let i = commonLength; i < oldLen; i++) {
        //     unmount(oldChildren[i]);
        //   }
        // }

        // 使用key优化
        for (let i = 0; i < newChildren.length; i++) {
          const newVNode = newChildren[i];
          let j = 0;
          // 判断是否在旧节点中找到与新节点相同key的 若找不到 添加节点
          let find = false;
          for (j; j < oldChildren.length; j++) {
            const oldVNode = oldChildren[j];
            if (newVNode.key === oldVNode.key) {
              patch(oldVNode, newVNode, container);
              find = true;
              // 寻找移动的元素: 相同key中遇到的索引最大值,后续查到在旧节点中的索引小于最大值便需要移动
              if (j < lastIndex) {
                // 元素的真实DOM需要移动
                // 移动规则: 由于新虚拟节点的顺序即为真实DOM顺序, 所以找到上一个节点并且插到其后面
                const preVNode = newChildren[i - 1];
                if (preVNode) {
                  const anchor = preVNode.el.nextSibling;
                  insert(newVNode.el, container, anchor);
                }
              } else {
                // 更新最大索引
                lastIndex = j;
              }
              break;
            }
            // 添加
            if (!find) {
              const preVNode = newVNode[i - 1];
              let anchor = null;
              // 确定锚点位置
              if (preVNode) {
                anchor = preVNode.el.nextSibling;
              } else {
                anchor = container.firstChild;
              }
              // 挂载newVNode
              patch(null, newVNode, container, anchor);
            }
          }
        }

        // 删除旧节点中未用到的
        for (let i = 0; i < oldChildren.length; i++) {
          const oldVNode = oldChildren[i];
          const has = newChildren.find(vnode => vnode.key === oldVNode.key);
          if (!has) {
            unmount(oldVNode);
          }
        }

        // 双端diff算法
        patchKeyedChildren(n1, n2, container);

        // 快速diff算法
        patchQuickKeyedChildren(n1, n2, container);
      } else {
        setElementText(container, '')
        n2.children.forEach(i => {
          patch(null, i, container)
        })
      }
    } else {
      if (Array.isArray(n1.children)) {
        n1.children.forEach(c => unmount(c))
      } else if (typeof n1.children === 'string') {
        setElementText(container, '')
      }
    }
  }

  // 双端diff: 四个步骤: 1. 新旧头部节点比较 2. 新旧尾部节点 3. 旧头部与新尾部节点 4. 旧尾部与新头部
  function patchKeyedChildren(n1, n2, container) {
    const oldChildren = n1.children;
    const newChildren = n2.children;
    // 定义四个节点指针
    let oldStartIndex = 0;
    let oldEndIndex = oldChildren.length - 1;
    let newStartIndex = 0;
    let newEndIndex = newChildren.length - 1;
    // 四个节点
    let oldStartNode = oldChildren[oldStartIndex];
    let oldEndNode = oldChildren[oldEndIndex];
    let newStartNode = newChildren[newStartIndex];
    let newEndNode = newChildren[newEndIndex];

    // 按照步骤进行比价, 并且操作DOM顺序
    while (oldEndIndex >= oldStartNode && newEndIndex >= newStartNode) {
      if (!oldStartNode) {
        oldStartNode = oldChildren[++oldStartIndex];
      } else if (!oldEndNode) {
        oldEndNode = oldChildren[--oldEndIndex];
      }
      if (oldStartNode.key === newStartNode.key) {
        patch(oldStartNode, newStartNode, container);
        oldStartNode = oldChildren[++oldStartIndex];
        newStartNode = newChildren[++newStartIndex];
      } else if (oldEndNode.key === newEndNode.key) {
        patch(oldEndNode, newEndNode, container);
        oldEndNode = oldChildren[--oldEndIndex];
        newEndNode = newChildren[--newEndIndex];
      } else if (oldStartNode.key === newEndNode.key) {
        patch(oldStartNode, newEndNode, container);
        insert(oldStartNode.el, container, oldEndNode.el.nextSibling);
        oldStartNode = oldChildren[++oldStartIndex];
        newEndNode = newChildren[--newEndIndex];
      } else if (oldEndNode.key === newStartNode.key) {
        patch(oldEndNode, newStartNode, container);
        // 将旧节点中最后一个节点插到索引为oldStartIndex对应的真实DOM的前面
        insert(oldEndNode.el, container, oldStartNode.el);
        oldEndNode = oldChildren[--oldEndIndex];
        newStartNode = newChildren[++newStartIndex];
      } else {
        // 非理想状态下: 旧节点中去寻找新的头部节点, 找到就移动, 找不到就意味着新增
        const oldIdx = oldChildren.findIndex(child => child.key === newStartNode.key);
        if (oldIdx > 0) {
          patch(oldChildren[oldIdx], newStartNode, container);
          insert(oldChildren[oldIdx].el, container, oldStartNode.el);
          oldChildren[oldIdx] = undefined
        } else {
          // 新增
          patch(null, newStartNode, container, oldStartNode.el);
        }
        newStartNode = newChildren[++newStartIndex];
      }
    }

    // 处理diff遗漏的新增节点与删除节点
    if (newStartIndex <= newEndIndex && oldEndIndex < oldStartIndex) {
      // 说明仍存在新增节点
      for (let i = newStartIndex; i <= newEndIndex; i++) {
        patch(null, newChildren[i], container, oldStartNode.el);
      }
    } else if (newEndIndex < newStartIndex && oldStartIndex <= oldEndIndex) {
      // 存在未删除旧节点
      for (let j = oldStartIndex; j <= oldEndIndex; j++) {
        unmount(oldChildren[j])
      }
    }
  }

  // 快速diff: 1. 比较头部节点是否相同 2. 比较尾部节点是否相同 3. 添加或删除多余节点
  function patchQuickKeyedChildren(n1, n2, container) {
    const oldChildren = n1.children;
    const newChildren = n2.children;
    // 更新头部
    let j = 0;
    let oldStartVNode = oldChildren[j];
    let newStartVNode = newChildren[j];
    while (oldStartVNode.key === newStartVNode.key) {
      patch(oldChildren[j], newChildren[j], container);
      j++;
      oldStartVNode = oldChildren[j];
      newStartVNode = newChildren[j];
    }
    // 由于不确定尾部有多少, 确定两个指针
    let oldEndIndex = n1.children.length - 1;
    let newEndIndex = n2.children.length - 1;
    let oldEndVNode = oldChildren[oldEndIndex];
    let newEndVNode = newChildren[newEndIndex];
    while (oldEndVNode.key === newEndVNode.key) {
      patch(oldEndVNode, newEndVNode, container);
      oldEndIndex--;
      newEndIndex--;
      oldEndVNode = oldChildren[oldEndIndex];
      newEndVNode = newChildren[newEndIndex];
    }

    // 新增、删除节点
    if (j <= newEndIndex && oldEndIndex > j) {
      const anchorIndex = newEndIndex + 1;
      const anchor = anchorIndex < newChildren.length ? newChildren[anchorIndex].el : null;
      while (j <= newEndIndex) {
        patch(null, newChildren[j++], container, anchor);
      }
    } else if (j > newEndIndex && oldEndIndex >= j) {
      while (j <= oldEndIndex) {
        unmount(oldChildren[j++]);
      }
    }
  }

  // 挂载组件
  function mountComponent(vnode, container, anchor) {
    const { render, data } = vnode.type;

    // 绑定数据
    const state = reactive(data());
    effect(() => {
      const subTree = render.call(state, state);
      patch(null, subTree, container, anchor);
    }, {
      // 异步任务
      scheduler: flushJob
    })
  }

  // 组件打补丁
  function patchComponent(n1, n2) {

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
  },
  createText(text) {
    return document.createTextNode(text);
  },
  setText(el, text) {
    el.nodeValue = text;
  }
})

// test
// const vnode = {
//   type: 'button',
//   props: {
//     onClick: [
//       () => {
//         console.log('button clicked');
//       },
//       () => {
//         console.log('button not clicked');
//       }
//     ]
//   },
//   children: 'hello'
// }
// renderer.render(vnode, document.getElementById('app'));


// test use key patch
const oldVNode = {
  type: 'div',
  children: [
    { type: 'p', children: '1', key: 1 },
    { type: 'p', children: '2', key: 2 },
    { type: 'p', children: 'hello', key: 3 }
  ]
}
const newVNode = {
  type: 'div',
  children: [
    { type: 'p', children: 'world', key: 3 },
    { type: 'p', children: '1', key: 1 },
    { type: 'p', children: '2', key: 2 }
  ]
}
renderer.render(oldVNode, document.querySelector('#app'))
setTimeout(() => {
  debugger;
  renderer.render(newVNode, document.querySelector('#app'))
}, 1000)