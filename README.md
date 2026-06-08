# 落差扑克牌占卜 · cards-web

一套**非线性、叠加态**的扑克牌占卜科普网站。不问吉凶,只问"此刻偏向哪一面"——每张牌由花色与数字两重含义叠合,而每一重都同时成立着自己与自己的相反:**优势即劣势,劣势即优势,随语境翻转。**

本目录是该站点的 **Astro 实现**(由 `../cards-design/` 的纯 HTML 设计稿迁移而来)。视觉沿用 Claude 官网那种**手绘暖调 + 复古书卷质感 + 烫金点缀**,信息密度向维基百科看齐;桌面与移动端均已适配,全中文界面。

## 技术栈

| 用途 | 选型 |
|---|---|
| 站点框架 | [Astro](https://astro.build) 6 —— 全静态输出(`output: static`),零客户端 JS 默认 |
| 交互岛 | React 19(`@astrojs/react`)—— 仅单卡页的「正义 / 反义」叠加态开关用到 |
| 样式 | Tailwind CSS v4(`@tailwindcss/vite`)+ 各页作用域 `<style>` |
| 字体 | `@fontsource/noto-serif-sc` / `noto-sans-sc`(自托管,无需 CDN) |
| 牌面 | Vector Cards 3.2,54 张 SVG 置于 `public/cards_svg/` |

## 页面结构

Astro 按 `src/pages/` 的文件自动生成路由:

| 路由 | 文件 | 核心 |
|---|---|---|
| `/` | `index.astro` | 首页门户:扇形真实牌面 + 叠加态理念带 + 五个入口 + 四花色一览 |
| `/tutorial` | `tutorial.astro` | 教程读本(5 章):书式单栏 + 粘性目录 + 首字下沉 + 古籍批注 |
| `/library` | `library.astro` | 牌库索引:54 牌网格 + 花色/层级筛选 |
| `/suits` | `suits.astro` | 四花色:四色可切换 + 阴阳四象限定位 + 13 牌横排 |
| `/combinations` | `combinations.astro` | 组合浏览器:4×4 花色配对矩阵 + 精选画廊筛选 |
| `/cards/<key>` | `cards/[key].astro` | 单卡页引擎:54 张共用一个模板,`getStaticPaths` 预渲染 |
| `/404` | `404.astro` | 主题化 404 页 |

`key` 形如 `hearts_3` / `spades_K` / `joker_red`,花色为 `hearts` `spades` `clubs` `diamonds`,点数为 `A 2…10 J Q K`。

## 架构:内容集合 + 合成逻辑

54 张单卡**不各存一份**,而是由数据动态合成:

- **`src/content/`** —— [Content Collections](https://docs.astro.build/en/guides/content-collections/),含义按体系本质拆分共享维护:
  - `suits/*.json` —— 四花色的性格(花色面,只与花色有关)
  - `ranks/*.json` —— 十三层落差(数字面,只与点数有关)
  - `combinations/*.json` —— 精选花色组合(供组合浏览器与单卡页引用)
- **`src/lib/cards.ts`** —— 合成引擎。`buildDeck()` 把 `花色面 × 数字面` 相乘成 52 张普通牌,再并入大小王;**每张牌的导语 / 合成 / 正反义例子写在 `OVERRIDES` 里一牌一调**,缺省则由花色 + 数字自动拼出。
- **`src/components/SuperpositionToggle.tsx`** —— 单卡页的叠加态开关(React 岛,`client:load`)。拨动后同一份特质在显义与隐义之间翻面,状态用 `localStorage` 记住。
- **`src/layouts/BaseLayout.astro`** —— 全站外壳:导航(含移动端汉堡菜单)、页脚、`#rough` 手绘滤镜。

### 改东西在哪改

- **改某张牌的专属文字** → `src/lib/cards.ts` 的 `OVERRIDES`(按 `key` 补 `lede` / `synth` / `sup`)。
- **改某花色 / 某数字的通用含义** → 对应的 `src/content/suits|ranks/*.json`,该花色 / 数字的全部牌一并生效。
- **增删精选组合** → `src/content/combinations/` 增删 JSON,组合浏览器与单卡页自动同步。
- **换牌面图** → 替换 `public/cards_svg/<key>.svg`,路径不变。
- **改全站导航 / 页脚** → `src/layouts/BaseLayout.astro`。

## 设计系统

| 角色 | 取值 | 用途 |
|---|---|---|
| 纸底 | `#FAF6EF` / `#F4EDE0` | 背景,叠极淡纸张颗粒纹理 |
| 墨色 | `#2B2722` | 正文,暖近黑;黑色花色 ♠♣ |
| 烫金 | `#B8893A` / `#C9A227` | 花色符号、分隔线、首字下沉、链接 |
| 珊瑚 | `#D97757` | 交互高亮 / 选中态,克制使用 |
| 复古红 | `#A3372B` | 红色花色 ♥♦ |

- **标题 + 教程正文**:衬线 Noto Serif SC。**导航 / 牌库 / UI**:无衬线 Noto Sans SC。
- 主题色与字体在 `src/styles/global.css` 注册为 Tailwind 主题 token(`text-coral` / `bg-paper-deep` / `border-line` 等)。
- 毛边卡框、波浪分隔线、手绘墨线均用内联 SVG 滤镜实现。

## 本地开发

```bash
npm install
npm run dev      # 本地开发服务器 http://localhost:4321
npm run build    # 产物输出到 ./dist/
npm run preview  # 本地预览构建产物(单卡页等需经服务器才能正确水合)
```

> 注意:单卡页的开关是 `client:load` React 岛,直接用 `file://` 双击打开 `dist` 里的 HTML 不会水合,请用 `npm run preview` 或任意静态服务器访问。

## 部署

全静态,`dist/` 可托管到任意静态平台(GitHub Pages / Netlify / Vercel 等)。

## ⚠️ 维护须知(两个易踩坑)

1. **`<script define:vars={...}>` 是内联脚本,不经 esbuild 转译,只能写纯 JS**(`suits.astro`、`combinations.astro` 用到)。写了 `as HTMLElement`、`foo!` 等 TS 语法会原样输出到浏览器、整段脚本 SyntaxError 失效(表现为"点击没反应")。普通 `<script>`(无 `define:vars`)则会转译,TS 语法没问题。
2. **用 JS `classList.toggle()` 切换的 Tailwind 工具类,会被元素上的基础工具类按 CSS 源码顺序覆盖**(胜出的是编译 CSS 里靠后的那条,不是 class 属性里靠后的)。选中 / 激活态请改用内联 `style` 或作用域 `<style>` 里特异性更高的 `.foo.on` 规则。

## 素材

- 牌面:**Vector Cards (Version 3.2)**,贯穿全站 54 张(52 + 大小王)。
- 字体:Noto Serif SC / Noto Sans SC(`@fontsource`,自托管)。
