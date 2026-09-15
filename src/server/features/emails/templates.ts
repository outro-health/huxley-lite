// Email templates. `{{variable}}` placeholders are filled by renderTemplate.

export const emailTemplateKeyList = ["welcome_email"] as const
export type EmailTemplateKey = (typeof emailTemplateKeyList)[number]

export type EmailTemplate = {
  subject: string
  body: string
}

export const emailTemplates: Record<EmailTemplateKey, EmailTemplate> = {
  welcome_email: {
    subject: "Welcome to Outro, {{firstName}}",
    body: `Hi {{firstName}},

Great news: after your evaluation, {{clinicianName}} has confirmed you're a good fit for the Outro program.

Here's what happens next:

1. We'll set up your first tapering appointment in the next few days.
2. Keep taking {{medicationName}} at your current dose ({{medicationDose}}) until you and your clinician agree on a plan.
3. If anything changes with your symptoms in the meantime, reply to this email.

We're glad to have you with us.

{{clinicianName}}
Outro Health`,
  },
}

export type TemplateVariables = Record<string, string>

export const renderTemplate = (
  template: EmailTemplate,
  variables: TemplateVariables,
): EmailTemplate => {
  const fill = (text: string) =>
    text.replace(/\{\{(\w+)\}\}/g, (match, key: string) =>
      key in variables ? (variables[key] ?? match) : match,
    )
  return { subject: fill(template.subject), body: fill(template.body) }
}
