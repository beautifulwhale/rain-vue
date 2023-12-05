/**
 * 问题: 分支切换 当模板为不显示时 更改text仍然会触发副作用函数, 需要断开响应式数据与副作用函数之间的联系
 * 思路: 在每次执行副作用函数之前, 把track阶段添加到依赖集合中的副作用函数清空掉, 再去执行副作用函数
 */

let activeEffect;
// 使用栈 保留当前activeEffect 为最后执行的副作用, 嵌套结构的effect内层执行时入栈, 执行完毕出栈, activeEffect始终为栈顶
const effectStack = [];

function effect(fn) {
  const effectFn = () => {
    // 执行副作用之前清除依赖的副作用函数
    cleanUp(effectFn);
    // 当 effectFn 执行时，将其设置为当前激活的副作用函数
    activeEffect = effectFn;
    // 在调用副作用函数之前将当前副作用函数压入栈中
    effectStack.push(effectFn);
    fn();
    effectStack.pop();
    activeEffect = effectStack[effectStack.length - 1];
  }
  effectFn.deps = [];
  effectFn();
}

function cleanUp(effectFn) {
  for (let i = 0; i <= effectFn.deps.length; i++) {
    const deps = effectFn.deps[i];
    deps.delete(effectFn);
  }
  effectFn.deps.length = 0;
}

const obj = { ok: true, text: 'Hello' }

const bucket = new WeakMap();

function reactive(obj) {
  return new Proxy(obj, {
    get: function (target, key) {
      track(target, key);
      return target[key];
    },
    set: function (target, key, value) {
      target[key] = value;
      trigger(target, key);
      return true;
    }
  })
}

function track(target, key) {
  if (!activeEffect) return;
  let depMaps = bucket.get(target);
  if (!depMaps) {
    bucket.set(target, (depMaps = new Map()))
  }
  let deps = depMaps.get(key);
  if (!deps) {
    depMaps.set(key, (deps = new Set()))
  }
  deps.add(activeEffect);

  // deps 就是一个与当前副作用函数存在联系的依赖集合,将其添加到 activeEffect.deps 数组中
  activeEffect.deps.push(deps);
}

function trigger(target, key) {
  const depMaps = bucket.get(target);
  if (!depMaps) return;
  const effect = depMaps.get(key);

  // 避免无限递归
  const effectToRun = new Set();
  effect && effect.forEach(fn => {
    if (activeEffect !== fn) {
      effectToRun.add(fn);
    }
  });
  effectToRun.forEach(fn => fn());
}



// test
const data = reactive(obj);

effect(() => {
  document.body.innerHTML = data.ok ? data.text : 'not';
  console.log('data:', data);
})

setTimeout(() => {
  data.ok = false;
}, 1000);

setTimeout(() => {
  data.text = 'World';
}, 5000);

