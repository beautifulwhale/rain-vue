/**
 * 前提: 两个不同的响应式对象注册了不同的副作用函数, 触发了一个会互相影响, 因为1.0版本只是把副作用处理起
 * 思路: 不同的响应式对象 对应不同的key 对应不同的副作用函数; 关系: target (WeakMap) -> key (Map) -> effect (Set)
 * 
 * Tips: 使用weakMap是希望当target重置后不会因为注册了副作用函数而不被垃圾回收机制回收从而造成内存泄漏
 */


// 改善下副作用函数
let activeEffect;
function effect(fn) {
  activeEffect = fn;
  fn();
}

const obj = { text: 'Hello' }
const obj2 = { textChinese: 'Nihao' }


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
  let depMaps = bucket.get(target);
  if (!depMaps) {
    bucket.set(target, (depMaps = new Map()))
  }
  let deps = depMaps.get(key);
  if (!deps) {
    depMaps.set(key, (deps = new Set()))
  }
  if (activeEffect) {
    deps.add(activeEffect);
  }
}

function trigger(target, key) {
  const depMaps = bucket.get(target);
  if (!depMaps) return;
  const effect = depMaps.get(key);
  effect && effect.forEach(fn => fn());
}



// test
const data = reactive(obj);
const data2 = reactive(obj2);

effect(() => {
  document.body.innerHTML = data.text;
  console.log('data:', data);
})

effect(() => {
  console.log('data2.textChinese:', data2.textChinese);
})

setTimeout(() => {
  data.text = 'GoodBye';
}, 1000);

setTimeout(() => {
  data2.textChinese = 'Baibai'  
}, 5000);

// activeEffect 这个东西 需要改进 这样会让最后一次的  data.text同样会把第二个effect()添加到data的副作用汇中去