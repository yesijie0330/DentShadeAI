const ZONES = {
  cervical: { name: "頸部", color: "#ffb56e", lab: { l: 67.4, a: 3.2, b: 17.7 } },
  middle: { name: "中部", color: "#65c9a8", lab: { l: 72.2, a: 1.5, b: 15.0 } },
  incisal: { name: "切端", color: "#8fc8ff", lab: { l: 76.1, a: -0.7, b: 12.1 } },
};

const DEFAULT_REGIONS = {
  cervical: { x: 38, y: 22, w: 24, h: 16 },
  middle: { x: 36, y: 42, w: 28, h: 18 },
  incisal: { x: 38, y: 64, w: 24, h: 14 },
};

const SHADES = [
  ["A1", 75.0, -1.4, 13.2], ["A2", 72.1, 1.4, 15.3], ["A3", 68.0, 3.1, 16.4],
  ["A3.5", 64.4, 4.2, 17.5], ["A4", 58.3, 5.3, 18.0], ["B1", 78.3, -3.0, 12.5],
  ["B2", 74.0, -1.0, 17.0], ["B3", 69.5, 1.0, 21.2], ["B4", 64.0, 2.0, 23.0],
  ["C1", 70.2, 0.1, 11.0], ["C2", 65.8, 0.5, 13.0], ["C3", 60.2, 1.0, 14.0],
  ["C4", 55.5, 1.5, 15.0], ["D2", 72.5, 1.6, 14.0], ["D3", 67.5, 2.5, 16.0],
  ["D4", 62.5, 3.5, 17.5],
].map(([name, l, a, b]) => ({ name, l, a, b }));

const stage = document.querySelector("#photoStage");
const photo = document.querySelector("#photo");
const demoImage = document.querySelector("#demoImage");
const fileInput = document.querySelector("#fileInput");
const canvas = document.querySelector("#sampleCanvas");
const context = canvas.getContext("2d", { willReadFrequently: true });
const regions = structuredClone(DEFAULT_REGIONS);
let activeZone = "middle";
let pointerAction = null;
let hasPhoto = false;

function clamp(value, min, max) { return Math.min(max, Math.max(min, value)); }
function round(value) { return Math.round(value * 10) / 10; }

function renderRegion(zone) {
  const element = document.querySelector(`#region-${zone}`);
  const region = regions[zone];
  element.style.left = `${region.x}%`;
  element.style.top = `${region.y}%`;
  element.style.width = `${region.w}%`;
  element.style.height = `${region.h}%`;
}

function renderAllRegions() { Object.keys(regions).forEach(renderRegion); }

function selectZone(zone) {
  activeZone = zone;
  document.querySelectorAll(".sample-region").forEach((item) => item.classList.toggle("selected", item.dataset.zone === zone));
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
  updatePositionText();
}

function updatePositionText() {
  const region = regions[activeZone];
  document.querySelector("#regionPosition").textContent = `X ${round(region.x)}% · Y ${round(region.y)}% · ${round(region.w)} × ${round(region.h)}%`;
}

function pointerStart(event) {
  const regionElement = event.target.closest(".sample-region");
  if (!regionElement) return;
  event.preventDefault();
  const zone = regionElement.dataset.zone;
  selectZone(zone);
  const bounds = stage.getBoundingClientRect();
  const region = regions[zone];
  pointerAction = {
    zone,
    mode: event.target.classList.contains("resize-handle") ? "resize" : "move",
    startX: event.clientX,
    startY: event.clientY,
    bounds,
    original: { ...region },
  };
  regionElement.setPointerCapture(event.pointerId);
}

function pointerMove(event) {
  if (!pointerAction) return;
  const { zone, mode, startX, startY, bounds, original } = pointerAction;
  const dx = ((event.clientX - startX) / bounds.width) * 100;
  const dy = ((event.clientY - startY) / bounds.height) * 100;
  const region = regions[zone];
  if (mode === "move") {
    region.x = clamp(original.x + dx, 0, 100 - region.w);
    region.y = clamp(original.y + dy, 0, 100 - region.h);
  } else {
    region.w = clamp(original.w + dx, 7, 100 - region.x);
    region.h = clamp(original.h + dy, 7, 100 - region.y);
  }
  renderRegion(zone);
  updatePositionText();
}

function pointerEnd() { pointerAction = null; }

function keyboardMove(event) {
  const regionElement = event.target.closest(".sample-region");
  if (!regionElement || !event.key.startsWith("Arrow")) return;
  event.preventDefault();
  const zone = regionElement.dataset.zone;
  const region = regions[zone];
  selectZone(zone);
  const step = event.altKey ? 0.2 : 1;
  if (event.shiftKey) {
    if (event.key === "ArrowRight") region.w = clamp(region.w + step, 7, 100 - region.x);
    if (event.key === "ArrowLeft") region.w = clamp(region.w - step, 7, 100 - region.x);
    if (event.key === "ArrowDown") region.h = clamp(region.h + step, 7, 100 - region.y);
    if (event.key === "ArrowUp") region.h = clamp(region.h - step, 7, 100 - region.y);
  } else {
    if (event.key === "ArrowRight") region.x = clamp(region.x + step, 0, 100 - region.w);
    if (event.key === "ArrowLeft") region.x = clamp(region.x - step, 0, 100 - region.w);
    if (event.key === "ArrowDown") region.y = clamp(region.y + step, 0, 100 - region.h);
    if (event.key === "ArrowUp") region.y = clamp(region.y - step, 0, 100 - region.h);
  }
  renderRegion(zone);
  updatePositionText();
}

