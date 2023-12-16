// watch 基本实现、参数、处理过期watch方法等
function traverse(value, seen = new Set()) {
  if (seen.has(value) || typeof value !== 'object' || value === null) return;
  for (var key in value) {
    traverse(value[key], seen);
  }
  return value;
}