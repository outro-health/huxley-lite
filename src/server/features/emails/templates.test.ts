import { describe, expect, it } from "vitest"

import { emailTemplates, renderTemplate } from "./templates"

describe("renderTemplate", () => {
  it("fills placeholders", () => {
    const out = renderTemplate(
      {
        subject: "Hi {{firstName}}",
        body: "{{firstName}} / {{clinicianName}}",
      },
      { firstName: "Ana", clinicianName: "Dr. Chen" },
    )
    expect(out).toEqual({ subject: "Hi Ana", body: "Ana / Dr. Chen" })
  })

  it("leaves unknown placeholders in place", () => {
    const out = renderTemplate({ subject: "", body: "{{nope}}" }, {})
    expect(out.body).toBe("{{nope}}")
  })

  it("welcome email uses only variables the service provides", () => {
    const provided = [
      "firstName",
      "clinicianName",
      "medicationName",
      "medicationDose",
    ]
    const used = [
      ...`${emailTemplates.welcome_email.subject} ${emailTemplates.welcome_email.body}`.matchAll(
        /\{\{(\w+)\}\}/g,
      ),
    ].map((m) => m[1])
    for (const key of used) {
      expect(provided).toContain(key)
    }
  })
})
