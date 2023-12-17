import { effect, track, trigger, ITERATE_KEY } from './effect.js'

export function reactive(obj) {
  return new Proxy(obj, {
    get: function (target, key, receiver) {
      track(target, key);
      // set中可以获取到原始对象
      if (key === 'raw') {
        return target;
      }
      const res = Reflect.get(target, key, receiver)
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

// const obj = {
//   foo: 1,
//   get bar() {
//     return this.foo;
//   }
// }
// const data = reactive(obj);

// test one 使用Reflect.get 改变receiver为代理对象
// effect(() => {
//   console.log(data.bar);
// })
// data.foo++;

// effect(() => {
//   'foo' in data;
// })

// TODO FIX  test for in 失败了???
// effect(() => {
//   for (let key in data) {
//     console.log('key: ', key, data);
//   }
// })
// setTimeout(() => {
//   data.book = 9;
// }, 1000);

// test three 原型角度考虑
const obj = {}
const proto = { bar: 1 }
const child = reactive(obj);
const parent = reactive(proto);
// parent作为child的原型
Object.setPrototypeOf(child, parent);

effect(() => {
  // TODO FIXED 修改为2 为何第二次输出还是1 ???
  console.log(child.bar);
});
setTimeout(() => {
  /**
   * 触发两次副作用 原因是 首先读取bar时候由于child上不存在bar 所以去读取parent.bar 使得child parent均被track, set阶段同理 child.bar实际去修改了parent.bar 所以触发了两次   
   * */
  child.bar = 2;
}, 1000)
