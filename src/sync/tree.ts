import type { Tree } from './types';

/** Set or delete one leaf in a tree, pruning parents that become empty. Mutates `tree`. */
export function setPath(tree: Tree, path: string[], value: string | null): void {
  if (path.length === 0) return;
  const [head, ...rest] = path;
  if (rest.length === 0) {
    if (value === null) delete tree[head];
    else tree[head] = value;
    return;
  }
  let child = tree[head];
  if (typeof child !== 'object' || child === null) {
    if (value === null) return;
    child = {};
    tree[head] = child;
  }
  setPath(child, rest, value);
  if (Object.keys(child).length === 0) delete tree[head];
}

export function getPath(tree: Tree, path: string[]): string | Tree | undefined {
  let cur: string | Tree | undefined = tree;
  for (const p of path) {
    if (typeof cur !== 'object' || cur === null) return undefined;
    cur = cur[p];
  }
  return cur;
}

export function cloneTree(t: Tree): Tree {
  return JSON.parse(JSON.stringify(t)) as Tree;
}
