
// 添加调度系统, 控制着trigger触发的时机、次数及方式等
// 思路为在副作用函数中传递一个对象, 里面封装调度函数scheduler, 控制着副作用函数的变化

let activeEffect;
const effectStack = [];

// options交由用户灵活控制着副作用函数的执行规则
function effect(fn, options) {
  const effectFn = () => {
    cleanUp(effectFn);
    activeEffect = effectFn;
    effectStack.push(effectFn);
    fn();
    effectStack.pop();
    activeEffect = effectStack[effectStack.length - 1];
  }
  effectFn.deps = [];
  effectFn.options = options;
  effectFn();
}

function cleanUp(effectFn) {
  if (!effectFn.deps.length) return;
  for (let i = 0; i < effectFn.deps.length; i++) {
    const deps = effectFn.deps[i];
    deps.delete(effectFn);
  }
  effectFn.deps.length = 0;
}

const obj = { num: 1, text: 'Hello' }

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
    if (fn.options.scheduler) {
      fn.options.scheduler(fn);  // 如果有调度函数 执行调度函数
    } else {
      fn();
    }
  });
}

// 开启一个微任务队列存储副作用函数
const p = Promise.resolve();

// 任务队列存储多个副作用
const taskQueue = new Set();
// 刷新任务队列 让相同的任务只执行最后一次
let isFlushing = false;
const flushJob = () => {
  if (isFlushing) return;
  isFlushing = true;
  p.then(() => {
    taskQueue.forEach(task => task());
  }).finally(() => {
    isFlushing = false;
  });
}

// test  期望只输出最后的值
const data = reactive(obj);

effect(() => {
  console.log('data num:', data.num);
}, {
  // 添加调用系统
  scheduler: (fn) => {
    taskQueue.add(fn);
    flushJob();
  }
})

data.num++;
data.num++;
