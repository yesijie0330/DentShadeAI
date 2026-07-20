const ZONES = {
  cervical: { name: "頸部", color: "#ffb56e", lab: { l: 67.4, a: 3.2, b: 17.7 } },
  middle: { name: "中部", color: "#65c9a8", lab: { l: 72.2, a: 1.5, b: 15.0 } },
  incisal: { name: "切端", color: "#8fc8ff", lab: { l: 76.1, a: -0.7, b: 12.1 } },
};

const DEFAULT_POINTS = {
  cervical: { x: 50, y: 35 },
  middle: { x: 50, y: 50 },
  incisal: { x: 50, y: 66 },
};

const DATA_FILES = {
  "VITA VM 13|Aidite 3D A3": "recipes_vita_vm_13_aidite_3d_a3.json",
  "VITA VM 13|Aidite 3D Bleach": "recipes_vita_vm_13_aidite_3d_bleach.json",
  "VITA VM 9|Aidite 3D A3": "recipes_vita_vm_9_aidite_3d_a3.json",
  "VITA VM 9|Aidite 3D Bleach": "recipes_vita_vm_9_aidite_3d_bleach.json",
};

const stage = document.querySelector("#photoStage");
const photo = document.querySelector("#photo");
const demoImage = document.querySelector("#demoImage");
const fileInput = document.querySelector("#fileInput");
const canvas = document.querySelector("#sampleCanvas");
const context = canvas.getContext("2d", { willReadFrequently: true });
const points = structuredClone(DEFAULT_POINTS);
const recipeCache = new Map();
let shadeLibrary = [];
let activeZone = "middle";
let draggingZone = null;
let hasPhoto = false;

function clamp(value, min, max) { return Math.min(max, Math.max(min, value)); }
function round(value) { return Math.round(value * 10) / 10; }
function distance(first, second) {
  return Math.sqrt((first.l - second.l) ** 2 + (first.a - second.a) ** 2 + (first.b - second.b) ** 2);
}

async function loadShadeLibrary() {
  try {
    const response = await fetch("vita3dmaster_lab.json");
    if (!response.ok) throw new Error("無法載入 VITA 資料");
    const data = await response.json();
    shadeLibrary = Object.entries(data).map(([name, lab]) => ({ name, l: lab.L, a: lab.a, b: lab.b }));
  } catch (error) {
    document.querySelector("#errorMessage").textContent = "VITA 色階資料尚未載入，請確認 JSON 已上傳 GitHub。";
  }
}

function renderPoint(zone) {
  const point = points[zone];
  const element = document.querySelector(`#point-${zone}`);
  element.style.left = `${point.x}%`;
  element.style.top = `${point.y}%`;
}

function renderAllPoints() { Object.keys(points).forEach(renderPoint); }

function selectZone(zone) {
  activeZone = zone;
  document.querySelectorAll(".sample-point").forEach((item) => item.classList.toggle("selected", item.dataset.zone === zone));
  document.querySelectorAll("[data-select-zone]").forEach((button) => {
    const selected = button.dataset.selectZone === zone;
    button.classList.toggle("selected", selected);
    button.setAttribute("aria-selected", String(selected));
  });
  const lab = ZONES[zone].lab;
  document.querySelector("#activeZoneName").textContent = ZONES[zone].name;
  document.querySelector("#labL").value = lab.l.toFixed(1);
  document.querySelector("#labA").value = lab.a.toFixed(1);
  document.querySelector("#labB").value = lab.b.toFixed(1);
  document.querySelector("#activeSwatch").style.background = labToCss(lab);
  updatePointText();
}

function updatePointText() {
  const point = points[activeZone];
  document.querySelector("#pointPosition").textContent = `X ${round(point.x)}% · Y ${round(point.y)}%`;
}

function setPointFromEvent(zone, event) {
  const bounds = stage.getBoundingClientRect();
  points[zone].x = clamp(((event.clientX - bounds.left) / bounds.width) * 100, 2, 98);
  points[zone].y = clamp(((event.clientY - bounds.top) / bounds.height) * 100, 2, 98);
  renderPoint(zone);
  updatePointText();
  if (hasPhoto) sampleOnePoint(zone);
}

