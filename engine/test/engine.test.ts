import { describe, it, expect } from "vitest";
import { Graph } from "../src/graph";
import {
  bktUpdate, bktPosterior, applyObservation, initBeliefs, entropy, totalEntropy,
} from "../src/mastery";
import { expectedGain, findBedrock, selectNext } from "../src/selection";
import { Session } from "../src/session";
import {
  SkillGraph, DEFAULT_BKT, DEFAULT_PROPAGATION, DEFAULT_CONFIG,
} from "../src/types";

/** A straight chain a->b->c->d->e, plus a side branch off c. */
function chain(): SkillGraph {
  const ids = ["a", "b", "c", "d", "e"];
  return {
    nodes: ids.map((id, i) => ({
      id, code: id.toUpperCase(), grade: String(i), depth: i,
      text: `skill ${id}`, skills: [],
    })).concat([{
      id: "x", code: "X", grade: "3", depth: 3, text: "side branch", skills: [],
    }]),
    edges: [["a", "b"], ["b", "c"], ["c", "d"], ["d", "e"], ["c", "x"]],
  };
}

describe("BKT", () => {
  it("raises belief on a correct answer and lowers it on a wrong one", () => {
    const p = 0.5;
    expect(bktUpdate(p, true, DEFAULT_BKT)).toBeGreaterThan(p);
    expect(bktUpdate(p, false, DEFAULT_BKT)).toBeLessThan(p);
  });

  it("stays within (0,1) at the extremes", () => {
    for (const p of [0.001, 0.5, 0.999]) {
      for (const c of [true, false]) {
        const out = bktUpdate(p, c, DEFAULT_BKT);
        expect(out).toBeGreaterThan(0);
        expect(out).toBeLessThan(1);
      }
    }
  });

  it("credits a correct answer less when guessing is easier", () => {
    const strict = bktPosterior(0.4, true, { ...DEFAULT_BKT, guess: 0.05 });
    const loose = bktPosterior(0.4, true, { ...DEFAULT_BKT, guess: 0.5 });
    expect(strict).toBeGreaterThan(loose);
  });

  it("is monotonic in the prior", () => {
    const lo = bktUpdate(0.2, true, DEFAULT_BKT);
    const hi = bktUpdate(0.7, true, DEFAULT_BKT);
    expect(hi).toBeGreaterThan(lo);
  });
});

describe("propagation", () => {
  const g = new Graph(chain());
  const base = initBeliefs(g, DEFAULT_BKT);

  it("lowers prerequisites when a skill is failed", () => {
    const after = applyObservation(
      g, base, { nodeId: "d", correct: false }, DEFAULT_BKT, DEFAULT_PROPAGATION);
    expect(after["c"]).toBeLessThan(base["c"]);
    expect(after["b"]).toBeLessThan(base["b"]);
    // damped with distance
    expect(base["c"] - after["c"]).toBeGreaterThan(base["b"] - after["b"]);
  });

  it("raises prerequisites when a skill is passed", () => {
    const after = applyObservation(
      g, base, { nodeId: "d", correct: true }, DEFAULT_BKT, DEFAULT_PROPAGATION);
    expect(after["c"]).toBeGreaterThan(base["c"]);
  });

  it("respects the hop cap", () => {
    const cfg = { ...DEFAULT_PROPAGATION, maxHops: 2 };
    const after = applyObservation(
      g, base, { nodeId: "e", correct: false }, DEFAULT_BKT, cfg);
    expect(after["d"]).not.toBe(base["d"]);   // 1 hop
    expect(after["c"]).not.toBe(base["c"]);   // 2 hops
    expect(after["b"]).toBe(base["b"]);       // 3 hops -- untouched
  });

  it("treats good news travelling upward as weaker than bad news", () => {
    const good = applyObservation(
      g, base, { nodeId: "b", correct: true }, DEFAULT_BKT, DEFAULT_PROPAGATION);
    const bad = applyObservation(
      g, base, { nodeId: "b", correct: false }, DEFAULT_BKT, DEFAULT_PROPAGATION);
    const up = good["c"] - base["c"];
    const down = base["c"] - bad["c"];
    // mastering a prerequisite is necessary but not sufficient, so it must not
    // light up dependents as strongly as failing it darkens them
    expect(up).toBeLessThan(down);
  });

  it("does not mutate the input beliefs", () => {
    const before = { ...base };
    applyObservation(g, base, { nodeId: "c", correct: false },
      DEFAULT_BKT, DEFAULT_PROPAGATION);
    expect(base).toEqual(before);
  });
});

