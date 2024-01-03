export function shouldSetAsProps(key, el) {
  if (key === 'form' && el.tagName === 'INPUT') return false;
  return key in el;
}