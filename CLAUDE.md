# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

落差扑克牌占卜 · Astro 6 + React 19 岛 + Tailwind v4 的全静态科普站。完整架构、页面结构、内容集合/合成逻辑、设计系统见 @README.md(本文件不重复这些,只记 README 没有、或一旦缺失就会做错的操作要点)。

## 注释约定

注释只描述代码**当前**的行为与缘由;**不要添加过程性 / 历史性注释**(如「原先…现改为…」「为修复某 bug」「以前是 X」)。改动后顺手清掉演变叙述,让人和 AI 读到的永远是最终态、无歧义。

## 命令与验证

- `npm run dev` —— 开发服务器 http://localhost:4321
- `npm run build` —— 产物到 `./dist/`。**本仓库无测试、无 lint,`build`(含 Astro/TS 类型检查)是唯一验证关卡——改完务必跑一次。**
- `npm run preview` —— 预览构建产物。**单卡页的叠加态开关是 `client:load` React 岛,`file://` 双击不会水合**,必须经 preview 或静态服务器访问。
- ⚠️ **Windows 本机 `npm run build` 当前会失败**:Astro glob content-loader 把绝对路径盘符 `C:` 误判为 URL scheme(`fileURLToPath` 抛 "must be of scheme file");**Linux/CI 不受影响**,故以 CI 构建为准(见下)。

## 部署到 pai-eth0(构建走 CI,同步在本机)

静态站点根是 `pai-eth0` 上的 `/home/yusteven/cards-web/dist/`,由 PM2(`cards-web`)经 `serve` 监听 `127.0.0.1:5432`。`pai-eth0` 本机经 `~/.ssh/config` 别名连接(走 VPN,密钥 `~/.ssh/id_ed25519_pai`,公钥已授权,**部署全程免密**)。

构建走 **GitHub Actions**(`.github/workflows/build.yml`):push 到 `main` 且命中代码 `paths`(`src/` `public/` `astro.config.mjs` `package*.json` `tsconfig.json` 或工作流自身),或手动 `workflow_dispatch`,即在 Linux + Node 22 跑 `npm ci && npm run build`,上传 `dist/` 工件 `dist`。`pai-eth0` 是内网/VPN 地址、托管 runner 不可达,故**部署 = 本机下载工件 + 同步 + 重启**:

```powershell
# 1. 提交并推送 → 触发 CI 构建(Actions 页看绿勾)
git add -A && git commit -m "..." && git push origin main

# 2. 拉最近一次 main 构建的 dist 工件、解到 ./dist/(gh 已装并登录;或网页 Artifacts 下载 dist.zip)
gh run download "$(gh run list -w build.yml -b main -L1 --json databaseId -q '.[0].databaseId')" -n dist -D dist

# 3. 打包 → 上传 → 服务器端原子替换 dist + 重启(免密;建 dist.new 再瞬时 mv 顶替,避免半成品)
tar czf "$env:TEMP\cw.tgz" -C dist . && scp "$env:TEMP\cw.tgz" pai-eth0:/tmp/cw.tgz && ssh pai-eth0 'set -e; D=/home/yusteven/cards-web; rm -rf $D/dist.new; mkdir -p $D/dist.new; tar xzf /tmp/cw.tgz -C $D/dist.new; rm -rf $D/dist; mv $D/dist.new $D/dist; rm -f /tmp/cw.tgz; pm2 restart cards-web'
```

CI 只构建产工件、不含部署(已明确否决在 CI 里加 deploy job / 写 pai-eth0)。

## 改东西在哪改

54 张单卡不各存一份,由 `花色面 × 数字面` 动态合成(引擎 `src/lib/cards.ts` 的 `buildDeck()`)。README 的「改东西在哪改」是概览,以下补它没细讲的:

