import { TowerGame } from "@/components/TowerGame";
import { pageMeta, TOWER_OG } from "@/lib/site";

export const metadata = pageMeta(
  "蓋高樓",
  "價值島的小遊戲：看準時機放下樓層，從透天厝、台北 101、哈里發塔一路蓋到太空。你能蓋多高？",
  "/tower",
  TOWER_OG,
);

export default function TowerPage() {
  return <TowerGame />;
}
