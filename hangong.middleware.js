// 汉宫 (Han Gong) · magpie gateway middleware
//
// Put a full workbench system prompt (default: the cleaned CT attack-defense
// prompt bundled in ./hangong-prompt.js) on every request that passes the
// magpie gateway, in each agent API's own place for it:
//   anthropic.system · chat.messages[0] · responses.instructions ·
//   gemini.systemInstruction / system_instruction.
//
// Defaults: override + prepend — when a request already carries a system
// prompt, this one goes in front of it (highest-priority position) and the
// agent's own prompt is kept, so tool-use instructions keep working and the
// combined prefix stays byte-stable for prompt caching.
//
// options (via `magpie plugin options hangong '<json>'` or the app's 插件 →
// 已安装 → hangong → 选项):
//   {"on_prompt": "..."}     override the bundled prompt with your own text
//   {"override": false}      skip requests that already have a system prompt
//   {"position": "append"}   put the prompt after the agent's own (default "prepend")
//   {"agents": ["claude"]}   only these agents (default: all)
//   {"models": ["glm-"]}     only these model-name prefixes (default: all)

import { PROMPT } from "./hangong-prompt.js"

export function onRequest(body, ctx) {
  const o = ctx.options || {}
  const prompt = typeof o.on_prompt === "string" && o.on_prompt ? o.on_prompt : PROMPT
  if (!prompt) return
  if (Array.isArray(o.agents) && o.agents.length && !o.agents.includes(ctx.agent)) return
  if (Array.isArray(o.models) && o.models.length && !o.models.some((m) => typeof m === "string" && String(body.model ?? ctx.model ?? "").startsWith(m))) return
  const before = o.position !== "append" // default: prepend
  const over = o.override !== false // default: true
  switch (ctx.protocol) {
    case "anthropic":
      return anthropic(body, prompt, over, before)
    case "chat":
      return chat(body, prompt, over, before)
    case "responses":
      return responses(body, prompt, over, before)
    case "gemini":
      return gemini(body, prompt, over, before)
  }
}

function anthropic(body, prompt, over, before) {
  const s = body.system
  if (s === undefined || s === null || s === "" || (Array.isArray(s) && !s.length)) {
    body.system = prompt
    return body
  }
  if (!over) return
  if (typeof s === "string") body.system = before ? prompt + "\n" + s : s + "\n" + prompt
  else if (Array.isArray(s)) {
    const block = { type: "text", text: prompt }
    if (before) s.unshift(block)
    else s.push(block)
  } else return
  return body
}

function chat(body, prompt, over, before) {
  if (!Array.isArray(body.messages)) return
  const first = body.messages[0]
  if (!first || (first.role !== "system" && first.role !== "developer")) {
    body.messages.unshift({ role: "system", content: prompt })
    return body
  }
  if (!over) return
  if (typeof first.content === "string") first.content = before ? prompt + "\n" + first.content : first.content + "\n" + prompt
  else if (Array.isArray(first.content)) {
    const part = { type: "text", text: prompt }
    if (before) first.content.unshift(part)
    else first.content.push(part)
  } else return
  return body
}

function responses(body, prompt, over, before) {
  const s = body.instructions
  if (typeof s !== "string" || !s) {
    body.instructions = prompt
    return body
  }
  if (!over) return
  body.instructions = before ? prompt + "\n" + s : s + "\n" + prompt
  return body
}

function gemini(body, prompt, over, before) {
  const key = body.system_instruction && !body.systemInstruction ? "system_instruction" : "systemInstruction"
  const s = body[key]
  if (!s || !Array.isArray(s.parts) || !s.parts.length) {
    body[key] = { parts: [{ text: prompt }] }
    return body
  }
  if (!over) return
  if (before) s.parts.unshift({ text: prompt })
  else s.parts.push({ text: prompt })
  return body
}
