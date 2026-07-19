# DentShade AI 色階指南：本機版

這個版本可以直接放在自己的 Windows 電腦中使用，不需要 Python、資料庫或網路。

## 最簡單的開啟方式

1. 將 ZIP 檔解壓縮。
2. 打開 `DentShadeAI-local` 資料夾。
3. 雙擊 `index.html`。
4. 網站會使用瀏覽器開啟。

## 建議使用 VS Code

1. 安裝 Visual Studio Code。
2. 在 VS Code 選擇「檔案 → 開啟資料夾」。
3. 選擇解壓縮後的 `DentShadeAI-local`。
4. 修改檔案後儲存，再重新整理瀏覽器。

資料夾內容：

- `index.html`：網站文字與畫面結構。
- `styles.css`：顏色、版面與手機版樣式。
- `app.js`：照片讀取、三區拖曳、縮放、色彩偵測與色階計算。

## 使用方式

1. 按「上傳牙齒照片」。
2. 在「01 選擇分析區域」中，分別拖曳頸部、中部、切端三個框到適合的位置。
3. 拖曳每個框右下角的圓點調整大小。
4. 按「偵測三區顏色並比對」。
5. 查看各區的 L*a*b*、VITA Classical 首選色與候選色。

## 目前限制

- 照片沒有進行光源、白平衡或校色卡校正。
- 使用示範版 VITA Classical 數值與 CIE76 色差。
- 所有處理都只在瀏覽器中進行，沒有病例資料庫。
- 此版本只供研究和介面測試，不作為臨床診斷依據。

## 之後放到 GitHub Pages

建立 GitHub repository 後，將這三個網站檔案上傳到 repository 根目錄，再到 `Settings → Pages` 選擇從 `main` branch 發布即可。
