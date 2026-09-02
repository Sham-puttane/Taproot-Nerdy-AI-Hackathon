/**
 * Drive the engine over the real Coherence Map cone.
 * Run: npx tsx test/real_cone.ts
 *
 * Plants a gap at 3.NF.A.1 (a fraction needs EQUAL parts), gives the learner
 * everything below it, and starts from the wall problem 5.NF.A.1 (add and
 * subtract fractions with unlike denominators). The engine should descend
 * three grade levels and name 3.NF.A.1 without being told.
 */
import { readFileSync } from "node:fs";
import { Graph } from "../src/graph";
import { Session } from "../src/session";
import { SkillGraph } from "../src/types";

const OUT = process.env.TAPROOT_OUT ?? "D:/taproot/data/processed";
const raw = JSON.parse(readFileSync(`${OUT}/cone_viz.json`, "utf-8"));
const data: SkillGraph = { nodes: raw.nodes, edges: raw.edges };

const g = new Graph(data);
g.assertAcyclic();
const byCode = new Map(data.nodes.map((n) => [n.code, n.id]));

const WALL = "5.NF.A.1";
const GAP = "3.NF.A.1";
const wallId = byCode.get(WALL)!;
const gapId = byCode.get(GAP)!;

// She holds everything EXCEPT the gap and whatever builds on it. Modelling
// her as holding only the gap's ancestors would have her failing grade-1
// addition, which is not what a fifth grader with a fraction gap looks like.
// Deterministic (no slip, no guess) so this measures the search, not luck.
const broken = new Set([gapId, ...g.descendants(gapId)]);
const holds = new Set(g.ids.filter((id) => !broken.has(id)));
const respond = (id: string) => holds.has(id);

console.log(`graph: ${data.nodes.length} nodes, ${data.edges.length} edges`);
console.log(`wall:  ${WALL}  "${g.node(wallId).text.slice(0, 62)}"`);
console.log(`gap:   ${GAP} (planted, engine is not told)`);
console.log(`learner holds ${holds.size} skills below the gap\n`);

const s = new Session(data);
s.seedFromWall(wallId);
console.log(`0. wall ${WALL} -> failed (this is what she walked in with)`);

let step = 1;
for (;;) {
  const pick = s.next();
  if (!pick) break;
  const ok = respond(pick.nodeId);
  s.answer(pick.nodeId, ok, pick.expectedGain);
  const n = g.node(pick.nodeId);
  console.log(
    `${step}. ${n.code.padEnd(11)} grade ${n.grade.padStart(1)}  ` +
    `gain ${pick.expectedGain.toFixed(3)}  -> ${ok ? "right" : "WRONG"}`);
  step++;
}

const bed = s.bedrock();
console.log(`\nitems used: ${s.asked.size}`);
if (bed) {
  const n = g.node(bed.nodeId);
  const hit = bed.nodeId === gapId;
  console.log(`bedrock:    ${n.code}  (belief ${bed.belief.toFixed(3)})`);
  console.log(`            "${n.text.slice(0, 68)}"`);
  console.log(`rests on:   ${bed.supports.map((s2) => g.code(s2)).join(", ") || "(nothing deeper)"}`);
  console.log(`\n${hit ? "HIT" : "MISS"} -- planted ${GAP}, found ${n.code}`);
  if (n.skills.length) {
    console.log("\ngranular skills to repair:");
    for (const sk of n.skills) console.log("  *", sk);
  }
  const climb = s.climbPath(bed.nodeId, wallId);
  console.log("\nthe climb back:");
  console.log("  " + climb.map((c) => g.code(c)).join("  ->  "));
} else {
  console.log("bedrock:    none found within the item budget");
}
