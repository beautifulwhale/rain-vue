// 转化ast
export function traverseNode(ast, content) {
  const currentNode = ast;
  content.currentNode = ast;

  const transforms = content.nodeTransforms;
  for (let i = 0; i < transforms.length; i++) {
    transforms[i](currentNode, content);

    if (!content.currentNode) return;
  }

  // 深度遍历每一个ast
  const children = currentNode.children;
  if (children) {
    for (let i = 0; i < children.length; i++) {
      content.parent = currentNode;
      content.childIndex = i;

      traverseNode(children[i], content);
    }
  }
}


// 解耦traverseNode函数
export function transform(ast) {
  const content = {
    currentNode: null,
    childIndex: 0,
    parent: null,
    replaceElement(node) {
      this.parent.children[this.childIndex] = node;
      this.currentNode = node;
    },
    nodeTransforms: [
      transformElement,
      // transformText
    ]
  };

  traverseNode(ast, content);
}

function transformElement(node, content) {
  // if (node.type === 'Element' && node.tag === 'p') {
  //   node.tag = 'h1';
  // }
  if (node.type === 'Text') {
    content.replaceElement({
      type: 'Element',
      tag: 'span'
    });
  }
}

function transformText(node) {
  if (node.type === 'Text') {
    node.content = node.content.repeat(2);
  }
}