import { ICONS, SPRITE } from "@/data/icons";

/** 線條圖示。名稱不在圖示表裡時照原字顯示（例如資料裡仍填了 emoji），不會變成空白 */
export function Icon({ name, className }: { name: string; className?: string }) {
  if (!ICONS[name]) return <>{name}</>;
  return (
    <svg className={className ? `ic ${className}` : "ic"} aria-hidden="true">
      <use href={`#i-${name}`} />
    </svg>
  );
}

/** 全站只放一次的 SVG sprite（在 layout 裡） */
export function IconSprite() {
  return (
    <svg
      aria-hidden="true"
      style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}
      dangerouslySetInnerHTML={{ __html: SPRITE }}
    />
  );
}

/** 價值島標誌：實色底、島嶼與建築剪影、兩道水線（與 app/icon.svg 同一張圖） */
export function Logo({ className }: { className?: string }) {
  /* 價值島的標誌：跟中泰 zonetai.com 同一組品牌色（深青 #004e59、青藍 #00758d、深灰 #53575a），
     外框是斜切角，三棟斜切屋頂的大樓站在島上，下面是浪 */
  return (
    <svg className={className} viewBox="0 0 64 64" aria-hidden="true">
      <defs><linearGradient id="vi-logo-g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#0b8ea6" /><stop offset=".55" stopColor="#00758d" /><stop offset="1" stopColor="#004e59" /></linearGradient></defs>
      <path d="M12 1.5H52L62.5 12V52L52 62.5H12L1.5 52V12Z" fill="url(#vi-logo-g)" />
      <path d="M1.5 46L46 1.5H52L62.5 12V13L13 62.5H12L1.5 52Z" fill="#fff" opacity=".07" />
      {/* 小尺寸（手機導覽列）用的簡化版：線條少、形狀大，32px 也看得清楚 */}
      <g className="lg-s">
        <circle cx="48" cy="15.5" r="5" fill="#9fe0ea" />
        <path d="M10 46V30L19 21V46Z" fill="#cbe9ef" />
        <path d="M22 46V17L33 6V46Z" fill="#fff" />
        <path d="M36 46V26H42L50 34V46Z" fill="#e3f4f7" />
        <path d="M5 46H59L52 54H12Z" fill="#2f3335" />
        <path d="M17 58.5h30" stroke="#9fe0ea" strokeWidth="3.2" strokeLinecap="round" />
      </g>
      <g className="lg-l">
      <circle cx="46.5" cy="17.5" r="5.5" fill="none" stroke="#9fe0ea" strokeWidth="2" />
      <path d="M13.5 44V31.5L20.5 24.5V44Z" fill="#e3f4f7" />
      <path d="M23 44V19.5L31.5 11V44Z" fill="#fff" />
      <path d="M34 44V27.5H38.5L44.5 33.5V44Z" fill="#cbe9ef" />
      <path d="M26.5 22v18M29 19.5v20.5M16.5 33v8M37.5 31v10" stroke="#00758d" strokeWidth="1.4" strokeLinecap="round" opacity=".75" />
      <path d="M7.5 44H56.5L50.5 50.5H13.5Z" fill="#53575a" />
      <path d="M7.5 44H56.5" stroke="#e3f4f7" strokeWidth="1.3" />
      <path d="M13 56h9.5M27.25 56h9.5M41.5 56h9.5" stroke="#9fe0ea" strokeWidth="2.4" strokeLinecap="round" />
      </g>
    </svg>
  );
}
