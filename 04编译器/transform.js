// 转化ast
export function traverseNode(ast, content) {
  const currentNode = ast;

  const transforms = content.nodeTransforms;
  for (let i = 0; i < transforms.length; i++) {
    transforms[i](currentNode, content);
  }

  // 深度遍历每一个ast
  const children = currentNode.children;
  if (children) {
    currentNode.children.forEach(c => traverseNode(c, content));
  }
}


// 解耦traverseNode函数
export function transform(ast) {
  const content = {
    nodeTransforms: [
      transformElement,
      transformText
    ]
  };

  traverseNode(ast, content);
}

function transformElement(node) {
  if (node.type === 'Element' && node.tag === 'p') {
    node.tag = 'h1';
  }
}

function transformText(node) {
  if (node.type === 'Text') {
    node.content = node.content.repeat(2);
  }
}