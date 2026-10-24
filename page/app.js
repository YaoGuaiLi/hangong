// 汉宫控制台 — 零依赖。bridge 提供的 API（见 _magpie/bridge.js 注释）：
//   await magpie.ready            { dark, lang, tokens }
//   magpie.onTheme(fn)
//   await magpie.options.get()    本插件的 options
//   await magpie.options.set(o)   写回并持久化，返回写后的值
// 与 build-prompt.mjs 生成的 hangong-prompt.js 保持同步的常量：
const VERSION = "1.1.0"
const PROMPT_CHARS = 78647

const $ = (id) => document.getElementById(id)

function toast(text, ms = 2600) {
  const t = $("toast")
  t.textContent = text
  t.classList.add("show")
  clearTimeout(toast._h)
  toast._h = setTimeout(() => t.classList.remove("show"), ms)
}

async function copyCmd(text) {
  try {
    await navigator.clipboard.writeText(text)
    toast("已复制到剪贴板 ✓")
  } catch {
    toast("剪贴板被沙盒拒绝，请手动选中文本复制")
  }
}

function currentOptions() {
  const next = {
    override: $("ov").checked,
    position: document.querySelector('input[name="pos"]:checked').value,
  }
  const ag = $("ag").value.split(",").map((s) => s.trim()).filter(Boolean)
  const md = $("md").value.split(",").map((s) => s.trim()).filter(Boolean)
  if (ag.length) next.agents = ag
  if (md.length) next.models = md
  const op = $("op").value
  if (op.trim()) next.on_prompt = op
  return next
}

async function save() {
  const btn = $("save")
  btn.disabled = true
  $("saveState").textContent = "保存中…"
  const next = currentOptions()
  try {
    const got = await magpie.options.set(next)
    $("saveState").textContent = "已保存 ✓ 立即生效"
    toast("已保存 ✓ " + JSON.stringify(got))
  } catch (e) {
    $("saveState").textContent = "保存失败"
    toast("此版本桥接不支持写入，命令行等效：magpie plugin options hangong " + JSON.stringify(next), 6000)
  }
  btn.disabled = false
}

async function main() {
  $("ver").textContent = "v" + VERSION
  $("promptSize").textContent = Math.round(PROMPT_CHARS / 1000) + " K chars"

  if (!window.magpie) {
    $("bridgeState").innerHTML = '<span class="warn">未检测到 magpie 桥接（独立打开）</span>'
    $("save").disabled = false
    $("save").addEventListener("click", save)
    return
  }

  try {
    const theme = await magpie.ready
    if (theme && theme.lang) document.documentElement.lang = theme.lang
  } catch { /* 主题失败不影响功能 */ }

  let o = {}
  let bridgeOk = true
  try {
    o = (await magpie.options.get()) || {}
  } catch (e) {
    bridgeOk = false
    $("bridgeState").innerHTML = '<span class="warn">options 读取失败：' + e + "</span>"
  }
  if (bridgeOk) {
    $("bridgeState").innerHTML = '<span class="ok">桥接正常 · 配置可读写</span>'
    $("ov").checked = o.override !== false
    const pos = o.position === "append" ? "append" : "prepend"
    document.querySelector('input[name="pos"][value="' + pos + '"]').checked = true
    $("ag").value = Array.isArray(o.agents) ? o.agents.join(",") : ""
    $("md").value = Array.isArray(o.models) ? o.models.join(",") : ""
    $("op").value = typeof o.on_prompt === "string" ? o.on_prompt : ""
  }

  $("save").disabled = false
  $("save").addEventListener("click", save)

  const cmd1 = $('cmd1').textContent.replace('&lt;任意模型&gt;', 'auto/deepseek-v4.1-flash')
  const cmd2 = $('cmd2').textContent.replace('&lt;任意模型&gt;', 'auto/deepseek-v4.1-flash')
  document.querySelector("[data-copy]").addEventListener("click", () => copyCmd(cmd1))
  document.querySelector("[data-copy2]").addEventListener("click", () => copyCmd(cmd2))
}

main()
