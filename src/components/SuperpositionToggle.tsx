import { useState, useCallback, useEffect } from "react";

interface SuperpositionToggleProps {
  sym: string;
  sup: {
    same: string;
    pos: string;
    neg: string;
  };
}

export default function SuperpositionToggle({ sym, sup }: SuperpositionToggleProps) {
  const [reversed, setReversed] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return localStorage.getItem(`reverse-${sym}`) === "1";
    } catch {
      return false;
    }
  });

  // 同步 body.reverse class
  useEffect(() => {
    document.body.classList.toggle("reverse", reversed);
  }, [reversed]);

  const toggle = useCallback(() => {
    setReversed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(`reverse-${sym}`, next ? "1" : "0");
      } catch {}
      return next;
    });
  }, [sym]);

  const st = reversed
    ? { pre: "劣势", html: sup.neg.replace(/^换个语境[::]\s*/, "") }
    : { pre: "优势", html: sup.pos.replace(/^在某个语境里[::]\s*/, "") };

  return (
    <section className="max-w-[1080px] mx-auto mt-[54px] bg-[radial-gradient(140%_100%_at_50%_0%,#F7EFE0_0%,#F4EDE0_60%)] border border-[#d8ccb6] rounded-[18px] px-10 pt-[38px] pb-[42px] relative overflow-hidden">
      <div className="font-sans text-[12.5px] tracking-[0.2em] uppercase text-[#B8893A] font-bold text-center mb-2">核心交互 · 叠加态</div>
      <p className="font-serif text-2xl text-center text-[#2B2722] mx-auto max-w-[24em] mb-[26px]">
        同一张牌,优势即劣势。拨动开关,在显义与隐义之间翻转——文字不变,只是语境翻面。
      </p>

      <div className="flex items-center justify-center gap-5 mb-[30px]">
        <span className={`font-serif text-[21px] font-bold tracking-[0.04em] transition-all duration-400 whitespace-nowrap ${reversed ? "text-[#8b8173] opacity-60" : "text-[#D97757]"}`}>
          正义 · 显义
        </span>
        <button
          onClick={toggle}
          aria-label="切换正义 / 反义"
          aria-pressed={reversed}
          className="w-[86px] h-[42px] rounded-[30px] border-[1.5px] border-[#B8893A] bg-[#FAF6EF] cursor-pointer relative shrink-0 transition-colors duration-400 p-0"
        >
          <span
            className="absolute top-[3px] left-[3px] w-[34px] h-[34px] rounded-full bg-[#D97757] shadow-[0_2px_6px_rgba(43,39,34,0.3)] flex items-center justify-center text-white text-[17px] font-serif transition-all duration-420"
            style={{
              transform: reversed ? "translateX(44px)" : "translateX(0)",
              background: reversed ? "#A3372B" : "#D97757",
            }}
          >
            {sym}
          </span>
        </button>
        <span className={`font-serif text-[21px] font-bold tracking-[0.04em] transition-all duration-400 whitespace-nowrap ${reversed ? "text-[#A3372B] opacity-100" : "text-[#8b8173] opacity-60"}`}>
          反义 · 隐义
        </span>
      </div>

      <div className="text-center font-serif">
        <p className="text-[27px] leading-[1.5] mb-1">
          <span className={`font-bold transition-colors duration-400 ${reversed ? "text-[#A3372B]" : "text-[#D97757]"}`}>{st.pre}</span>
          <span className="text-[#2B2722]">{sup.same}</span>
        </p>
        <p className="font-sans text-[14.5px] text-[#8b8173] mt-4 tracking-[0.02em]">
          同样的词,<b className="text-[#5b5246] font-bold">是同一个存在</b>——优势即劣势,随语境翻转。这正是落差体系的精神。
        </p>
        <p className="mt-[22px] text-[17px] text-[#5b5246] leading-[1.74] max-w-[34em] mx-auto min-h-[3.4em] transition-opacity duration-350">
          <span className="text-[#2B2722] font-medium">{reversed ? "换个语境:" : "在某个语境里:"}</span>
          {st.html}
        </p>
      </div>
    </section>
  );
}
