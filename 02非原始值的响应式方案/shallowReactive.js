import { createReactive } from "./createReactive.js"

export function shallowReactive(obj) {
  return createReactive(obj, true);
}