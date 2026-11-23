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
      <rect width="64" height="64" rx="15" fill="#e4572e" />
      <path d="M11 41.5c2.6-6.2 11.2-9.8 21-9.8s18.4 3.6 21 9.8z" fill="#fff8ee" />
      <path d="M22.5 34V25.5h7.5V34zM32.5 34V17h8.5v17z" fill="#fff8ee" />
      <path d="M35.4 21.5h2.7M35.4 25.5h2.7M35.4 29.5h2.7M25 29.5h2.5" stroke="#e4572e" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M12 48.5c3.3 0 3.3-2 6.7-2s3.3 2 6.7 2 3.3-2 6.6-2 3.3 2 6.7 2 3.3-2 6.6-2 3.4 2 6.7 2" fill="none" stroke="#fff8ee" strokeWidth="2.6" strokeLinecap="round" opacity=".75" />
      <path d="M18 54.5c2.8 0 2.8-1.6 5.6-1.6s2.8 1.6 5.6 1.6 2.8-1.6 5.6-1.6 2.8 1.6 5.6 1.6 2.8-1.6 5.6-1.6" fill="none" stroke="#fff8ee" strokeWidth="2.2" strokeLinecap="round" opacity=".45" />
    </svg>
  );
}
