# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

落差扑克牌占卜 · Astro 6 + React 19 岛 + Tailwind v4 的全静态科普站。完整架构、页面结构、设计系统见 @README.md。

## 命令

- `npm run dev` —— 开发服务器,http://localhost:4321(Astro 默认端口)
- `npm run build` —— 产物输出到 `./dist/`
- `npm run preview` —— 预览构建产物。**单卡页的开关是 `client:load` React 岛,`file://` 双击打开不会水合**,必须经 preview 或静态服务器访问

本仓库**没有测试和 lint**,`npm run build`(含 Astro/TS 类型检查)是唯一的验证关卡——改完务必跑一次。

## 部署到 pai-eth0

SSH 主机 `pai-eth0` (10.0.1.5) 上的 `/home/yusteven/cards-web/dist/` 是静态站点根目录,由 PM2 (`cards-web`) 通过 `serve` 在端口 5432 提供。部署即构建 + 同步 + 重启：

```bash
# 1. 提交并推送
git add -A && git commit -m "..." && git push origin main

# 2. 构建 + 同步到 pai-eth0 + 重启 serve
npm run build && rsync -avz --delete dist/ pai-eth0:/home/yusteven/cards-web/dist/ && ssh pai-eth0 "pm2 restart cards-web"
```

SSH 配置: `~/.ssh/config` 中 `Host pai-eth0`,密钥 `~/.ssh/id_ed25519_pai`。

## 改东西在哪改

54 张单卡不各存一份,由 `花色面 × 数字面` 动态合成:

- **某张牌的专属文字**(导语/合成/正反义)→ `src/lib/cards.ts` 的 `OVERRIDES`,按 `key`(形如 `hearts_3` / `joker_red`)补 `lede` / `synth` / `sup`
- **某花色 / 某数字的通用含义** → `src/content/suits|ranks/*.json`,该花色 / 数字的全部牌一并生效;schema 在 `src/content.config.ts`
- **精选组合** → `src/content/combinations/*.json` 增删,组合浏览器与单卡页自动同步
- **全站导航 / 页脚 / 手绘滤镜** → `src/layouts/BaseLayout.astro`
- **主题色与字体 token**(`text-coral` / `bg-paper-deep` / `border-line` 等)→ `src/styles/global.css`

## 两个易踩坑(改交互前必读)

1. **`<script define:vars={...}>` 是内联脚本,不经 esbuild 转译,只能写纯 JS**(`suits.astro`、`combinations.astro` 用到)。写 `as HTMLElement`、`foo!` 等 TS 语法会原样输出到浏览器,整段脚本 SyntaxError 失效(表现为"点击没反应")。普通 `<script>`(无 `define:vars`)会转译,TS 语法没问题。
2. **JS `classList.toggle()` 切换的 Tailwind 工具类,会被元素上的基础工具类按编译 CSS 源码顺序覆盖**(胜出的是 CSS 里靠后那条,不是 class 属性里靠后的)。选中 / 激活态请改用内联 `style`,或作用域 `<style>` 里特异性更高的 `.foo.on` 规则。
