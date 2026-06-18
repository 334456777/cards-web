// 字体子集化:扫 dist/ 所有渲染产物提取实际用到的字符,从 @fontsource 源字体裁出
// 只含这些字符的 woff2 到 public/fonts/。中文全集每字重 1MB+,裁后通常降到 ~200-300KB。
//
// 用法:先 `npm run build` 生成最新 dist(脚本从渲染后的 HTML 提字,覆盖 54 张牌的动态合成内容),
// 再 `npm run fonts`,然后再 `npm run build` 让子集字体进产物。改文案 / 加卡后需重跑本脚本。
//
// 依赖:python3 + fonttools + brotli(pip3 install fonttools brotli)。子集字体已 commit 进仓库,
// 故 CI 的 npm run build 无需 python——它只是把 public/fonts/ 拷进 dist。
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, readdirSync, mkdirSync, statSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const DIST = join(ROOT, "dist");
const OUT = join(ROOT, "public", "fonts");
// [包名, 字重] —— 对应 global.css 用到的 6 个 @font-face
const FONTS = [
  ["noto-serif-sc", 400], ["noto-serif-sc", 700], ["noto-serif-sc", 900],
  ["noto-sans-sc", 400], ["noto-sans-sc", 500], ["noto-sans-sc", 700],
];

function htmlFiles(dir) {
  const out = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...htmlFiles(p));
    else if (e.name.endsWith(".html")) out.push(p);
  }
  return out;
}

try { statSync(DIST); } catch { console.error("✗ 未找到 dist/,请先运行 npm run build"); process.exit(1); }

const chars = new Set();
for (const f of htmlFiles(DIST)) for (const ch of readFileSync(f, "utf8")) {
  if (ch.trim()) chars.add(ch);
}
mkdirSync(OUT, { recursive: true });
const textFile = join(OUT, ".chars.txt");
writeFileSync(textFile, [...chars].sort().join(""), "utf8");
console.log(`提取到 ${chars.size} 个字符`);

let totalO = 0, totalS = 0;
for (const [pkg, w] of FONTS) {
  const src = join(ROOT, "node_modules", "@fontsource", pkg, "files", `${pkg}-chinese-simplified-${w}-normal.woff2`);
  const out = join(OUT, `${pkg}-${w}.woff2`);
  execFileSync("python3", ["-m", "fontTools.subset", src, `--text-file=${textFile}`,
    "--flavor=woff2", `--output-file=${out}`, "--layout-features=", "--no-hinting", "--desubroutinize"], { stdio: "inherit" });
  const o = statSync(src).size, s = statSync(out).size;
  totalO += o; totalS += s;
  console.log(`  ${pkg}-${w}: ${Math.round(o / 1024)}KB → ${Math.round(s / 1024)}KB`);
}
rmSync(textFile);
console.log(`总计: ${Math.round(totalO / 1024)}KB → ${Math.round(totalS / 1024)}KB`);
