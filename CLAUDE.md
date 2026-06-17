# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

落差扑克牌占卜 · Astro 6 + React 19 岛 + Tailwind v4 的全静态科普站。完整架构、页面结构、设计系统见 @README.md。

## 命令

- `npm run dev` —— 开发服务器,http://localhost:4321(Astro 默认端口)
- `npm run build` —— 产物输出到 `./dist/`
- `npm run preview` —— 预览构建产物。**单卡页的开关是 `client:load` React 岛,`file://` 双击打开不会水合**,必须经 preview 或静态服务器访问

本仓库**没有测试和 lint**,`npm run build`(含 Astro/TS 类型检查)是唯一的验证关卡——改完务必跑一次。

## 部署到 pai-eth0(构建走 CI,同步在本机)

SSH 主机 `pai-eth0`(本机经 `~/.ssh/config` 别名连接,走 VPN;原内网 `10.0.1.5` 已弃用)上的 `/home/yusteven/cards-web/dist/` 是静态站点根目录,由 PM2 (`cards-web`) 通过 `serve` 监听 `127.0.0.1:5432` 提供。

构建已切到 **GitHub Actions**(Linux,工作流 `.github/workflows/build.yml`):push 到 `main`(或任意分支手动 `workflow_dispatch`)即在云端 `npm ci && npm run build`,把 `dist/` 作为可下载工件 **`dist`** 上传(保留 30 天)。`pai-eth0` 是内网地址,GitHub 托管 runner 无法直连,故**部署 = 下载工件 + 本机同步 + 重启**:

```powershell
# 1. 提交并推送 → 触发 CI 构建(在 Actions 页看绿勾)
git add -A && git commit -m "..." && git push origin main

# 2. 等 CI 跑完,下载该次运行的 dist 工件、解到 ./dist/(二选一):
#    · 浏览器:仓库 Actions → 选中该次 build 运行 → Artifacts 下载 dist.zip,解压到 ./dist/
#    · 命令行(gh 已装并登录):
gh run download "$(gh run list -w build.yml -b main -L1 --json databaseId -q '.[0].databaseId')" -n dist -D dist

# 3. 打包 → 上传 → 服务器端原子替换 dist + 重启(全程免密,走 pai-eth0 密钥;
#    先建 dist.new 再瞬时 mv 顶替,避免替换过程站点出现半成品)
tar czf "$env:TEMP\cw.tgz" -C dist . && scp "$env:TEMP\cw.tgz" pai-eth0:/tmp/cw.tgz && ssh pai-eth0 'set -e; D=/home/yusteven/cards-web; rm -rf $D/dist.new; mkdir -p $D/dist.new; tar xzf /tmp/cw.tgz -C $D/dist.new; rm -rf $D/dist; mv $D/dist.new $D/dist; rm -f /tmp/cw.tgz; pm2 restart cards-web'
```

CI 只构建产出工件、不含部署,同步上线由本机执行。**以 CI 工件为部署基准**(干净 Linux 环境复现,排除本机差异);注:Windows 本机 `npm run build` 当前会因 Astro glob-loader 的盘符路径 bug 失败(`fileURLToPath` 报 "must be of scheme file"),不影响 Linux/CI。本机 `~/.ssh/config` 已配 `Host pai-eth0`(VPN 地址)+ 密钥 `~/.ssh/id_ed25519_pai`,公钥已授权到服务器,**部署全程免密**。

## 改东西在哪改

54 张单卡不各存一份,由 `花色面 × 数字面` 动态合成:

