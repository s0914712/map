# 3D 互動地球視覺化 — 實作過程與工具說明

`globe.html` 是一個可自動旋轉、可互動的 3D 地球資料視覺化頁面,把本專案
(`index.html` Google Maps 軍事基地地圖)的基地資料呈現在 WebGL 地球上。
本文件記錄它的由來、使用的工具、實作細節與驗證過程。

---

## 1. 需求演變過程

| 階段 | 內容 |
|------|------|
| 起點 | 提出 [tldraw](https://github.com/tldraw/tldraw)(開源無限畫布 SDK),希望「實現」它 |
| 轉折 | 看到 [tldraw offline blog](https://tldraw.dev/blog/tldraw-offline) 的展示影片,想要其中的效果 |
| 釐清 | tldraw offline 是**閉源桌面 app**(非開源、無法嵌入網頁);真正想要的是影片中「**轉動地球、data visualization 會互動**」的感覺 |
| 定案 | 不用 tldraw,改用 **globe.gl** 打造 3D 旋轉地球,資料採用專案既有的 9 個軍事基地座標 |

## 2. 使用的工具與函式庫

### 核心函式庫

| 工具 | 版本 | 授權 | 用途 |
|------|------|------|------|
| [globe.gl](https://globe.gl/) | 2.46.1 | MIT | 3D 地球視覺化引擎(內含 Three.js),提供點、標籤、弧線、漣漪、多邊形等資料圖層 |
| [Three.js](https://threejs.org/) | (內含於 globe.gl bundle) | MIT | WebGL 3D 渲染 |
| [topojson-client](https://github.com/topojson/topojson-client) | 3.x | ISC | 把 TopoJSON 國境資料轉成 GeoJSON |
| [world-atlas](https://github.com/topojson/world-atlas) | 2.x | ISC | `countries-110m.json` 全球國境資料 |
| [three-globe 範例貼圖](https://github.com/vasturiano/three-globe) | — | MIT | 地球夜景貼圖、地形起伏圖、星空背景圖 |

### 開發/驗證工具

| 工具 | 用途 |
|------|------|
| npm (`registry.npmjs.org`) | 下載上述套件(開發沙盒的網路政策擋掉 unpkg CDN,npm registry 可用) |
| Python `http.server` | 本地靜態伺服器(`python3 -m http.server 8000`) |
| Playwright + Chromium(SwiftShader 軟體 WebGL) | 無頭瀏覽器自動化驗證:截圖、旋轉偵測、互動測試、console 錯誤檢查 |

## 3. 為什麼把資源 vendor 進 repo?

原計畫從 unpkg CDN 載入,但開發環境的網路政策回傳 403。改為**把所有資源
下載進 `globe-assets/`(約 3.8MB)**,好處:

- 頁面**完全自足**:不依賴任何外部 CDN,本地開檔、Vercel 部署都能跑
- 離線可用(呼應最初 tldraw offline 的精神)
- 版本鎖定,不怕 CDN 上游更新造成破壞

```
globe-assets/
├── globe.gl.min.js        # globe.gl 2.46.1 UMD bundle(含 Three.js)
├── topojson-client.min.js # TopoJSON → GeoJSON 轉換
├── countries-110m.json    # world-atlas 全球國境(1:110m 解析度)
├── earth-night.jpg        # 地球夜景燈光貼圖
├── earth-topology.png     # 地形起伏 bump map
└── night-sky.png          # 星空背景
```

## 4. 功能與實作方式

### 資料

基地座標直接沿用 `index.html` 的 `locations` 陣列(廈門、沖繩、湛江、寧波、
汕頭外沙、嘉義、上海大場、榆林港等 9 筆),複製於 `globe.html` 內。

### 圖層(globe.gl API)

| 功能 | API | 說明 |
|------|-----|------|
| 地球外觀 | `globeImageUrl` / `bumpImageUrl` / `backgroundImageUrl` | 夜景貼圖 + 地形起伏 + 星空 |
| 大氣層光暈 | `atmosphereColor` / `atmosphereAltitude` | 藍色光暈 |
| 基地發光標柱 | `pointsData` | 紅色柱狀標記 |
| 基地名稱標籤 | `labelsData` | 金黃色文字 |
| 擴散漣漪動畫 | `ringsData` | 基地位置持續向外擴散 |
| 動畫飛行弧線 | `arcsData` + `arcDashAnimateTime` | 各基地 → 台海中心 (23.9°N, 119.5°E) 的發光虛線弧 |
| 國境輪廓 | `polygonsData`(TopoJSON 轉 GeoJSON) | 半透明藍色國境線 |
| hover tooltip | `pointLabel` | 顯示基地名稱與內容 |

### 互動

- **自動旋轉**:`globe.controls().autoRotate`,拖曳或 hover 資料點時暫停、
  離開後恢復(監聽 OrbitControls 的 `start`/`end` 事件)
- **點擊基地**:`globe.pointOfView({lat, lng, altitude}, 1200)` 運鏡飛行聚焦,
  並顯示左下角資訊卡(名稱/內容/座標)
- **控制列**:暫停/恢復旋轉、重置視角(回到台海上空 25°N, 118°E)、返回地圖
- **入口**:`index.html` 左側欄新增「🌍 3D Globe View」按鈕

## 5. 驗證過程(Playwright 自動化)

1. `python3 -m http.server 8000` 啟動本地伺服器
2. 無頭 Chromium(`--use-gl=angle --use-angle=swiftshader` 軟體渲染 WebGL)
   開啟 `globe.html`,確認 `<canvas>` 存在
3. 間隔 4 秒截兩張圖、比對像素 → **不同,證明地球在旋轉**
4. 呼叫 `focusBase()` 模擬點擊基地 → 資訊卡出現、標題正確、運鏡聚焦
5. 開啟 `index.html` 確認側欄「🌍 3D Globe View」連結存在
6. 檢查 console:globe 相關資源零錯誤
   (唯二訊息:favicon 404 無關緊要;jQuery/html2canvas CDN 被沙盒擋是
   `index.html` 原有依賴,部署環境不受影響)

## 6. 如何執行

純靜態頁面,無需 build:

```bash
# 任一靜態伺服器,例如:
python3 -m http.server 8000
# 開啟 http://localhost:8000/globe.html
```

或直接部署到 Vercel(現有設定即可,`globe-assets/` 為靜態檔案)。

## 7. 可調整項

- **弧線起訖**:`globe.html` 中的 `FOCUS` 常數與 `arcs` 陣列(目前是各基地指向台海中心,可改成基地互連)
- **貼圖**:換 `earth-blue-marble.jpg`(白天藍色大理石)或 `earth-day.jpg`,three-globe 套件的 `example/img/` 內都有
- **旋轉速度**:`controls.autoRotateSpeed`(目前 0.6)
- **基地資料**:`globe.html` 的 `locations` 陣列(與 `index.html` 同格式,新增基地時兩邊各加一筆)
