// 三要素: getter?  存在缓存?  计算属性返回值能否在其他副作用函数触发
let activeEffect;
const effectStack = [];

function effect(fn, options) {
  const effectFn = () => {
    cleanUp(effectFn);
    activeEffect = effectFn;
    effectStack.push(effectFn);
    const res = fn();
    effectStack.pop();
    activeEffect = effectStack[effectStack.length - 1];
    return res;
  }
  effectFn.deps = [];
  effectFn.options = options;
  if (!options?.lazy) {
    effectFn();
  } else {
    return effectFn;
  }
}

function cleanUp(effectFn) {
  if (!effectFn.deps.length) return;
  for (let i = 0; i < effectFn.deps.length; i++) {
    const deps = effectFn.deps[i];
    deps.delete(effectFn);
  }
  effectFn.deps.length = 0;
}

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
  effectToRun.forEach(fn => {
    if (fn.options?.scheduler) {
      fn.options.scheduler(fn);  // 如果有调度函数 执行调度函数
    } else {
      fn();
    }
  });
}

// 计算属性
function compouted(getter) {
  let value;
  let dirty = true;
  const effectFn = effect(getter, {
    lazy: true,
    scheduler: () => {
      dirty = true;
      trigger(obj, 'value')
    }
  });
  const obj = {
    get value() {
      if (dirty) {
        value = effectFn();
        dirty = false;
        track(obj, 'value');
      }
      return value;
    }
  }
  return obj;
}

const obj = { bar: 1, foo: 2 }
const data = reactive(obj);
const compoutedData = compouted(() => data.bar + data.foo);
// console.log('compouted--', compoutedData.value);
// console.log('compouted--', compoutedData.value);

// data.bar++;
// console.log('compouted--', compoutedData.value);

effect(() => {
  console.log('effect', compoutedData.value);
})
setTimeout(() => {
  data.bar++;
}, 1000);