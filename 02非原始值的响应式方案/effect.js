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

export function trigger(target, key, type) {
  const depMaps = bucket.get(target);
  if (!depMaps) return;
  const effect = depMaps.get(key);
  const iterateEffects = depMaps.get(ITERATE_KEY);

  // 避免无限递归
  const effectToRun = new Set();
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
