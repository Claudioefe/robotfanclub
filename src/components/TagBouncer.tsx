"use client";

import { useState } from "react";
import { SLA, TAG_ACTIONS, tagEstimate, type TagAction } from "@/lib/sla";
import type { TagScript } from "@/lib/portal/data";
import { Dim, Status, TableWrap, Td, Th } from "./ui";

// What-if simulator. The saved plan comes from the database (set by staff); changes here are not saved.
export function TagBouncer({ scripts, currentInpMs }: { scripts: TagScript[]; currentInpMs: number | null }) {
  const [actions, setActions] = useState<Record<number, TagAction>>(() => Object.fromEntries(scripts.map((s) => [s.id, s.action])));

  if (!scripts.length) return <p className="text-muted">No third-party scripts have been listed for this site yet.</p>;

  const estimate =
    currentInpMs === null
      ? null
      : tagEstimate(currentInpMs, scripts.map((s) => ({ blockingMs: s.blockingMs, action: actions[s.id] })));

  return (
    <>
      <TableWrap minWidth={640}>
        <thead>
          <tr>
            <Th>Script</Th>
            <Th>Blocking at p75</Th>
            <Th>Action</Th>
            <Th>Contract note</Th>
          </tr>
        </thead>
        <tbody>
          {scripts.map((s) => (
            <tr key={s.id}>
              <Td className="min-w-[220px] font-medium">{s.label}</Td>
              <Td>{s.blockingMs} ms</Td>
              <Td>
                <select
                  className="max-w-full rounded-lg border border-line bg-surface px-2 py-1.5 text-sm"
                  aria-label={`Action for ${s.label}`}
                  value={actions[s.id]}
                  onChange={(e) => setActions({ ...actions, [s.id]: e.target.value as TagAction })}
                >
                  {(Object.keys(TAG_ACTIONS) as TagAction[])
                    .filter((k) => !(s.isRequired && k === "remove"))
                    .map((k) => (
                      <option key={k} value={k}>
                        {TAG_ACTIONS[k].label}
                      </option>
                    ))}
                </select>
              </Td>
              <Td>
                {s.isRequired ? (
                  "Required by law for many sites. If kept, its cost is carved out of the SLA."
                ) : actions[s.id] === "keep" ? (
                  "Client keeps it; adds risk to the SLA."
                ) : (
                  <Dim>Covered</Dim>
                )}
              </Td>
            </tr>
          ))}
        </tbody>
      </TableWrap>
      {estimate && (
        <Status tone={estimate.projected <= SLA.inpGoalMs ? "good" : "bad"} className="mt-3.5">
          With these choices: about {estimate.projected} ms, saving roughly {estimate.saving} ms. Rough estimate that assumes half of the
          blocking time overlaps other work. Changes here are a what-if and are not saved.
        </Status>
      )}
    </>
  );
}
