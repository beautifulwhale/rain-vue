import { reactive } from "./reactive.js";

// 原始值的响应式方案 (处理基本数据类型)


// 基本思路: 使用reactive内部可以调用属性的方式来封装
function ref(val) {
  const wrapper = {
    get value() {
      return val
    },
    set value(newValue) {
      val = newValue;
    }
  }
  // 定义标识 区别是原始值的ref对象 还是非原始值的响应式对象
  Object.defineProperty(wrapper, '_v_isRef', {
    value: true,
  })
  return reactive(wrapper);
}

const n1 = ref(1);
n1.value = 2;
console.log('n1', n1.value);

// setup return {...obj} 浅拷贝会破坏响应式 可使用toRef、toRefs进行响应式包裹
function toRef(obj, key) {
  const wrapper = {
    get value() {
      return obj[key];
    },
    set value(newVal) {
      obj[key] = newVal;
    }
  }
  Object.defineProperty(wrapper, '_v_isRef', {
    value: true,
  })
  return wrapper
}

const obj = reactive({ bar: 1, foo: 2 })
// const objRef = toRef(obj, 'bar')
// console.log(objRef);

function toRefs(obj) {
  let res = {};
  for (let key in obj) {
    res[key] = toRef(obj, key);
  }
  return res;
}


// // 自动脱ref value
function proxyRefs(obj) {
  return new Proxy(obj, {
    get(target, key, receiver) {
      const value = Reflect.get(target, key, receiver);
      return value._v_isRef ? value.value : value;
    },
    set(target, key, newValue, receiver) {
      // 拿到真实值 需要向value上添加属性
      const value = target[key];
      if (value._v_isRef) {
        value.value = newValue;
        return true;
      }
      return Reflect.set(target, key, newValue, receiver);
    }
  })
}

const obj1 = proxyRefs({ ...toRefs(obj) })
obj1.foo = 3;
console.log('obj1', obj1.foo);