stage.addEventListener("pointerdown", pointerStart);
stage.addEventListener("pointermove", pointerMove);
stage.addEventListener("pointerup", pointerEnd);
stage.addEventListener("pointercancel", pointerEnd);
stage.addEventListener("keydown", keyboardMove);
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
    document.querySelector("#photoStatus").textContent = "三區自由模式";
    error.textContent = "";
  };
  reader.readAsDataURL(file);
});

function resetRegions() {
  Object.keys(DEFAULT_REGIONS).forEach((zone) => Object.assign(regions[zone], DEFAULT_REGIONS[zone]));
  renderAllRegions();
  selectZone("middle");
}

document.querySelector("#resetRegions").addEventListener("click", resetRegions);
document.querySelector("#resetAll").addEventListener("click", () => {
  resetRegions();
  fileInput.value = "";
  photo.removeAttribute("src");
  photo.hidden = true;
  demoImage.hidden = false;
  hasPhoto = false;
  Object.keys(ZONES).forEach((zone) => Object.assign(ZONES[zone].lab, {
    cervical: { l: 67.4, a: 3.2, b: 17.7 }, middle: { l: 72.2, a: 1.5, b: 15 }, incisal: { l: 76.1, a: -0.7, b: 12.1 },
  }[zone]));
  document.querySelector("#fileName").textContent = "尚未選擇照片";
  document.querySelector("#photoStatus").textContent = "三區自由模式";
  document.querySelector("#resultGrid").hidden = true;
  document.querySelector("#emptyResult").hidden = false;
  document.querySelector("#overallResult").hidden = true;
  document.querySelector("#resultSummary").textContent = "調整三區位置後，按下「偵測三區顏色並比對」。";
  selectZone("middle");
});

["labL", "labA", "labB"].forEach((id) => document.querySelector(`#${id}`).addEventListener("input", () => {
  ZONES[activeZone].lab = {
    l: Number(document.querySelector("#labL").value),
    a: Number(document.querySelector("#labA").value),
    b: Number(document.querySelector("#labB").value),
  };
  document.querySelector("#activeSwatch").style.background = labToCss(ZONES[activeZone].lab);
}));

function samplePhoto() {
  if (!hasPhoto || !photo.naturalWidth) return;
  canvas.width = photo.naturalWidth;
  canvas.height = photo.naturalHeight;
  context.drawImage(photo, 0, 0);
  Object.keys(regions).forEach((zone) => {
    const region = regions[zone];
    const x = Math.round((region.x / 100) * canvas.width);
    const y = Math.round((region.y / 100) * canvas.height);
    const w = Math.max(1, Math.round((region.w / 100) * canvas.width));
    const h = Math.max(1, Math.round((region.h / 100) * canvas.height));
    const pixels = context.getImageData(x, y, Math.min(w, canvas.width - x), Math.min(h, canvas.height - y)).data;
    let red = 0, green = 0, blue = 0, count = 0;
    const stride = Math.max(4, Math.floor(pixels.length / 180000) * 4);
    for (let index = 0; index < pixels.length; index += stride) {
      const alpha = pixels[index + 3];
      if (alpha > 20) { red += pixels[index]; green += pixels[index + 1]; blue += pixels[index + 2]; count++; }
    }
    if (count) ZONES[zone].lab = rgbToLab(red / count, green / count, blue / count);
  });
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
  return SHADES.map((shade) => ({ ...shade, distance: Math.sqrt((lab.l - shade.l) ** 2 + (lab.a - shade.a) ** 2 + (lab.b - shade.b) ** 2) }))
    .sort((first, second) => first.distance - second.distance).slice(0, 3);
}

function resultCard(zone) {
  const lab = ZONES[zone].lab;
  const matches = matchesFor(lab);
  const best = matches[0];
  return `<article class="result-card ${zone}"><div class="top"><h4>${ZONES[zone].name}</h4><span class="lab">L ${lab.l.toFixed(1)} · a ${lab.a.toFixed(1)} · b ${lab.b.toFixed(1)}</span></div><div class="match"><i class="shade" style="background:${labToCss(best)}"></i><div><small>首選色階</small><strong>${best.name}</strong></div><span class="delta">ΔE<br>${best.distance.toFixed(2)}</span></div><div class="candidates">${matches.slice(1).map((candidate) => `<div class="candidate"><strong>${candidate.name}</strong>ΔE ${candidate.distance.toFixed(2)}</div>`).join("")}</div></article>`;
}

document.querySelector("#analyzeButton").addEventListener("click", () => {
  samplePhoto();
  const resultGrid = document.querySelector("#resultGrid");
  resultGrid.innerHTML = Object.keys(ZONES).map(resultCard).join("");
  resultGrid.hidden = false;
  document.querySelector("#emptyResult").hidden = true;
  const average = Object.values(ZONES).reduce((sum, zone) => ({ l: sum.l + zone.lab.l / 3, a: sum.a + zone.lab.a / 3, b: sum.b + zone.lab.b / 3 }), { l: 0, a: 0, b: 0 });
  const overall = matchesFor(average)[0];
  const overallElement = document.querySelector("#overallResult");
  overallElement.hidden = false;
  overallElement.querySelector("strong").textContent = overall.name;
  document.querySelector("#resultSummary").textContent = hasPhoto ? "已依三個自訂範圍讀取照片平均色彩。" : "目前使用範例數值；上傳照片後可讀取自訂範圍。";
  selectZone(activeZone);
  document.querySelector(".results-card").scrollIntoView({ behavior: "smooth", block: "start" });
});

renderAllRegions();
selectZone("middle");
