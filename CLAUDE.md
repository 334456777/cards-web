# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

落差扑克牌占卜 · Astro 6 + Tailwind v4 的全静态科普站(零框架运行时,交互全用原生 `<script>`)。完整架构、页面结构、内容集合/合成逻辑、设计系统见 @README.md(本文件不重复这些,只记 README 没有、或一旦缺失就会做错的操作要点)。

## 注释约定

注释只描述代码**当前**的行为与缘由;**不要添加过程性 / 历史性注释**(如「原先…现改为…」「为修复某 bug」「以前是 X」)。改动后顺手清掉演变叙述,让人和 AI 读到的永远是最终态、无歧义。

## 命令与验证

- `npm run dev` —— 开发服务器 http://localhost:4321
- `npm run build` —— 产物到 `./dist/`。**本仓库无测试、无 lint,`build`(含 Astro/TS 类型检查)是唯一验证关卡——改完务必跑一次。**
- `npm run preview` —— 预览构建产物。**单卡页的叠加态开关是打包后的原生 module `<script>`,`file://` 双击不会执行(module 脚本受 CORS 限制)**,必须经 preview 或静态服务器访问。
- `npm run fonts` —— 字体子集化(`scripts/subset-fonts.mjs`):扫 `dist/` 渲染产物的实际用字,从 `@fontsource` 源裁出只含这些字的 woff2 到 `public/fonts/`(每字重 1MB+ → ~230-300KB,消中文大字体 FOUT 跳变)。**流程:先 `npm run build` 出 dist → `npm run fonts` → 再 `npm run build` 让子集进产物;改文案/加卡引入新字后必须重跑**,否则新字无字形。需本机 `python3 + fonttools + brotli`;子集 woff2 已 commit,故 CI 的 `npm run build` 无需 python(只是把 `public/fonts/` 拷进 dist)。字体声明在 `global.css` 的 6 个 `@font-face`(`font-display:optional`)+ `BaseLayout` 首屏 preload 三个关键字重。
- **`npm run build` 三平台(含 Windows 本机)一致可跑**:`content.config.ts` 的 glob `base` 必须传 file URL(`new URL("./content/xxx/", import.meta.url)`)——这是 Astro 文档钦定的「absolute file URL」形态。**勿改回 `path.join(__dirname, …)` 绝对路径字符串**:Windows 上盘符 `C:` 会被 glob loader 的 `new URL(base, root)` 误判为 scheme、`fileURLToPath` 抛 "must be of scheme file"(Linux 以 `/` 开头侥幸不炸,故仅 Windows 受害)。

## 部署到 pai-eth0(构建走 CI,同步在本机)

静态站点根是 `pai-eth0` 上的 `/home/yusteven/cards-web/dist/`,由 PM2(`cards-web`)经 `serve` 监听 `127.0.0.1:5432`。`pai-eth0` 本机经 `~/.ssh/config` 别名连接(走 VPN,密钥 `~/.ssh/id_ed25519_pai`,公钥已授权,**部署全程免密**)。

构建走 **GitHub Actions**(`.github/workflows/build.yml`):push 到 `main` 且命中代码 `paths`(`src/` `public/` `astro.config.mjs` `package*.json` `tsconfig.json` 或工作流自身),或手动 `workflow_dispatch`,即在 Linux + Node 22 跑 `npm ci && npm run build`,上传 `dist/` 工件 `dist`。`pai-eth0` 是内网/VPN 地址、托管 runner 不可达,故**部署 = 本机下载工件 + 同步 + 重启**:

```powershell
# 1. 提交并推送 → 触发 CI 构建(Actions 页看绿勾)
git add -A && git commit -m "..." && git push origin main

# 2. 拉最近一次 main 构建的 dist 工件、解到 ./dist/(gh 已装并登录;或网页 Artifacts 下载 dist.zip)
gh run download "$(gh run list -w build.yml -b main -L1 --json databaseId -q '.[0].databaseId')" -n dist -D dist

# 3. 打包 → 上传 → 服务器端原子替换 dist + 重启(免密;建 dist.new 再瞬时 mv 顶替,避免半成品)
tar czf "$env:TEMP\cw.tgz" -C dist . && scp "$env:TEMP\cw.tgz" pai-eth0:/tmp/cw.tgz && ssh pai-eth0 'set -e; D=/home/yusteven/cards-web; rm -rf $D/dist.new; mkdir -p $D/dist.new; tar xzf /tmp/cw.tgz -C $D/dist.new 2>/dev/null; rm -rf $D/dist; mv $D/dist.new $D/dist; rm -f /tmp/cw.tgz; pm2 restart cards-web'
```

⚠️ **从 macOS 本机部署**:上面是 Windows PowerShell 写法。zsh 下临时包走 `/tmp/cw.tgz`,打包用普通写法即可:`COPYFILE_DISABLE=1 tar -czf /tmp/cw.tgz -C dist .`。要点两条:
- `COPYFILE_DISABLE=1` 防把资源派生打成 `._*`(AppleDouble)成员被服务器 GNU tar 还原进 `dist/` 污染线上;模式标志须写成 `-czf`(带 `-`、放最前),否则系统自带的 **bsdtar** 会因 `--no-xattrs czf` 这类「长选项在前、`czf` 不带 `-`」的老式写法报 `Must specify one of -c…`。
- **不要再加 `--no-xattrs`(无效)**:新版 macOS 内核会给所有文件自动打 `com.apple.provenance` 扩展属性,`xattr -cr` / `cp -X` / `ditto --noextattr` / `tar --no-xattrs` 一律清不掉(连新建副本都会被立即重新打上),它必然被写进包。服务器 GNU tar 解包时只是刷一串「忽略未知的扩展头关键字」警告——**无害,文件照常正确解出**;直接在解包侧 `2>/dev/null` 吞掉即可(step 3 的 `tar xzf … 2>/dev/null` 已加;`set -e` 下真错误仍会因非零退出中止,只吞警告文字)。

