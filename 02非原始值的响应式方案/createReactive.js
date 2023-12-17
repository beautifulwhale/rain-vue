import { reactive } from "./reactive.js";

export function createReactive(obj, isShallow) {
  return new Proxy(obj, {
    get: function (target, key, receiver) {
      track(target, key);
      // set中可以获取到原始对象
      if (key === 'raw') {
        return target;
      }
      const res = Reflect.get(target, key, receiver)
      if (isShallow) {
        return res;
      }
      if (typeof res === 'object' && res !== null) {
        return reactive(res);
      }
      return res;
    },
    set: function (target, key, newValue, receiver) {
      const oldValue = target[key];
      // 区别是新增 还是修改
      const type = Object.prototype.hasOwnProperty.call(target, key) ? 'SET' : 'ADD';
      const res = Reflect.set(target, key, newValue, receiver);
      // target与receiver不同时 不去触发 也就是去除原型中父元素带来的更新
      if (receiver.raw === target) {
        // NaN 或者未修改值不触发更新
        if (newValue !== oldValue && (oldValue === oldValue || newValue === newValue)) {
          trigger(target, key, type);
        }
      }
      return res;
    },
    // in 操作符
    has: function (target, key) {
      track(target, key);
      // console.log('has', target, key);
      return Reflect.has(target, key);
    },
    // for in 操作符 判断是否有key 
    ownKeys: function (target) {
      track(target, ITERATE_KEY);
      return Reflect.ownKeys(target);
    },
    defineProperty: function (target, key) {
      const hadKey = Object.prototype.hasOwnProperty.call(target, key);
      const res = Reflect.deleteProperty(target, key);
      if (hadKey && res) {
        trigger(target, key, 'DELETE');
      }
      return res;
    }
  })
}