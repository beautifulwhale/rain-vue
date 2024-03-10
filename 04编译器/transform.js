// 转化ast
export function traverseNode(ast, content) {
  const currentNode = ast;
  content.currentNode = ast;

  // 增加退出阶段的回调函数
  const exitFns = [];

  const transforms = content.nodeTransforms;
  for (let i = 0; i < transforms.length; i++) {
    const onExit = transforms[i](currentNode, content);
    exitFns.push(onExit);

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

  // 倒叙执行回调函数
  let i = exitFns.length;
  while (i--) {
    exitFns[i]();
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
      transformText,
      transformRoot
    ]
  };

  traverseNode(ast, content);
}

function transformElement(node, content) {
  // test
  // if (node.type === 'Element' && node.tag === 'p') {
  //   node.tag = 'h1';
  // }
  // if (node.type === 'Text') {
  //   content.replaceElement({
  //     type: 'Element',
  //     tag: 'span'
  //   });
  // }

  return () => {
    if (node.type !== 'Element') return;

    // 创建h函数
    const callExp = createCallExpression('h', [
      createStringLiteral(node.tag)
    ]);
    const length = node.children.length;
    length === 1 ? callExp.arguments.push(node.children[0].jsNode) : callExp.arguments.push(createArrayExpression(node.children.map(c => c.jsNode)));

    node.jsNode = callExp;
  }
}

function transformText(node) {
  // if (node.type === 'Text') {
  //   node.content = node.content.repeat(2);
  // }
  return () => {
    if (node.type !== 'Text') return;
    node.jsNode = createStringLiteral(node.content);
  }
}

function transformRoot(node) {
  return () => {
    if (node.type !== 'Root') return;

    const vnodeJSAST = node.children[0].jsNode;
    node.jsNode = {
      type: 'FunctionDecl',
      id: createIdentifier('render'),
      params: [],
      body: [
        {
          type: 'ResultStatement',
          return: vnodeJSAST
        }
      ]
    }
    console.log('nodeJSAST: ', node.jsNode);
  }
}

// 生成字符串JS AST
function createStringLiteral(value) {
  return {
    type: 'StringLiteral',
    value
  }
}

// 生成Identifier 节点AST
function createIdentifier(name) {
  return {
    type: 'Identifier',
    name
  };
}

// 生成elements JS AST
function createArrayExpression(elements) {
  return {
    type: 'ArrayExpression',
    elements
  }
}

// 生成h函数 AST
function createCallExpression(callee, ...args) {
  return {
    type: 'CallExpression',
    callee: createIdentifier(callee),
    arguments: args
  }
}