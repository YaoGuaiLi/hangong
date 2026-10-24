// 汉宫控制台 v3 —— 零依赖。桥接 API（_magpie/bridge.js）：
//   await magpie.ready            { dark, lang, tokens }
//   await magpie.options.get()    本插件当前配置
//   await magpie.options.set(o)   写回并持久化，返回写后的值
const VERSION = "1.3.0"

const AGENTS = window.HG_AGENTS || []  // page/agents.js 普通脚本先加载

// 版本注册表与 prompts/index.js 保持同步（构建产物，此处只存元数据）
const VERSIONS = [
  { id: "v52",      label: "完整版 v5.2", badge: "默认", desc: "吸收重写终版：工作台契约 + 红蓝蓝图 + 卡密专项 + 交付纪律", chars: 78647 },
  { id: "v5",       label: "轻量 V5",     badge: "",     desc: "v5 精简规范：工程原则 + 完整工作规范", chars: 8809 },
  { id: "v4",       label: "轻量 V4",     badge: "",     desc: "v4 精简规范 + 旧版激活词握手", chars: 4942 },
  { id: "v3",       label: "轻量 V3",     badge: "",     desc: "寒霜工作规范 v3：最短可用版", chars: 2240 },
  { id: "variantb", label: "英文变体 B",  badge: "EN",   desc: "English variant: authorized-environment spec", chars: 5910 },
]

const $ = (id) => document.getElementById(id)

/* ---------- toast ---------- */
function toast(text, kind = "", ms = 2800) {
  const t = $("toast")
  t.textContent = text
  t.className = "toast show " + kind
  clearTimeout(toast._h)
  toast._h = setTimeout(() => (t.className = "toast"), ms)
}

/* ---------- 动态构建：版本列表 + Agent 行 ---------- */
function buildVersionList() {
  const box = $("verList")
  for (const v of VERSIONS) {
    const row = document.createElement("div")
    row.className = "prow"
    row.dataset.ver = v.id
    row.innerHTML =
      '<div class="p-main"><div class="p-name">' + v.label +
      (v.badge ? ' <span class="p-badge">' + v.badge + '</span>' : "") +
      '</div><div class="p-desc">' + v.desc + ' · ' + Math.round(v.chars / 1000) + 'K 字</div></div>' +
      '<span class="p-check">✓</span>'
    row.addEventListener("click", () => {
      $("opRow").hidden = true
      for (const r of box.querySelectorAll(".prow")) r.classList.toggle("on", r === row)
      sync()
    })
    box.appendChild(row)
  }
  const custom = document.createElement("div")
  custom.className = "prow"
  custom.dataset.ver = "custom"
  custom.innerHTML = '<div class="p-main"><div class="p-name">自定义文本 <span class="p-badge">on_prompt</span></div>' +
    '<div class="p-desc">整段粘贴你自己的系统提示词，优先级最高</div></div><span class="p-check">✓</span>'
  custom.addEventListener("click", () => {
    $("opRow").hidden = false
    for (const r of box.querySelectorAll(".prow")) r.classList.toggle("on", r === custom)
    sync()
  })
  box.appendChild(custom)
}

function buildAgentList(off) {
  const box = $("agentList")
  box.textContent = ""
  for (const a of AGENTS) {
    const row = document.createElement("div")
    row.className = "arow"
    const on = !off.includes(a.id)
    row.innerHTML =
      '<div class="a-dot ' + (on ? "ok" : "") + '"></div>' +
      '<div class="a-main"><div class="a-name">' + a.name + ' <span class="a-id">' + a.id + '</span></div>' +
      '<div class="a-note">' + a.note + '</div></div>' +
      '<button class="switch" role="switch" aria-checked="' + on + '" aria-label="' + a.id + '"></button>'
    row.querySelector(".switch").addEventListener("click", (e) => {
      const b = e.currentTarget
      b.setAttribute("aria-checked", b.getAttribute("aria-checked") === "true" ? "false" : "true")
      row.querySelector(".a-dot").classList.toggle("ok", b.getAttribute("aria-checked") === "true")
      sync()
    })
    box.appendChild(row)
  }
}

/* ---------- 表单 ⇄ options ---------- */
function formToOptions() {
  const next = { override: $("ov").getAttribute("aria-checked") === "true", position: document.querySelector('input[name="pos"]:checked').value }
  const ver = document.querySelector(".prow.on")?.dataset.ver
  if (ver === "custom") {
    if ($("op").value.trim()) next.on_prompt = $("op").value
  } else if (ver && ver !== "v52") {
    next.prompt = ver
  }
  const off = [...document.querySelectorAll('#agentList .switch[aria-checked="false"]')].map((b) => b.getAttribute("aria-label"))
  if (off.length) next.agents_off = off
  const md = $("md").value.split(",").map((s) => s.trim()).filter(Boolean)
  if (md.length) next.models = md
  if ($("hs").getAttribute("aria-checked") !== "true") next.handshake = false
  const hm = $("hm").value.trim()
  if (hm) next.handshake_model = hm
  return next
}