stage.addEventListener("pointerdown", (event) => {
  const marker = event.target.closest(".sample-point");
  if (marker) {
    event.preventDefault();
    draggingZone = marker.dataset.zone;
    selectZone(draggingZone);
    marker.setPointerCapture(event.pointerId);
    return;
  }
  selectZone(activeZone);
  setPointFromEvent(activeZone, event);
});

stage.addEventListener("pointermove", (event) => {
  if (!draggingZone) return;
  setPointFromEvent(draggingZone, event);
});
stage.addEventListener("pointerup", () => { draggingZone = null; });
stage.addEventListener("pointercancel", () => { draggingZone = null; });

document.querySelectorAll(".sample-point").forEach((marker) => {
  marker.addEventListener("keydown", (event) => {
    if (!event.key.startsWith("Arrow")) return;
    event.preventDefault();
    const zone = marker.dataset.zone;
    const step = event.altKey ? 0.2 : 1;
    if (event.key === "ArrowLeft") points[zone].x -= step;
    if (event.key === "ArrowRight") points[zone].x += step;
    if (event.key === "ArrowUp") points[zone].y -= step;
    if (event.key === "ArrowDown") points[zone].y += step;
    points[zone].x = clamp(points[zone].x, 2, 98);
    points[zone].y = clamp(points[zone].y, 2, 98);
    selectZone(zone);
    renderPoint(zone);
    updatePointText();
    if (hasPhoto) sampleOnePoint(zone);
  });
});

document.querySelectorAll("[data-select-zone]").forEach((button) => button.addEventListener("click", () => selectZone(button.dataset.selectZone)));

fileInput.addEventListener("change", () => {
  const file = fileInput.files?.[0];
  const error = document.querySelector("#errorMessage");
  if (!file) return;
  if (!file.type.startsWith("image/")) { error.textContent = "請選擇 JPG、PNG 或 WebP 圖片。"; return; }
  if (file.size > 10 * 1024 * 1024) { error.textContent = "圖片需小於 10 MB。"; return; }
  const reader = new FileReader();
  reader.onload = () => {
    photo.src = reader.result;
    photo.hidden = false;
    demoImage.hidden = true;
    hasPhoto = true;
    document.querySelector("#fileName").textContent = file.name;
    document.querySelector("#photoStatus").textContent = "三點取樣模式";
    error.textContent = "";
    photo.onload = () => Object.keys(points).forEach(sampleOnePoint);
  };
  reader.readAsDataURL(file);
});

function resetPoints() {
  Object.keys(DEFAULT_POINTS).forEach((zone) => Object.assign(points[zone], DEFAULT_POINTS[zone]));
  renderAllPoints();
  selectZone("middle");
  if (hasPhoto) Object.keys(points).forEach(sampleOnePoint);
}

document.querySelector("#resetPoints").addEventListener("click", resetPoints);
document.querySelector("#resetAll").addEventListener("click", () => {
  resetPoints();
  fileInput.value = "";
  photo.removeAttribute("src");
  photo.hidden = true;
  demoImage.hidden = false;
  hasPhoto = false;
  document.querySelector("#fileName").textContent = "尚未選擇照片";
  document.querySelector("#resultGrid").hidden = true;
  document.querySelector("#recipeResult").hidden = true;
  document.querySelector("#emptyResult").hidden = false;
  document.querySelector("#overallResult").hidden = true;
  document.querySelector("#resultSummary").textContent = "設定三個取樣點後，按下「偵測三區顏色並比對」。";
});

["labL", "labA", "labB"].forEach((id) => document.querySelector(`#${id}`).addEventListener("input", () => {
  ZONES[activeZone].lab = {
    l: Number(document.querySelector("#labL").value),
    a: Number(document.querySelector("#labA").value),
    b: Number(document.querySelector("#labB").value),
  };
  document.querySelector("#activeSwatch").style.background = labToCss(ZONES[activeZone].lab);
}));

