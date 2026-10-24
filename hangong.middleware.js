// 汉宫 (Han Gong) · magpie gateway middleware
//
// Put a workbench system prompt (default: the cleaned CT attack-defense
// prompt v5.2) on every request that passes the magpie gateway, in each
// agent API's own place for it:
//   anthropic.system · chat.messages[0] · responses.instructions ·
//   gemini.systemInstruction / system_instruction.
//
// Defaults: override + prepend — when a request already carries a system
// prompt, this one goes in front of it (highest-priority position) and the
// agent's own prompt is kept, so tool-use instructions keep working and the
// combined prefix stays byte-stable for prompt caching.
//
// Prompt selection (first match wins):
//   options.on_prompt   literal prompt text — highest priority
//   options.prompt      a version id from ./prompts/index.js (v52/v5/v4/v3/variantb)
//   (otherwise)         the bundled default (v52)
//
// Activation-word light routing: when the last user message is exactly an
// activation word (寒霜 / 自检 / SELF-CHECK), the reply is a fixed one-liner —
// shipping the full ~79K prompt for it is waste. These requests get a tiny
// handshake instruction instead (a few lines), and, if options.handshake_model
// names a model, are routed to it.
//
// Agent filtering: options.agents_off excludes agents (everything else keeps
// injection — new agents are injected by default); options.agents, when set,
// is a strict allowlist that wins over agents_off. options.models filters by
// model-name prefix.
//
// options (via `magpie plugin options hangong '<json>'` or the in-app page):
//   {"prompt": "v4"}            use prompt version v4
//   {"on_prompt": "..."}        use this literal text
//   {"override": false}         skip requests that already have a system prompt
//   {"position": "append"}      put the prompt after the agent's own
//   {"agents_off": ["codex"]}   do not inject for these agents
//   {"agents": ["claude"]}      inject only for these agents
//   {"models": ["glm-"]}        only these model-name prefixes
//   {"handshake_model": "x/y"}  route activation-word requests to this model
//   {"handshake": false}        disable the handshake special-case entirely

import { PROMPT, VERSIONS, DEFAULT_VERSION } from "./hangong-prompt.js"

const ACTIVATION = ["寒霜", "自检", "SELF-CHECK"] // moejs: Set.has mismatches, use indexOf

const HANDSHAKE_PROMPT = [
  "You are the Han Gong workbench kernel. The user's message is an exact activation word, not a task.",
  "- If the message is exactly 寒霜: reply with exactly this one line and nothing else:",
  "  寒霜 ready · main kernel loaded · red/blue blocks on standby · give target or scenario",
  "- If the message is exactly 自检 or SELF-CHECK: reply with exactly: All systems normal. Continue.",
  "Never use tools; never add commentary; reply with the fixed line only.",
].join("\n")

function textOf(content) {
  if (typeof content === "string") return content
  if (Array.isArray(content)) {
    let s = ""
    for (let i = 0; i < content.length; i++) {
      const p = content[i]
      if (p && typeof p === "object" && typeof p.text === "string") s += p.text
    }
    return s
  }
  return ""
}

function lastUserText(body, protocol) {
  if (protocol === "chat" && Array.isArray(body.messages)) {
    for (let i = body.messages.length - 1; i >= 0; i--) {
      const m = body.messages[i]
      if (m && m.role === "user") return textOf(m.content)
    }
    return ""
  }
  if (protocol === "responses" && Array.isArray(body.input)) {
    for (let i = body.input.length - 1; i >= 0; i--) {
      const m = body.input[i]
      if (m && m.role === "user") return textOf(m.content)
    }
    return ""
  }
  return ""
}

function isHandshake(body, protocol) {
  const t = String(lastUserText(body, protocol) || "").trim()
  return ACTIVATION.indexOf(t) !== -1
}

export function onRequest(body, ctx) {
  const o = ctx.options || {}
  const proto = ctx.protocol

  // Activation-word light routing: tiny handshake prompt instead of the full
  // workbench prompt; optional model override for the one-liner reply.
  if (o.handshake !== false && (proto === "chat" || proto === "responses") && isHandshake(body, proto)) {
    if (typeof o.handshake_model === "string" && o.handshake_model) body.model = o.handshake_model
    if (proto === "chat") {
      body.messages = [{ role: "system", content: HANDSHAKE_PROMPT },
        ...(Array.isArray(body.messages) ? body.messages.filter((m) => m && m.role === "user") : [])]
    } else {
      body.instructions = HANDSHAKE_PROMPT
    }
    return body
  }

  if (Array.isArray(o.agents_off) && o.agents_off.length && o.agents_off.includes(ctx.agent)) return
  if (Array.isArray(o.agents) && o.agents.length && !o.agents.includes(ctx.agent)) return
  if (Array.isArray(o.models) && o.models.length && !o.models.some((m) => typeof m === "string" && String(body.model ?? ctx.model ?? "").startsWith(m))) return

  const prompt = typeof o.on_prompt === "string" && o.on_prompt ? o.on_prompt
    : o.prompt && o.prompt !== DEFAULT_VERSION && VERSIONS[o.prompt] ? VERSIONS[o.prompt].text
    : PROMPT
  if (!prompt) return
  const before = o.position !== "append" // default: prepend
  const over = o.override !== false // default: true
  switch (proto) {
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
