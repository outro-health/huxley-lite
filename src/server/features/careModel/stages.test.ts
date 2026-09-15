import { describe, expect, it } from "vitest"

import { careStageList } from "../../db/schema"
import { allowedTransitions, checkTransition } from "./stages"

describe("checkTransition", () => {
  it("allows the moves in the table", () => {
    expect(checkTransition("decision_pending", "eligible", "manual")).toEqual({
      allowed: true,
    })
    expect(checkTransition("evaluation", "decision_pending", "system")).toEqual(
      {
        allowed: true,
      },
    )
  })

  it("refuses moves that skip stages", () => {
    const check = checkTransition("intake", "eligible", "manual")
    expect(check.allowed).toBe(false)
  })

  it("refuses moving to the current stage", () => {
    expect(checkTransition("eligible", "eligible", "manual").allowed).toBe(
      false,
    )
    expect(checkTransition("eligible", "eligible", "correction").allowed).toBe(
      false,
    )
  })

  it("lets a correction go anywhere else", () => {
    expect(checkTransition("active_care", "intake", "correction")).toEqual({
      allowed: true,
    })
  })

  it("every stage has a row, and archived is terminal", () => {
    for (const stage of careStageList) {
      expect(allowedTransitions[stage]).toBeDefined()
    }
    expect(allowedTransitions.archived).toEqual([])
  })
})
