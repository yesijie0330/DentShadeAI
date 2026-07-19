# DentShadeAI 瀏覽器資料

這個資料夾由 `recipes.db` 轉換而成，可放在 GitHub Pages 網站使用。

## 檔案

- `vita3dmaster_lab.json`：29 個 VITA 3D-MASTER 色號的 L*a*b*。
- `metadata.json`：品牌、支架色、厚度及空間選項。
- `recipes_manifest.json`：配方分檔索引及欄位順序。
- `recipes_vita_vm_13_aidite_3d_a3.json`
- `recipes_vita_vm_13_aidite_3d_bleach.json`
- `recipes_vita_vm_9_aidite_3d_a3.json`
- `recipes_vita_vm_9_aidite_3d_bleach.json`

四個配方檔合計保留原資料庫的 193,486 筆資料。網站應先依照使用者選擇的陶瓷品牌與支架色，只載入其中一個配方檔，避免一次下載全部資料。

## 壓縮列格式

每個配方檔都有 `fields`，定義 `rows` 陣列中的欄位順序：

1. framework_thickness
2. available_space
3. prep_l
4. prep_a
5. prep_b
6. target_l
7. target_a
8. target_b
9. wash_bake
10. dentin_recipe
11. dentin_ratio
12. dentin_simplified_ratio
13. enamel_recipe
14. delta_e
15. pred_l
16. pred_a
17. pred_b

## GitHub 上傳

解壓縮 ZIP 後，將七個 `.json` 檔上傳到 DentShadeAI repository 根目錄。`README_DATA.md` 是說明文件，可一併上傳。
