// 解析器状态
const TextModes = {
  DATA: 'DATA',
  REDATA: 'REDATA',
  RETEXT: 'RETEXT',
  CDATA: 'CDATA',
};

function parser(str) {
  const content = {
    source: str,
    // 初始化状态为DATA
    mode: TextModes.DATA
  };

  const nodes = parserChildren(content, []);

  return {
    type: 'Root',
    children: nodes
  }
}

// 参数1为上下文对象、参数2为父代节点构成的栈
function parserChildren(content, ancestors) {
  const nodes = [];
  const { source, mode } = content;

  while (!isEnds(content, ancestors)) {
    let node = null;
    if (mode === TextModes.DATA || mode === TextModes.CDATA) {
      if (mode === TextModes.DATA && source[0] === '<') {
        if (source[1] === '!') {
          if (source.startWith('<!--')) {
            node = parserComment(content, ancestors)
          } else if (source.startWith('<![CDATA[')) {
            node = parserCDATA(content, ancestors)
          }
        } else if (source[1] === '/') {
          throw new Error('Invalid tag')
        } else if (/[a-z]/.test(source[1])) {
          node = parserElement(content, ancestors);
        }
      } else if (source.startWith('{{')) {
        node = parseInterpolation(content, ancestors);
      }
    }

    // 如果不存在节点,当作文本处理
    if (!node) {
      node = parserText(content);
    }

    nodes.push(node);
  }

  return nodes;
}

function isEnds(content, ancestors) {

}

// 解析文本
function parserText(content) {

}

// 解析注释
function parserComment(content, ancestors) {

}

function parserCDATA(content, ancestors) {

}

// 解析标签
function parserElement(content, ancestors) {

}

// 解析插值
function parseInterpolation(content, ancestors) {

}