function prepareCanvas() {
  if (!hasPhoto || !photo.naturalWidth) return false;
  if (canvas.width !== photo.naturalWidth || canvas.height !== photo.naturalHeight) {
    canvas.width = photo.naturalWidth;
    canvas.height = photo.naturalHeight;
    context.drawImage(photo, 0, 0);
  }
  return true;
}

function sampleOnePoint(zone) {
  if (!prepareCanvas()) return;
  const point = points[zone];
  const centerX = Math.round((point.x / 100) * canvas.width);
  const centerY = Math.round((point.y / 100) * canvas.height);
  const radius = Math.max(4, Math.round(Math.min(canvas.width, canvas.height) * 0.025));
  const startX = clamp(centerX - radius, 0, canvas.width - 1);
  const startY = clamp(centerY - radius, 0, canvas.height - 1);
  const width = Math.min(radius * 2 + 1, canvas.width - startX);
  const height = Math.min(radius * 2 + 1, canvas.height - startY);
  const pixels = context.getImageData(startX, startY, width, height).data;
  let red = 0, green = 0, blue = 0, count = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if ((x - radius) ** 2 + (y - radius) ** 2 > radius ** 2) continue;
      const index = (y * width + x) * 4;
      if (pixels[index + 3] > 20) {
        red += pixels[index]; green += pixels[index + 1]; blue += pixels[index + 2]; count += 1;
      }
    }
  }
  if (count) ZONES[zone].lab = rgbToLab(red / count, green / count, blue / count);
  if (zone === activeZone) selectZone(zone);
}

function rgbToLab(red, green, blue) {
  const linear = (value) => { value /= 255; return value > .04045 ? ((value + .055) / 1.055) ** 2.4 : value / 12.92; };
  const r = linear(red), g = linear(green), b = linear(blue);
  let x = (r * .4124 + g * .3576 + b * .1805) / .95047;
  let y = r * .2126 + g * .7152 + b * .0722;
  let z = (r * .0193 + g * .1192 + b * .9505) / 1.08883;
  const pivot = (value) => value > .008856 ? Math.cbrt(value) : 7.787 * value + 16 / 116;
  x = pivot(x); y = pivot(y); z = pivot(z);
  return { l: round(116 * y - 16), a: round(500 * (x - y)), b: round(200 * (y - z)) };
}

function labToCss(lab) {
  let y = (lab.l + 16) / 116, x = lab.a / 500 + y, z = y - lab.b / 200;
  const pivot = (value) => value ** 3 > .008856 ? value ** 3 : (value - 16 / 116) / 7.787;
  x = .95047 * pivot(x); y = pivot(y); z = 1.08883 * pivot(z);
  const gamma = (value) => value > .0031308 ? 1.055 * value ** (1 / 2.4) - .055 : 12.92 * value;
  const channel = (value) => Math.max(0, Math.min(255, Math.round(gamma(value) * 255)));
  return `rgb(${channel(x * 3.2406 + y * -1.5372 + z * -.4986)},${channel(x * -.9689 + y * 1.8758 + z * .0415)},${channel(x * .0557 + y * -.204 + z * 1.057)})`;
}

function matchesFor(lab) {
  return shadeLibrary.map((shade) => ({ ...shade, distance: distance(lab, shade) }))
    .sort((first, second) => first.distance - second.distance).slice(0, 3);
}

