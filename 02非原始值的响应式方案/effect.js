import { shouldTrack } from "./createArrayInstrumentations.js";
export const ITERATE_KEY = Symbol();

let activeEffect;
const effectStack = [];

export function effect(fn, options) {
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

export function track(target, key) {
  if (!activeEffect || !shouldTrack) return;
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

export function trigger(target, key, type, newValue) {
  const depMaps = bucket.get(target);
  if (!depMaps) return;

  const effect = depMaps.get(key);
  const iterateEffects = depMaps.get(ITERATE_KEY);

  // 避免无限递归
  const effectToRun = new Set();

  if (Array.isArray(target)) {
    depMaps.forEach((effect, i) => {
      // 当索引大于或者等于length时 才去触发更新
      if (i >= newValue) {
        effect && effect.forEach(fn => {
          if (activeEffect !== fn) {
            effectToRun.add(fn);
          }
        })
      }
    })
  }

  effect && effect.forEach(fn => {
    if (activeEffect !== fn) {
      effectToRun.add(fn);
    }
  });

  // 新增、删除会修改key的数目才会触发
  if (type === 'ADD' || type === 'DELETE') {
    iterateEffects && iterateEffects.forEach(fn => {
      if (activeEffect !== fn) {
        effectToRun.add(fn);
      }
    });
  }
  effectToRun.forEach(fn => {
    if (fn.options?.scheduler) {
      fn.options.scheduler(fn);  // 如果有调度函数 执行调度函数
    } else {
      fn();
    }
  });
}

// 优化性能: 多次触发副作用只让触发一次
let isFlushing = false;
const queue = new Set();
const p = Promise.resolve();

export function flushJob(job) {
  queue.add(job);
  if (!isFlushing) {
    isFlushing = true;
    p.then(() => {
      queue.forEach(job => job());
    }).finally(() => {
      isFlushing = false;
    })
  }
}