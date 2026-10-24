// magpie 已知 Agent 名单（内置快照）。来源：magpie CLI（agents/ls）与网关真实
// 流量（usage --csv 的 agent 列）。沙盒页面无法在运行时拉取该列表，magpie 新增
// Agent 时更新此文件即可；未列出的 Agent 同样默认注入（排除表语义）。
window.HG_AGENTS = [
  { id: "claude",        name: "Claude Code",        note: "anthropic 协议" },
  { id: "codex",         name: "Codex",              note: "responses 协议" },
  { id: "gemini",        name: "Gemini CLI",         note: "gemini 协议" },
  { id: "opencode",      name: "OpenCode",           note: "chat 协议" },
  { id: "zcode",         name: "ZCode",              note: "chat 协议" },
  { id: "workbuddy",     name: "WorkBuddy",          note: "chat 协议" },
  { id: "dsh",           name: "DeepSeek Harness",   note: "chat 协议" },
  { id: "kimi",          name: "Kimi Code",          note: "chat 协议" },
  { id: "qwen",          name: "Qwen Code",          note: "chat 协议" },
  { id: "qoder",         name: "Qoder",              note: "chat 协议" },
  { id: "grok",          name: "Grok Build",         note: "chat 协议" },
  { id: "codebuddy",     name: "CodeBuddy Code",     note: "chat 协议" },
  { id: "hermes",        name: "Hermes Agent",       note: "chat 协议" },
  { id: "pi",            name: "Pi",                 note: "chat 协议" },
  { id: "cursor",        name: "Cursor CLI",         note: "chat 协议" },
  { id: "zed",           name: "Zed",                note: "chat 协议" },
  { id: "copilot",       name: "Copilot",            note: "chat 协议" },
  { id: "crush",         name: "Crush",              note: "chat 协议" },
  { id: "goose",         name: "Goose",              note: "chat 协议" },
  { id: "mimocode",      name: "MiMo Code",          note: "chat 协议" },
  { id: "deveco",        name: "DevEco Code",        note: "chat 协议" },
  { id: "claude-desktop", name: "Claude Desktop",    note: "Code 标签走 claude" },
  { id: "astrbot",       name: "AstrBot",            note: "chat 协议" },
  { id: "curl",          name: "直接 HTTP 调用",      note: "网关收到的裸请求" },
]
