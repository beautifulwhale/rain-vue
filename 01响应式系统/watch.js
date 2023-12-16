// watch 基本实现、参数

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

function traverse(value, seen = new Set()) {
  if (seen.has(value) || typeof value !== 'object' || value === null) return;
  for (var key in value) {
    traverse(value[key], seen);
  }
  return value;
}

function watch(source, cb) {
  let getter;
  if (typeof source === 'function') {
    getter = source;
  } else {
    getter = traverse(source);
  }

  let oldValue, newValue;
  const effectFn = effect(
    () => getter(),
    {
      lazy: true,
      scheduler: () => {
        // 更新调度 取新值
        newValue = effectFn();
        cb(newValue, oldValue)
        oldValue = newValue;
      }
    }
  );
  oldValue = effectFn();
}

// test
const obj = { bar: 1, foo: 2 }
const data = reactive(obj);
watch(() => data.bar + data.foo, (newValue, oldValue) => {
  console.log('newValue: ', newValue, ' oldValue: ', oldValue);
})

data.bar++;
