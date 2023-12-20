export let shouldTrack = true;

export function createArrayInstrumentations() {
  const arrayInstrumentations = {};
  // 重写数组检索方法 若代理对象上不存在 去源对象上去查找
  ['includes', 'indexOf', 'lastIndexOf'].forEach(method => {
    const originMethod = Array.prototype[method];
    arrayInstrumentations[method] = function (...args) {
      let res = originMethod.apply(this, args);
      if (!res || res === -1) {
        res = originMethod.apply(this.raw, args);
      }
      return res;
    }
  });
  
  // 更改数组内容的方法会影响长度 会去触发length副作用 当执行时屏蔽对长度的更新
  ['push', 'pop', 'shift', 'unshift', 'splice'].forEach(method => {
    const originMethod = Array.prototype[method];
    arrayInstrumentations[method] = function (...args) {
      debugger;
      shouldTrack = false;
      let res = originMethod.apply(this, args);
      shouldTrack = true;
      return res;
    }
  })
  return arrayInstrumentations;
}