function optionsToForm(o) {
  $("ov").setAttribute("aria-checked", o.override !== false ? "true" : "false")
  const pos = o.position === "append" ? "append" : "prepend"
  document.querySelector('input[name="pos"][value="' + pos + '"]').checked = true
  $("md").value = Array.isArray(o.models) ? o.models.join(", ") : ""
  const off = Array.isArray(o.agents_off) ? o.agents_off : []
  buildAgentList(off)
  const hasCustom = typeof o.on_prompt === "string" && o.on_prompt
  const ver = hasCustom ? "custom" : (typeof o.prompt === "string" && o.prompt ? o.prompt : "v52")
  for (const r of document.querySelectorAll(".prow")) r.classList.toggle("on", r.dataset.ver === ver)
  $("opRow").hidden = ver !== "custom"
  $("op").value = hasCustom || ""
  $("hs").setAttribute("aria-checked", o.handshake === false ? "false" : "true")
  $("hm").value = typeof o.handshake_model === "string" ? o.handshake_model : ""
  sync()
}

/* ---------- 脏状态 ---------- */
let loaded = {}
function sync() {
  const dirty = JSON.stringify(formToOptions()) !== JSON.stringify(loaded)
  $("save").disabled = !dirty
  $("dirty").hidden = !dirty
  $("reset").disabled = !dirty
  const off = [...document.querySelectorAll('#agentList .switch[aria-checked="false"]')].length
  $("agentStat").textContent = (AGENTS.length - off) + " / " + AGENTS.length
  const ver = document.querySelector(".prow.on")?.dataset.ver
  $("verStat").textContent = ver === "custom" ? "自定义" : (VERSIONS.find((v) => v.id === ver)?.label ?? "完整版 v5.2")
  const n = $("op").value.length
  $("opCount").textContent = n ? n.toLocaleString() + " 字" : ""
}

/* ---------- 保存 ---------- */
async function save() {
  const btn = $("save")
  btn.disabled = true
  btn.textContent = "保存中…"
  const next = formToOptions()
  try {
    const got = await magpie.options.set(next)
    loaded = got && typeof got === "object" ? got : next
    btn.textContent = "✓ 已保存"
    btn.classList.add("saved")
    toast("已保存，下一个请求即生效", "ok")
    setTimeout(() => { btn.textContent = "保存配置"; btn.classList.remove("saved"); sync() }, 1400)
  } catch (e) {
    toast("此版本桥接不支持写入 —— 命令行等效：magpie plugin options hangong " + JSON.stringify(next), "warn", 6500)
    btn.textContent = "保存配置"
  }
  sync()
}

/* ---------- 启动 ---------- */
async function main() {
  $("ver").textContent = "v" + VERSION
  buildVersionList()
  buildAgentList([])
  const MODEL = "auto/deepseek-v4.1-flash"
  for (const id of ["cmd1", "cmd2"]) $(id).textContent = $(id).textContent.replace("MODEL", MODEL)

  $("ov").addEventListener("click", () => {
    const b = $("ov")
    b.setAttribute("aria-checked", b.getAttribute("aria-checked") === "true" ? "false" : "true")
    sync()
  })
  $("hs").addEventListener("click", () => {
    const b = $("hs")
    b.setAttribute("aria-checked", b.getAttribute("aria-checked") === "true" ? "false" : "true")
    sync()
  })
  $("posSeg").addEventListener("change", sync)
  $("md").addEventListener("input", sync)
  $("hm").addEventListener("input", sync)
  $("op").addEventListener("input", sync)
  $("reset").addEventListener("click", () => { optionsToForm(loaded); toast("已还原为当前生效配置") })
  $("save").addEventListener("click", save)
  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") { e.preventDefault(); if (!$("save").disabled) save() }
  })
  const cp = async (id) => {
    try { await navigator.clipboard.writeText($(id).textContent); toast("命令已复制到剪贴板", "ok") }
    catch { toast("剪贴板被沙盒拒绝，请手动选择命令文本复制", "warn") }
  }
  $("copy1").addEventListener("click", () => cp("cmd1"))
  $("copy2").addEventListener("click", () => cp("cmd2"))

  optionsToForm({})
  if (!window.magpie) {
    $("bridgeText").textContent = "独立预览 · 桥接不可用"
    return
  }
  try { await magpie.ready } catch { /* 主题失败不影响功能 */ }
  try {
    loaded = (await magpie.options.get()) || {}
    optionsToForm(loaded)
    $("bridge").classList.remove("off")
    $("bridgeText").textContent = "桥接已连接 · 配置可读写"
  } catch (e) {
    $("bridgeText").textContent = "配置读取失败"
    toast("options.get 失败：" + e, "warn", 5000)
  }
}

main()