function resultCard(zone) {
  const lab = ZONES[zone].lab;
  const matches = matchesFor(lab);
  if (!matches.length) return `<article class="result-card ${zone}"><h4>${ZONES[zone].name}</h4><p>色階資料載入中</p></article>`;
  const best = matches[0];
  return `<article class="result-card ${zone}"><div class="top"><h4>${ZONES[zone].name}</h4><span class="lab">L ${lab.l.toFixed(1)} · a ${lab.a.toFixed(1)} · b ${lab.b.toFixed(1)}</span></div><div class="match"><i class="shade" style="background:${labToCss(best)}"></i><div><small>首選色階</small><strong>${best.name}</strong></div><span class="delta">ΔE<br>${best.distance.toFixed(2)}</span></div><div class="candidates">${matches.slice(1).map((candidate) => `<div class="candidate"><strong>${candidate.name}</strong>ΔE ${candidate.distance.toFixed(2)}</div>`).join("")}</div></article>`;
}

async function loadRecipes() {
  const key = `${document.querySelector("#ceramicBrand").value}|${document.querySelector("#frameworkShade").value}`;
  const filename = DATA_FILES[key];
  if (recipeCache.has(filename)) return recipeCache.get(filename);
  const response = await fetch(filename);
  if (!response.ok) throw new Error(`無法載入 ${filename}`);
  const data = await response.json();
  recipeCache.set(filename, data);
  return data;
}

function findRecipe(data, targetLab) {
  const thickness = Number(document.querySelector("#frameworkThickness").value);
  const space = Number(document.querySelector("#availableSpace").value);
  const field = Object.fromEntries(data.fields.map((name, index) => [name, index]));
  let best = null;
  let bestScore = Infinity;
  for (const row of data.rows) {
    if (row[field.framework_thickness] !== thickness || row[field.available_space] !== space) continue;
    const target = { l: row[field.target_l], a: row[field.target_a], b: row[field.target_b] };
    const score = distance(targetLab, target) + row[field.delta_e] * 0.15;
    if (score < bestScore) { bestScore = score; best = row; }
  }
  return best ? { row: best, field, score: bestScore } : null;
}

function renderRecipe(match, data) {
  const element = document.querySelector("#recipeResult");
  if (!match) {
    element.innerHTML = "<strong>找不到符合目前厚度與空間的配方。</strong>";
    element.hidden = false;
    return;
  }
  const { row, field } = match;
  element.innerHTML = `<div><span>配方資料建議</span><h4>${data.ceramic_brand} · ${data.framework_shade}</h4></div><div class="recipe-grid"><p><small>Wash bake</small><strong>${row[field.wash_bake] || "—"}</strong></p><p><small>Dentin</small><strong>${row[field.dentin_recipe] || "—"}</strong><em>${row[field.dentin_ratio] || ""}</em></p><p><small>Enamel</small><strong>${row[field.enamel_recipe] || "—"}</strong></p><p><small>資料 ΔE</small><strong>${Number(row[field.delta_e]).toFixed(2)}</strong></p></div><small class="recipe-note">依目標色、支架厚度與可用空間搜尋資料庫；仍需由牙技師複核。</small>`;
  element.hidden = false;
}

