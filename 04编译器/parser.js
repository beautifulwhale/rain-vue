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
            content: chars.join('')
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

function parser(str) {
  // 收集Token
  const tokens = tokenize(str);

  const root = {
    type: 'Root',
    children: []
  }
  // 当出现一个tag 类型, 创建一个Element的AST节点, 并且压入栈中, 栈顶元素作为父节点
  const elementStack = [root];

  while (tokens.length) {
    const parent = elementStack[elementStack.length - 1];
    const t = tokens[0];

    switch (t.type) {
      case 'tag':
        const elementNode = {
          type: 'Element',
          tag: t.name,
          children: []
        };
        parent.children.push(elementNode);

        // 压到栈顶
        elementStack.push(elementNode);
        break;
      case 'text':
        const textNode = {
          type: 'Text',
          content: t.content
        };
        parent.children.push(textNode);
        break;
      case 'tagEnd':
        // 与栈顶标签匹配,使栈顶元素出栈道
        elementStack.pop();
        break;
      default:
        break;
    }
    // 消费tokens
    tokens.shift();
  }
  return root;
}

// const tokens = tokenize(`<div>Vue</div>`);

const ast = parser(`<div><p>Vue</p><p>Template</p></div>`);
console.log('ast is', ast);
