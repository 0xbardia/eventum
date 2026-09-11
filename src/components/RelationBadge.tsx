import type { Relation } from "@/lib/types";

function relationClass(relation: Relation) {
  if (relation === "EQUIVALENT") return "relation-safe";
  if (["CONDITIONAL_EQUIVALENT", "SUBSET", "SUPERSET", "OVERLAPPING"].includes(relation)) return "relation-conditional";
  if (["CONFLICTING", "TEMPORAL_MISMATCH", "SOURCE_MISMATCH", "OUTCOME_MISMATCH"].includes(relation)) return "relation-risk";
  return "relation-neutral";
}

export function RelationBadge({ relation }: { relation: Relation }) {
  return <span className={`relation-badge ${relationClass(relation)}`}>{relation.replaceAll("_", " ")}</span>;
}