- **某张牌的专属文字**(导语/合成/正反义)→ `src/lib/cards.ts` 的 `OVERRIDES`,按 `key`(形如 `hearts_3` / `joker_red`)补 `lede` / `synth` / `sup`
  - **该牌的「综合特点 / 优势清单 / 劣势清单 / 缺一色补注」**(来自占卜文本 part 2)→ 同一 `OVERRIDES` 条目里补 `traits` / `merits` / `flaws` / `note`(均为可选)。单卡页底部的「优势 / 劣势 · 同一份特质的两面」双栏区块据此渲染,并随叠加态开关一明一暗;四者都为空时整块不出现。映射规律:**缺♠→红桃 · 缺♥→黑桃 · 缺♣→方块 · 缺♦→梅花**(缺一色即另一色主导)。该映射现已覆盖 **A / 2 / 3–7 / J / Q / K**(J = 必腐败四态、Q = 无权之权四态、A·2 = 缺色综合特点;8/9 用 `note` 比喻,10 用 `traits`)
  - **某数字层级的「同数字 · 两两组合」词条** → `src/lib/cards.ts` 的 `RANK_PAIRS`。**A–9 已全量**(每阶 6 组花色配对,任一花色恰落 3 组),源自占卜文本「两两组牌词条」;单卡页「同数字 · 两两组合」区块只展示含本牌花色的那 3 组
- **某花色 / 某数字的通用含义** → `src/content/suits|ranks/*.json`,该花色 / 数字的全部牌一并生效;schema 在 `src/content.config.ts`
- **精选组合** → `src/content/combinations/*.json` 增删,组合浏览器与单卡页自动同步
- **占卜守则 / 起卦法**(怎么洗牌抽三张、问题编程、隐藏牌/概率场、解牌百分比、600 非线性层级、A→K 发展叙事)→ `src/pages/divination.astro`(书卷体独立页,镜像 `tutorial.astro` 骨架)。导航/页脚入口在 `BaseLayout.astro`,首页门户卡在 `index.astro`
- **全站导航 / 页脚 / 手绘滤镜** → `src/layouts/BaseLayout.astro`
- **客户端路由(SPA,换页不刷新)** → `src/layouts/BaseLayout.astro` 的 `<head>` 引入了 `<ClientRouter />`。**因此所有页面的交互脚本都必须在 `astro:page-load` 里(重新)初始化,离开页面前在 `astro:before-swap` 里清理**(否则换页后失效或监听泄漏):`BaseLayout`(导航)、`library.astro`、`tutorial.astro`、`divination.astro`(后两者 scroll/IO 需在 before-swap 断开;两页用各自独立的元素 id —— tutorial 是 `progress`/`c1..c5`/`data-t`,divination 是 `dvprogress`/`d1..d6`/`data-d` —— 以免 ClientRouter 下互相串扰)用 `astro:page-load`;`suits.astro`、`combinations.astro` 的 `define:vars` 脚本用 `window.__xxxBound` 守卫 + `astro:page-load`(只能写纯 JS)。单卡页的 React 岛由 ClientRouter 自动重新水合。
- **点击进入单卡页的「卡片移动落桌」转场** → `src/layouts/BaseLayout.astro` 底部 `<script>`:委托拦截 `a[href^="/cards/"]`,记下原位置 → `navigate()` 客户端换页 → `astro:after-swap` 先藏起目标 hero 卡 → `astro:page-load` 量出真实 hero 卡矩形,让一张牌从原位**移动放大、略微过冲再落定**(WAAPI,`#cardflip-stage`/`.cf-face`,样式在 `global.css`,须全局)。背景换页用 `::view-transition-*(root)` 的柔和交叉淡入(ClientRouter 根过渡)。`prefers-reduced-motion` 直接走普通 SPA 跳转。(`public/cards_svg/back.svg` 是早期翻转方案留下的卡背,现未使用)
- **主题色与字体 token**(`text-coral` / `bg-paper-deep` / `border-line` 等)→ `src/styles/global.css`

## 两个易踩坑(改交互前必读)

1. **`<script define:vars={...}>` 是内联脚本,不经 esbuild 转译,只能写纯 JS**(`suits.astro`、`combinations.astro` 用到)。写 `as HTMLElement`、`foo!` 等 TS 语法会原样输出到浏览器,整段脚本 SyntaxError 失效(表现为"点击没反应")。普通 `<script>`(无 `define:vars`)会转译,TS 语法没问题。
2. **JS `classList.toggle()` 切换的 Tailwind 工具类,会被元素上的基础工具类按编译 CSS 源码顺序覆盖**(胜出的是 CSS 里靠后那条,不是 class 属性里靠后的)。选中 / 激活态请改用内联 `style`,或作用域 `<style>` 里特异性更高的 `.foo.on` 规则。
