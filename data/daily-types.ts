/* 每日觀測（data/daily.ts）的資料格式。
   刻意寫得寬鬆：除了每則快訊必備的欄位，其他都是選填，
   這樣每日排程新增內容時少一個欄位也不會讓網站建置失敗。 */

export type Brief = {
  /** 新聞日期 YYYY-MM-DD */
  d: string;
  /** intl 國際海象／policy 政策氣候／market 市場潮位／ind 個別條件 */
  layer: string;
  tag?: string;
  /** 標題 */
  t: string;
  /** 一句事實 */
  s: string;
  /** 對估價的影響 */
  i?: string;
  src: string;
  url: string;
};

export type TopicItem = { t: string; s: string; src?: string; url?: string };
export type Position = { who: string; say: string; src?: string; url?: string; date?: string };
export type Theme = { t: string; s?: string; positions: Position[]; note?: string; i?: string };

export type Topic = {
  id: string;
  layer: string;
  title: string;
  date?: string;
  status?: string;
  summary?: string;
  groups?: { name: string; items: TopicItem[] }[];
  themes?: Theme[];
  appraiser?: string;
  watch?: string[];
};

export type DailyData = {
  /** 最後更新日 YYYY-MM-DD */
  updated: string;
  schedule?: string;
  topics: Topic[];
  /** 由新到舊，最多 60 則、45 天 */
  briefs: Brief[];
};
