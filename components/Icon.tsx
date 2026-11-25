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
  return (
    <svg className={className} viewBox="0 0 64 64" aria-hidden="true">
      <rect width="64" height="64" rx="14" fill="#e4572e" />
      <rect x="3.5" y="3.5" width="57" height="57" rx="11" fill="none" stroke="#fff3e2" strokeOpacity=".28" strokeWidth="1.2" />
      <circle cx="45" cy="19.5" r="8.5" fill="#f6a35c" />
      <path d="M17.5 38V27.6a1.6 1.6 0 0 1 1.6-1.6h5.3V38z" fill="#fff3e2" />
      <path d="M25.6 38V15.6a1.6 1.6 0 0 1 1.6-1.6h6.6a1.6 1.6 0 0 1 1.6 1.6V38z" fill="#fff3e2" />
      <path d="M36.6 38v-8.8a1.4 1.4 0 0 1 1.4-1.4h4.6a1.4 1.4 0 0 1 1.4 1.4V38z" fill="#fff3e2" />
      <path d="M28.9 19.2h3.4M28.9 23.4h3.4M28.9 27.6h3.4M28.9 31.8h3.4M20.2 30.4h1.9M39.2 32.4h1.9" stroke="#e4572e" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M8.5 43.5c3.8-4.9 13.1-7.6 23.5-7.6s19.7 2.7 23.5 7.6c-6.5 1.6-15 2.4-23.5 2.4s-17-.8-23.5-2.4z" fill="#fff3e2" />
      <path d="M8.5 43.5c6.5 1.6 15 2.4 23.5 2.4s17-.8 23.5-2.4" fill="none" stroke="#c9461f" strokeWidth="1.3" strokeOpacity=".55" />
      <path d="M13 51.2c2.4 0 2.4-1.7 4.8-1.7s2.4 1.7 4.8 1.7 2.4-1.7 4.8-1.7 2.4 1.7 4.8 1.7 2.4-1.7 4.8-1.7 2.4 1.7 4.8 1.7 2.4-1.7 4.8-1.7 2.4 1.7 4.8 1.7" fill="none" stroke="#fff3e2" strokeWidth="2.2" strokeLinecap="round" strokeOpacity=".8" />
      <path d="M19.5 56.6c2.1 0 2.1-1.4 4.2-1.4s2.1 1.4 4.2 1.4 2.1-1.4 4.2-1.4 2.1 1.4 4.2 1.4 2.1-1.4 4.2-1.4 2.1 1.4 4.2 1.4" fill="none" stroke="#fff3e2" strokeWidth="1.8" strokeLinecap="round" strokeOpacity=".45" />
    </svg>
  );
}
