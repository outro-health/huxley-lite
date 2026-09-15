import Anthropic from "@anthropic-ai/sdk"

import { type AppResultAsync, fromPromise, ResultAsync } from "./result"

// A thin wrapper around the LLM. Nothing calls this yet.
//
// With ANTHROPIC_API_KEY set, `generateText` calls Claude. Without it, a fake
// provider returns canned text so the app and tests run offline. Remember that
// anything you put in the prompt leaves our systems: only send the minimum
// patient data the task needs.

export type GenerateTextInput = {
  system: string
  prompt: string
  maxTokens?: number
}

export type AiProvider = {
  name: string
  generateText: (input: GenerateTextInput) => AppResultAsync<string>
}

const MODEL = "claude-opus-5"

export const anthropicProvider = (client = new Anthropic()): AiProvider => ({
  name: "anthropic",
  generateText: ({ system, prompt, maxTokens = 2048 }) =>
    fromPromise(
      client.messages.create({
        model: MODEL,
        max_tokens: maxTokens,
        system,
        messages: [{ role: "user", content: prompt }],
      }),
      "INTEGRATION_FAILED",
      "LLM request failed",
    ).map((response) =>
      response.content
        .filter((block) => block.type === "text")
        .map((block) => block.text)
        .join("\n"),
    ),
})

export const fakeProvider = (): AiProvider => ({
  name: "fake",
  generateText: ({ prompt }) =>
    ResultAsync.fromSafePromise(
      new Promise<string>((resolve) =>
        setTimeout(
          () =>
            resolve(
              `[fake AI provider] No ANTHROPIC_API_KEY set. Prompt was:\n\n${prompt}`,
            ),
          400,
        ),
      ),
    ),
})

export const ai: AiProvider = process.env.ANTHROPIC_API_KEY
  ? anthropicProvider()
  : fakeProvider()