- **某张牌的专属文字 / 特质** → `src/lib/cards.ts` 的 `OVERRIDES`,按 `key`(`hearts_3` / `joker_red`)补 `lede`/`synth`/`sup`;再补 `traits`/`merits`/`flaws`/`note`(均可选)驱动单卡页底部「优势 / 劣势」双栏(随叠加态一明一暗,四者全空则整块不出现)。缺色映射:**缺♠→红桃 · 缺♥→黑桃 · 缺♣→方块 · 缺♦→梅花**。已覆盖 A/2/3–7/J/Q/K(8/9 用 `note`、10 用 `traits`)。
- **同数字两两组合词条** → `src/lib/cards.ts` 的 `RANK_PAIRS`(A–9 全量,每阶 6 组、任一花色恰 3 组);单卡页只展示含本牌花色的那 3 组。
- **某花色 / 某数字的通用含义** → `src/content/suits|ranks/*.json`(schema 在 `src/content.config.ts`);**精选组合** → `src/content/combinations/*.json`。
- **占卜守则 / 起卦法** → `src/pages/divination.astro`(镜像 `tutorial.astro` 骨架);入口在 `BaseLayout.astro` 导航/页脚、`index.astro` 门户卡。
- **导航 / 页脚 / `#rough` 手绘滤镜** → `src/layouts/BaseLayout.astro`;**主题色与字体 token**(`text-coral`/`bg-paper-deep`/`border-line`…)→ `src/styles/global.css`。

### SPA 客户端路由(改交互必读)

`BaseLayout.astro` 的 `<head>` 引了 `<ClientRouter />`,换页不刷新。**交互脚本必须在 `astro:page-load` 里(重新)初始化,离开页面前在 `astro:before-swap` 里清理**(否则换页后失效 / 监听泄漏):

- `library`/`tutorial`/`divination` 用 `astro:page-load`;后两者 scroll/IntersectionObserver 需在 `before-swap` 断开,且**用各自独立元素 id**(tutorial:`progress`/`c1..c5`/`data-t`;divination:`dvprogress`/`d1..d6`/`data-d`)避免串扰。
- `suits`/`combinations` 的 `define:vars` 脚本用 `window.__xxxBound` 守卫 + `astro:page-load`。
- 单卡页 React 岛由 ClientRouter 自动重新水合。

### 库 ↔ 单卡页转场:克隆牌全程压在两栏之下 + 背景两段式收/展

`BaseLayout.astro` 底部 `<script>`(WAAPI)。克隆牌活在 **`#cf-portal`**——`.page-wrap` 内一个 `transition:persist="cardflip"` 的固定浮层,`z-index:20` 夹在内容(0)与筛选栏(30)/导航栏(40)之间,故克隆牌**被两栏的磨砂遮挡**(滑到栏背后);persist 让它跨 `navigate()` 复用同一节点、飞行不中断。克隆是全局类 **`.cf-card`**(不依赖任一页作用域样式,跨换页存活;外观对齐单卡页 `.card`,落定后亮真卡)。

- **前向**(拦截 `a[href^="/cards/"]` 主键点击 → `e.preventDefault()`):挂克隆自原位起飞(A 段,锚于起飞矩形向「中转锚点」加速)+ 牌库退场(`.cf-content` 收缩渐隐、`.cf-filterbar` 收起)→ 半程 `HALF` 后 `navigate()` → `astro:after-swap` 藏真 hero + 预隐藏 `.cf-content` → `astro:page-load` 量真实 hero,B 段从中转减速落定 + 单卡页入场(`.cf-content` 舒展渐显)。
- **反向 / 其他 SPA 进入**(返回牌库、导航、后退):无克隆,按生命周期跑入场——`.cf-content` 舒展渐显 +(有则)`.cf-filterbar` 从收起态展开。`spaNav`(`astro:before-swap` 置位)区分首屏 / 刷新(静态),`flight` 区分前向 / 非前向。
- 导航栏在 `.cf-content` 之外,**全程不参与动画**(换页时瞬时同款替换)。`html{view-transition-name:none}` 关掉根快照。`prefers-reduced-motion` 不拦截、走普通 SPA 跳转。

## 两个易踩坑(改交互前必读)

1. **`<script define:vars={...}>` 是内联脚本,不经 esbuild 转译,只能写纯 JS**(`suits.astro`、`combinations.astro` 用到)。写 `as HTMLElement`、`foo!` 等 TS 语法会原样输出到浏览器、整段 SyntaxError 失效(表现为「点击没反应」)。普通 `<script>`(无 `define:vars`)会转译,TS 没问题。
2. **JS `classList.toggle()` 切换的 Tailwind 工具类,会被元素基础工具类按编译 CSS 源码顺序覆盖**(胜出的是 CSS 里靠后那条)。选中 / 激活态请改用内联 `style`,或作用域 `<style>` 里特异性更高的 `.foo.on` 规则。
