// F-04: 定番ダイヤモンド富士観測スポット(手動キュレーション)
// 座標は代表地点(展望広場・湖畔・山頂標識など)の概略値。
// 掲載基準: 実観測の定番地として知られ、中間地形による遮蔽の心配が小さいこと
// (スコープ外 §5 — DEM 遮蔽判定は行わないため、定番地のみを載せる)。

export interface Spot {
  id: string;
  name: string;
  pref: string;
  latDeg: number;
  lonDeg: number;
  elevM: number;
  note: string;
}

export const SPOTS: Spot[] = [
  // ── 富士山の西側(日の出ダイヤ) ──
  {
    id: "tanuki-ko",
    name: "田貫湖",
    pref: "静岡県富士宮市",
    latDeg: 35.3387,
    lonDeg: 138.5546,
    elevM: 660,
    note: "湖面に映る「ダブルダイヤモンド」で名高い定番地。キャンプ場と展望デッキあり",
  },
  {
    id: "asagiri-kogen",
    name: "朝霧高原",
    pref: "静岡県富士宮市",
    latDeg: 35.393,
    lonDeg: 138.556,
    elevM: 850,
    note: "国道 139 号沿いの高原。裾野まで見渡す大パノラマの日の出ダイヤ",
  },
  {
    id: "ryugatake",
    name: "竜ヶ岳(本栖湖)",
    pref: "山梨県富士河口湖町",
    latDeg: 35.4408,
    lonDeg: 138.5771,
    elevM: 1485,
    note: "年末年始の「初日の出ダイヤ」で知られる山頂。登山約 2 時間",
  },
  // ── 富士山の東側(日没ダイヤ) ──
  {
    id: "takao-san",
    name: "高尾山山頂",
    pref: "東京都八王子市",
    latDeg: 35.6254,
    lonDeg: 139.2437,
    elevM: 599,
    note: "冬至前後の夕方、大見晴台から。ケーブルカーで気軽に登れる定番地",
  },
  {
    id: "yamanakako-hirano",
    name: "山中湖・平野湖畔",
    pref: "山梨県山中湖村",
    latDeg: 35.413,
    lonDeg: 138.878,
    elevM: 982,
    note: "湖面反射のダブルダイヤ狙いの定番。冬の午後に観測期が長い",
  },
  {
    id: "yamanakako-panorama",
    name: "パノラマ台(山中湖)",
    pref: "山梨県山中湖村",
    latDeg: 35.4008,
    lonDeg: 138.8905,
    elevM: 1090,
    note: "山中湖と富士を見下ろす展望地。駐車場あり",
  },
  {
    id: "enoshima-nishihama",
    name: "片瀬海岸西浜(江の島)",
    pref: "神奈川県藤沢市",
    latDeg: 35.3095,
    lonDeg: 139.4785,
    elevM: 5,
    note: "砂浜から海越しの富士へ沈む夕日。江ノ電で行ける手軽さが魅力",
  },
  {
    id: "inamuragasaki",
    name: "稲村ヶ崎",
    pref: "神奈川県鎌倉市",
    latDeg: 35.3025,
    lonDeg: 139.5261,
    elevM: 10,
    note: "相模湾越しの富士。4 月上旬と 9 月上旬の夕方が観測期",
  },
  {
    id: "tateishi-koen",
    name: "立石公園(秋谷)",
    pref: "神奈川県横須賀市",
    latDeg: 35.2418,
    lonDeg: 139.581,
    elevM: 10,
    note: "岩礁と松のシルエットで知られる海景の名所",
  },
  {
    id: "tamagawa-sengen",
    name: "多摩川浅間神社",
    pref: "東京都大田区",
    latDeg: 35.5904,
    lonDeg: 139.664,
    elevM: 30,
    note: "多摩川越しに富士を望む都内の定番。展望テラスあり",
  },
  {
    id: "tokyo-skytree",
    name: "東京スカイツリー天望デッキ",
    pref: "東京都墨田区",
    latDeg: 35.7101,
    lonDeg: 139.8107,
    elevM: 350,
    note: "地上 350m から都心越しの富士へ沈む夕日を観測",
  },
  {
    id: "roppongi-hills",
    name: "六本木ヒルズ スカイデッキ",
    pref: "東京都港区",
    latDeg: 35.6604,
    lonDeg: 139.7292,
    elevM: 270,
    note: "屋上スカイデッキから望む都心のダイヤモンド富士",
  },
  {
    id: "chiba-porttower",
    name: "千葉ポートタワー",
    pref: "千葉県千葉市",
    latDeg: 35.6003,
    lonDeg: 140.1049,
    elevM: 125,
    note: "東京湾越し約 128km の遠望ダイヤ。展望室 4 階から",
  },
];
