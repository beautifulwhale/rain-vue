
const obj = { text: 'Hello Vue' }

/**
 * 思路: 如果响应式数据: 1. 读取把副作用函数存储到桶中, 2. 设置新值把副作用函数取出来进行调用重新赋值
 */

const bucket = new Set();

const data = new Proxy(obj, {
  get: function (target, key) {
    bucket.add(effect);
    return target[key];
  },
  set: function (target, key, value) {
    target[key] = value;
    bucket.forEach(fn => fn());
    return true; // 代表操作成功
  }
})

// 副作用函数
function effect() {
  document.body.innerHTML = data.text;
}

// test
effect();
setTimeout(() => {
  data.text = 'Hello world'
}, 1000);


