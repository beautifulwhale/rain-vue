// 打印AST节点层级
export function dump(node, indent = 0) {
  const type = node.type;
  const desc = type === 'Root' ? '' : type === 'Element' ? node.tag : node.content;
  console.log(`${'-'.repeat(indent)}${type}: ${desc}`);
  if (node.children) {
    node.children.forEach(n => dump(n, indent + 2));
  }
}
