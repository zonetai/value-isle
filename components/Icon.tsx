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

/** 價值島標誌「小島」v1.0（淺底版、動態）：圓頂小島被 45° 斜縫切成兩色，右上金幣是太陽，下面三道水紋。
    依《價值島Logo_使用說明》：不旋轉、不加陰影或外框；水紋輕晃、金幣浮動、星光一閃，3.6 秒一輪，減少動態時停住。 */
export function Logo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 100 100" aria-hidden="true">
      <g className="vi-bob">
        <circle cx="69" cy="25" r="10.5" fill="#f2b93b" />
        <circle cx="69" cy="25" r="7.14" fill="none" stroke="#e4a827" strokeWidth="1.16" />
        <path className="vi-star" d="M73.41 17.02Q73.41 20.59 76.98 20.59Q73.41 20.59 73.41 24.16Q73.41 20.59 69.84 20.59Q73.41 20.59 73.41 17.02Z" fill="#fff" />
      </g>
      <path d="M18 58C18 45.85 30.98 36 47 36C52.2 36 57.09 37.04 61.31 38.86L42.17 58Z" fill="#004953" />
      <path d="M47.83 58 65.05 40.78C71.72 44.81 76 51.03 76 58H47.83Z" fill="#00758d" />
      <path className="vi-w0" d="M16.7 63H83.3A2.7 2.7 0 0 1 83.3 68.4H16.7A2.7 2.7 0 0 1 16.7 63Z" fill="#00758d" />
      <path className="vi-w1" d="M26.7 72H73.3A2.7 2.7 0 0 1 73.3 77.4H26.7A2.7 2.7 0 0 1 26.7 72Z" fill="#4ba6b7" />
      <path className="vi-w2" d="M36.7 81H63.3A2.7 2.7 0 0 1 63.3 86.4H36.7A2.7 2.7 0 0 1 36.7 81Z" fill="#9fd3dc" />
    </svg>
  );
}
