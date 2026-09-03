/** DAG utilities over the prerequisite graph. */
import type { SkillGraph, SkillNode, Edge } from "./types";

export class Graph {
  readonly nodes: Map<string, SkillNode> = new Map();
  /** node -> its prerequisites (things it rests on) */
  readonly prereqs: Map<string, string[]> = new Map();
  /** node -> things that build on it */
  readonly dependents: Map<string, string[]> = new Map();

  constructor(data: SkillGraph) {
    for (const n of data.nodes) {
      this.nodes.set(n.id, n);
      this.prereqs.set(n.id, []);
      this.dependents.set(n.id, []);
    }
    for (const [from, to] of data.edges) {
      if (!this.nodes.has(from) || !this.nodes.has(to)) continue;
      this.prereqs.get(to)!.push(from);
      this.dependents.get(from)!.push(to);
    }
  }

  get ids(): string[] {
    return [...this.nodes.keys()];
  }

  node(id: string): SkillNode {
    const n = this.nodes.get(id);
    if (!n) throw new Error(`unknown node: ${id}`);
    return n;
  }

  code(id: string): string {
    return this.nodes.get(id)?.code ?? id;
  }

  /**
   * Breadth-first walk out to `maxHops`, returning id -> hop distance.
   * The origin is not included.
   */
  within(start: string, dir: "prereqs" | "dependents", maxHops: number): Map<string, number> {
    const out = new Map<string, number>();
    let frontier = [start];
    const seen = new Set([start]);
    for (let hop = 1; hop <= maxHops; hop++) {
      const next: string[] = [];
      for (const id of frontier) {
        for (const nb of this[dir].get(id) ?? []) {
          if (seen.has(nb)) continue;
          seen.add(nb);
          out.set(nb, hop);
          next.push(nb);
        }
      }
      if (next.length === 0) break;
      frontier = next;
    }
    return out;
  }

  /** Every node reachable by walking prerequisites, at any distance. */
  ancestors(start: string): Set<string> {
    return this.reach(start, "prereqs");
  }

  /** Every node that transitively builds on `start`. */
  descendants(start: string): Set<string> {
    return this.reach(start, "dependents");
  }

  private reach(start: string, dir: "prereqs" | "dependents"): Set<string> {
    const out = new Set<string>();
    const stack = [start];
    while (stack.length) {
      for (const p of this[dir].get(stack.pop()!) ?? []) {
        if (!out.has(p)) {
          out.add(p);
          stack.push(p);
        }
      }
    }
    return out;
  }

  /** Throws if the graph contains a cycle. */
  assertAcyclic(): void {
    const indeg = new Map<string, number>();
    for (const id of this.ids) indeg.set(id, (this.prereqs.get(id) ?? []).length);
    const queue = this.ids.filter((id) => indeg.get(id) === 0);
    let seen = 0;
    while (queue.length) {
      const id = queue.shift()!;
      seen++;
      for (const d of this.dependents.get(id) ?? []) {
        indeg.set(d, indeg.get(d)! - 1);
        if (indeg.get(d) === 0) queue.push(d);
      }
    }
    if (seen !== this.nodes.size) {
      throw new Error(`graph has a cycle (${this.nodes.size - seen} nodes unreachable)`);
    }
  }
}

export function edgesOf(data: SkillGraph): Edge[] {
  return data.edges;
}