document.querySelector("#analyzeButton").addEventListener("click", async () => {
  const button = document.querySelector("#analyzeButton");
  button.disabled = true;
  button.querySelector("span:first-child").textContent = "正在比對資料…";
  try {
    if (hasPhoto) Object.keys(points).forEach(sampleOnePoint);
    if (!shadeLibrary.length) await loadShadeLibrary();
    const resultGrid = document.querySelector("#resultGrid");
    resultGrid.innerHTML = Object.keys(ZONES).map(resultCard).join("");
    resultGrid.hidden = false;
    document.querySelector("#emptyResult").hidden = true;
    const average = Object.values(ZONES).reduce((sum, zone) => ({ l: sum.l + zone.lab.l / 3, a: sum.a + zone.lab.a / 3, b: sum.b + zone.lab.b / 3 }), { l: 0, a: 0, b: 0 });
    const overall = matchesFor(average)[0];
    const overallElement = document.querySelector("#overallResult");
    overallElement.hidden = false;
    overallElement.querySelector("strong").textContent = overall?.name || "—";
    const recipeData = await loadRecipes();
    renderRecipe(findRecipe(recipeData, average), recipeData);
    document.querySelector("#resultSummary").textContent = hasPhoto ? "三個取樣點已完成 L*a*b*、VITA 色階與配方比對。" : "目前使用範例數值完成資料比對。";
    document.querySelector(".results-card").scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (error) {
    document.querySelector("#errorMessage").textContent = `資料讀取失敗：${error.message}`;
  } finally {
    button.disabled = false;
    button.querySelector("span:first-child").textContent = "偵測三區顏色並比對";
  }
});

renderAllPoints();
selectZone("middle");
loadShadeLibrary();

// Portal navigation and local-only workflow
const portalViews = ["homeView", "samplingView", "projectsView", "feedbackView", "analysisView"];
function showPortalView(id) {
  portalViews.forEach((viewId) => { document.getElementById(viewId).hidden = viewId !== id; });
  const activeMap = { projectsView: "projects", samplingView: "sampling", analysisView: "analysis", feedbackView: "feedback" };
  document.querySelectorAll(".global-links [data-open]").forEach((item) => item.classList.toggle("active", item.dataset.open === activeMap[id]));
  window.scrollTo({ top: 0, behavior: "smooth" });
}

document.querySelectorAll("[data-open]").forEach((button) => {
  button.addEventListener("click", () => {
    const target = button.dataset.open;
    if (target === "home") showPortalView("homeView");
    if (target === "sampling") showPortalView("samplingView");
    if (target === "analysis") showPortalView("analysisView");
    if (target === "projects") { showPortalView("projectsView"); renderProjects(); }
    if (target === "feedback") showPortalView("feedbackView");
  });
});
document.querySelector("#navReset").addEventListener("click", () => showPortalView("homeView"));
document.querySelectorAll(".back-home").forEach((button) => button.addEventListener("click", () => showPortalView("homeView")));
document.querySelector("#skipCalibration").addEventListener("click", () => showPortalView("analysisView"));
document.querySelectorAll(".mode-switch button").forEach((button) => button.addEventListener("click", () => {
  document.querySelectorAll(".mode-switch button").forEach((item) => item.classList.toggle("selected", item === button));
}));

function forwardPhoto(sourceInput) {
  const chosen = sourceInput.files?.[0];
  if (!chosen) return;
  try {
    const transfer = new DataTransfer();
    transfer.items.add(chosen);
    fileInput.files = transfer.files;
    fileInput.dispatchEvent(new Event("change", { bubbles: true }));
  } catch (error) {
    document.querySelector("#errorMessage").textContent = "瀏覽器無法轉交照片，請在分析頁再按一次上傳照片。";
  }
  showPortalView("analysisView");
}
document.querySelector("#cameraInput").addEventListener("change", (event) => forwardPhoto(event.currentTarget));
document.querySelector("#albumInput").addEventListener("change", (event) => forwardPhoto(event.currentTarget));

function getProjects() {
  try { return JSON.parse(localStorage.getItem("dentshade-projects") || "[]"); }
  catch (error) { return []; }
}
function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char]);
}
function renderProjects() {
  const list = document.querySelector("#projectList");
  const projects = getProjects();
  list.innerHTML = projects.length ? projects.map((code) => `<li>${escapeHtml(code)}</li>`).join("") : "<li>尚未建立專案</li>";
}
document.querySelector("#saveProject").addEventListener("click", () => {
  const input = document.querySelector("#projectCode");
  const code = input.value.trim();
  if (!code) return;
  const projects = getProjects();
  if (!projects.includes(code)) projects.unshift(code);
  localStorage.setItem("dentshade-projects", JSON.stringify(projects.slice(0, 30)));
  input.value = "";
  renderProjects();
});
document.querySelector("#saveFeedback").addEventListener("click", () => {
  const value = document.querySelector("#feedbackText").value.trim();
  localStorage.setItem("dentshade-feedback", value);
  document.querySelector("#feedbackStatus").textContent = value ? "已儲存在這台裝置。" : "備註已清除。";
});
document.querySelector("#feedbackText").value = localStorage.getItem("dentshade-feedback") || "";
