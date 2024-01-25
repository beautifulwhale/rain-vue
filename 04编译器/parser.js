// 定义状态机状态
const State = {
  initial: 1,   //初始状态
  tagOpen: 2,    // 标签开始状态
  tagName: 3,  // 标签名称状态
  text: 4,     // 文本状态
  tagEnd: 5,   // 结束标签状态
  tagEndName: 6,  // 结束标签名称状态
}

// 工具函数判断是否为字母
function isAlpha(char) {
  return char >= 'a' && char <= 'z' || char >= 'A' && char <= 'Z';
}

// parser 把模块通过有限状态自动机标记化 分割为多个Token
function tokenize(str) {
  // 当前状态
  let currentState = State.initial;
  // 存储的当前字符, 用于记录标签
  const chars = [];
  // Token 
  const tokens = [];

  // 当字符消耗完 跳出循环
  while (str) {
    // 查看第一个字符
    const char = str[0];

    switch (currentState) {
      case State.initial:
        if (char === '<') {
          // 标签开始
          currentState = State.tagOpen;
          str = str.slice(1);
        } else if (isAlpha(char)) {
          // 切换为文本状态
          currentState = State.text;
          chars.push(char);
          str = str.slice(1);
        }
        break;
      case State.tagOpen:
        if (isAlpha(char)) {
          currentState = State.tagName;
          chars.push(char);
          str = str.slice(1);
        } else if (char === '/') {
          currentState = State.tagEnd;
          str = str.slice(1);
        }
        break;
      case State.tagName:
        if (isAlpha(char)) {
          // 当前为标签名 无需更改状态
          chars.push(char);
          str = str.slice(1);
        } else if (char === '>') {
          currentState = State.initial;
          // 保存当前Token
          const token = {
            type: 'tag',
            name: chars.join('')
          }
          tokens.push(token);
          chars.length = 0;
          str = str.slice(1);
        }
        break;
      case State.text:
        if (isAlpha(char)) {
          chars.push(char);
          str = str.slice(1);
        } else if (char === '<') {
          currentState = State.tagOpen;
          // 创建文本Token
          const token = {
            type: 'text',
            name: chars.join('')
          };
          tokens.push(token);
          chars.length = 0;
          str = str.slice(1);
        }
        break;
      case State.tagEnd:
        if (isAlpha(char)) {
          currentState = State.tagEndName;
          chars.push(char);
          str = str.slice(1);
        }
        break;
      case State.tagEndName:
        if (isAlpha(char)) {
          chars.push(char);
          str = str.slice(1);
        } else if (char === '>') {
          // 结束 切换为初始状态
          currentState = State.initial;
          const token = {
            type: 'tagEnd',
            name: chars.join('')
          };
          tokens.push(token);
          chars.length = 0;
          str = str.slice(1);
        }
        break;
      default:
        break;
    }
  }
  return tokens;
}

const tokens = tokenize(`<div>Vue</div>`);
console.log('tokens is', tokens);