describe("graph", () => {
  it("detects cycles", () => {
    const bad: SkillGraph = {
      nodes: ["p", "q"].map((id) => ({
        id, code: id, grade: "1", depth: 0, text: "", skills: [],
      })),
      edges: [["p", "q"], ["q", "p"]],
    };
    expect(() => new Graph(bad).assertAcyclic()).toThrow(/cycle/);
  });

  it("accepts the chain fixture", () => {
    expect(() => new Graph(chain()).assertAcyclic()).not.toThrow();
  });
});

describe("entropy and gain", () => {
  it("peaks at maximum uncertainty", () => {
    expect(entropy(0.5)).toBeCloseTo(1, 5);
    expect(entropy(0.02)).toBeLessThan(0.2);
  });

  it("never expects a negative information gain", () => {
    const g = new Graph(chain());
    const b = initBeliefs(g, DEFAULT_BKT);
    for (const id of g.ids) {
      expect(expectedGain(g, b, id, DEFAULT_CONFIG)).toBeGreaterThanOrEqual(-1e-9);
    }
  });

  it("reduces total uncertainty as evidence accumulates", () => {
    const g = new Graph(chain());
    let b = initBeliefs(g, DEFAULT_BKT);
    const start = totalEntropy(b);
    for (const id of ["a", "b", "c"]) {
      b = applyObservation(g, b, { nodeId: id, correct: true },
        DEFAULT_BKT, DEFAULT_PROPAGATION);
    }
    expect(totalEntropy(b)).toBeLessThan(start);
  });
});

describe("bedrock", () => {
  it("finds the deepest missing skill whose prerequisites are intact", () => {
    const g = new Graph(chain());
    const b = initBeliefs(g, DEFAULT_BKT);
    // learner holds a and b, is missing c and everything above
    b["a"] = 0.95; b["b"] = 0.9; b["c"] = 0.1; b["d"] = 0.1; b["e"] = 0.1;
    b["x"] = 0.1;
    const bed = findBedrock(g, b, DEFAULT_CONFIG, new Set(["a","b","c","d","e","x"]));
    expect(bed?.nodeId).toBe("c");
  });

  it("returns null while nothing is settled", () => {
    const g = new Graph(chain());
    expect(findBedrock(g, initBeliefs(g, DEFAULT_BKT), DEFAULT_CONFIG, new Set())).toBeNull();
  });
});

/**
 * The claim the whole product rests on: targeting by information gain finds
 * the broken skill in fewer items than asking at random.
 */
describe("information gain vs random", () => {
  const data = chain();

  function learner(g: Graph, bedrockId: string) {
    const holds = g.ancestors(bedrockId);   // everything below bedrock is intact
    return (nodeId: string) => holds.has(nodeId);
  }

  it("locates bedrock, and does it in fewer items than random selection", () => {
    const g = new Graph(data);
    const respond = learner(g, "c");

    const s = new Session(data);
    const smart = s.run(respond);
    expect(smart.bedrock?.nodeId).toBe("c");

    // random baseline, averaged over many orderings
    let randomTotal = 0;
    const TRIALS = 200;
    for (let t = 0; t < TRIALS; t++) {
      const rs = new Session(data);
      const order = g.ids.slice().sort(() => Math.random() - 0.5);
      let used = 0;
      for (const id of order) {
        if (rs.bedrock()) break;
        rs.answer(id, respond(id));
        used++;
      }
      randomTotal += used;
    }
    const randomAvg = randomTotal / TRIALS;
    expect(smart.itemsUsed).toBeLessThanOrEqual(randomAvg);
  });
});

describe("session", () => {
  it("seeds from the wall problem and returns a climb path", () => {
    const data = chain();
    const s = new Session(data);
    s.seedFromWall("e");
    expect(s.steps[0].nodeId).toBe("e");
    expect(s.steps[0].correct).toBe(false);
    expect(s.climbPath("a", "e")).toEqual(["a", "b", "c", "d", "e"]);
  });

  it("never exceeds the item budget", () => {
    const data = chain();
    const s = new Session(data, { maxItems: 3 });
    const r = s.run(() => false);
    expect(r.itemsUsed).toBeLessThanOrEqual(3);
  });
});