另注:macOS `rm` 常被别名为 `trash`,删本机文件用 `find … -delete` 更稳。

CI 只构建产工件、不含部署(已明确否决在 CI 里加 deploy job / 写 pai-eth0)。

## 改东西在哪改

54 张单卡不各存一份,由 `花色面 × 数字面` 动态合成(引擎 `src/lib/cards.ts` 的 `buildDeck()`)。README 的「改东西在哪改」是概览,以下补它没细讲的:

- **某张牌的专属文字 / 特质** → `src/lib/cards.ts` 的 `OVERRIDES`,按 `key`(`hearts_3` / `joker_red`)补 `lede`/`synth`/`sup`;再补 `traits`/`merits`/`flaws`/`note`(均可选)驱动单卡页底部「优势 / 劣势」双栏(随叠加态一明一暗,四者全空则整块不出现)。缺色映射:**缺♠→红桃 · 缺♥→黑桃 · 缺♣→方块 · 缺♦→梅花**。已覆盖 A/2/3–7/J/Q/K(8/9 用 `note`、10 用 `traits`)。
- **同数字两两组合词条** → `src/lib/cards.ts` 的 `RANK_PAIRS`(A–9 全量,每阶 6 组、任一花色恰 3 组);单卡页只展示含本牌花色的那 3 组。
- **某花色 / 某数字的通用含义** → `src/content/suits|ranks/*.json`(schema 在 `src/content.config.ts`);**精选组合** → `src/content/combinations/*.json`。
- **占卜守则 / 起卦法** → `src/pages/divination.astro`(镜像 `tutorial.astro` 骨架);入口在 `BaseLayout.astro` 导航/页脚、`index.astro` 门户卡。
- **导航 / 页脚 / `#rough` 手绘滤镜** → `src/layouts/BaseLayout.astro`;**主题色与字体 token**(`text-coral`/`bg-paper-deep`/`border-line`…)→ `src/styles/global.css`。
- **页面外层容器统一用 `max-w-[1280px] mx-auto px-8`**(导航、页脚、`Divider`、各页面包屑 / 标题 / 正文一致,保证左缘对齐)。**新加的页沿用此模板**,勿用其它宽度 / 内边距。教程 / 守则的移动端目录 `.mtoc` 负边距(`-32px`)与该 `px-8` 绑定,改内边距时要同步。

### SPA 客户端路由(改交互必读)

`BaseLayout.astro` 的 `<head>` 引了 `<ClientRouter />`,换页不刷新。**交互脚本必须在 `astro:page-load` 里(重新)初始化,离开页面前在 `astro:before-swap` 里清理**(否则换页后失效 / 监听泄漏):

- `library`/`tutorial`/`divination` 用 `astro:page-load`;后两者 scroll/IntersectionObserver 需在 `before-swap` 断开,且**用各自独立元素 id**(tutorial:`progress`/`c1..c5`/`data-t`;divination:`dvprogress`/`d1..d7`/`data-d`)避免串扰。
- `suits`/`combinations` 的 `define:vars` 脚本用 `window.__xxxBound` 守卫 + `astro:page-load`。
- 单卡页的叠加态开关(`.sp-switch`)在 `astro:page-load` 里给按钮绑定点击、切换 `document.body.classList` 的 `reverse`;标签 / 滑块 / 显义隐义文案的翻面全由 `[key].astro` 作用域 `<style>` 里的 `body.reverse …` 规则承接。`reverse` 的换页复位已在 `BaseLayout.astro` 的 `astro:before-swap` 统一 `remove`,故开关脚本无需自清理。

### 库 → 单卡页「飞牌落桌」转场

`BaseLayout.astro` 底部 `<script>`:委托拦截 `a[href^="/cards/"]` → 记原位置 → `navigate()` → `astro:after-swap` 藏目标 hero 卡 → `astro:page-load` 量真实矩形,让克隆牌从原位移动放大、过冲再落定(WAAPI,`#cardflip-stage`/`.cf-face`,样式在 `global.css` 须全局)。背景用 `html{view-transition-name:none}` + `.cf-pagein` 纸色淡入;`prefers-reduced-motion` 走普通 SPA 跳转。

## 两个易踩坑(改交互前必读)

1. **`<script define:vars={...}>` 是内联脚本,不经 esbuild 转译,只能写纯 JS**(`suits.astro`、`combinations.astro` 用到)。写 `as HTMLElement`、`foo!` 等 TS 语法会原样输出到浏览器、整段 SyntaxError 失效(表现为「点击没反应」)。普通 `<script>`(无 `define:vars`)会转译,TS 没问题。
2. **JS `classList.toggle()` 切换的 Tailwind 工具类,会被元素基础工具类按编译 CSS 源码顺序覆盖**(胜出的是 CSS 里靠后那条)。选中 / 激活态请改用内联 `style`,或作用域 `<style>` 里特异性更高的 `.foo.on` 规则。
