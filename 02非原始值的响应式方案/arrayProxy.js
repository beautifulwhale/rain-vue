import { track, trigger, ITERATE_KEY, effect } from './effect.js'
import { createArrayInstrumentations } from './createArrayInstrumentations.js';

export function reactive(obj) {
  const arrayInstrumentations = createArrayInstrumentations();
  return new Proxy(obj, {
    get: function (target, key, receiver) {
      track(target, key);
      // set中可以获取到原始对象
      if (key === 'raw') {
        return target;
      }
      if (Array.isArray(target) && arrayInstrumentations.hasOwnProperty(key)) {
        return Reflect.get(arrayInstrumentations, key, receiver)
      }
      const res = Reflect.get(target, key, receiver)
      if (typeof res === 'object' && res !== null) {
        return reactive(res);
      }
      return res;
    },
    set: function (target, key, newValue, receiver) {
      const oldValue = target[key];
      const type = Array.isArray(target) ? (target.length > Number(key) ? 'SET' : 'ADD') : Object.prototype.hasOwnProperty.call(target, key) ? 'SET' : 'ADD';
      const res = Reflect.set(target, key, newValue, receiver);
      if (receiver.raw === target) {
        if (newValue !== oldValue && (oldValue === oldValue || newValue === newValue)) {
          trigger(target, key, type, newValue);
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
      track(target, Array.isArray(target) ? 'length' : ITERATE_KEY);
      return Reflect.ownKeys(target);
    },
    // delete
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

// const obj = {};
// const arr = reactive([obj]);
// console.log(arr.includes(obj)); // true;

const arr = reactive([]);
effect(() => {
  console.log('arr1', arr.length);
})
arr.push(1)
