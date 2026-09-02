/** Scratch: trace a descent step by step. Run: npx tsx test/debug_descent.ts */
import { Graph } from "../src/graph";
import { Session } from "../src/session";
import { findBedrock } from "../src/selection";
import { SkillGraph, DEFAULT_CONFIG } from "../src/types";

const ids = ["a", "b", "c", "d", "e"];
const data: SkillGraph = {
  nodes: ids.map((id, i) => ({
    id, code: id.toUpperCase(), grade: String(i), depth: i,
    text: `skill ${id}`, skills: [],
  })).concat([{ id: "x", code: "X", grade: "3", depth: 3, text: "side", skills: [] }]),
  edges: [["a", "b"], ["b", "c"], ["c", "d"], ["d", "e"], ["c", "x"]],
};

const g = new Graph(data);
const holds = g.ancestors("c");          // a, b
const respond = (id: string) => holds.has(id);
console.log("learner holds:", [...holds].join(", "), "| bedrock should be: c\n");

const cfg = DEFAULT_CONFIG;
console.log(`mastered >= ${cfg.masteryThreshold + cfg.confidenceMargin}, ` +
            `missing <= ${cfg.masteryThreshold - cfg.confidenceMargin}\n`);

const s = new Session(data);
const show = () => ids.concat("x")
  .map((i) => `${i}:${(s.beliefs[i] ?? 0).toFixed(2)}`).join("  ");
console.log("start        ", show());

for (let step = 1; step <= 10; step++) {
  const pick = s.next();
  if (!pick) { console.log("\n-> stopped"); break; }
  const correct = respond(pick.nodeId);
  s.answer(pick.nodeId, correct, pick.expectedGain);
  console.log(
    `${step}. ask ${pick.nodeId} (gain ${pick.expectedGain.toFixed(3)}) ` +
    `-> ${correct ? "RIGHT" : "wrong"}`);
  console.log("             ", show());
  const b = findBedrock(g, s.beliefs, cfg, s.asked);
  if (b) { console.log(`   BEDROCK = ${b.nodeId}`); break; }
}

console.log("\nasked:", [...s.asked].join(", "));
console.log("final bedrock:", s.bedrock());
console.log("\nwhy not c?");
const p = s.beliefs["c"];
console.log(`  c belief ${p?.toFixed(3)} | asked=${s.asked.has("c")} ` +
            `| confidently missing=${p <= cfg.masteryThreshold - cfg.confidenceMargin}`);
for (const pre of g.prereqs.get("c") ?? []) {
  const q = s.beliefs[pre];
  console.log(`  prereq ${pre} belief ${q?.toFixed(3)} ` +
              `| confidently mastered=${q >= cfg.masteryThreshold + cfg.confidenceMargin}`);
}
