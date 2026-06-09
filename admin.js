let activeZoneFilter = "ALL";
let alarmContext;
let alarmTimer;

function initAdmin() {
  if (!document.body.classList.contains("admin-body")) return;
  initLogin();
  initAdminNavigation();
  setupAddressSelects(document);
  initAdminForms();
  initClock();
  renderDashboard();
  setInterval(renderDashboard, 30000);
}

function initLogin() {
  const login = document.querySelector("#adminLogin");
  const app = document.querySelector("#adminApp");
  const form = document.querySelector("#loginForm");
  const isLoggedIn = sessionStorage.getItem("vsafe:admin") === "1";
  if (isLoggedIn) {
    login.classList.add("hidden");
    app.classList.remove("hidden");
  }
  form?.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(form);
    if (data.get("user") === "14171" && data.get("password") === "14171") {
      sessionStorage.setItem("vsafe:admin", "1");
      login.classList.add("hidden");
      app.classList.remove("hidden");
      renderDashboard();
    } else {
      alert("User หรือรหัสผ่านไม่ถูกต้อง");
    }
  });
}

function initAdminNavigation() {
  const app = document.querySelector("#adminApp");
  if (localStorage.getItem("vsafe:adminSidebarCollapsed") === "1") app?.classList.add("sidebar-collapsed");
  document.querySelector("#sidebarToggle")?.addEventListener("click", () => {
    app?.classList.toggle("sidebar-collapsed");
    localStorage.setItem("vsafe:adminSidebarCollapsed", app?.classList.contains("sidebar-collapsed") ? "1" : "0");
  });

  document.querySelectorAll(".side-nav [data-admin-view]").forEach((button) => {
    button.addEventListener("click", () => {
      const view = button.dataset.adminView;
      document.querySelectorAll(".side-nav button").forEach((item) => item.classList.toggle("active", item === button));
      document.querySelectorAll(".admin-view").forEach((item) => item.classList.remove("active"));
      document.querySelector(`#admin-view-${view}`)?.classList.add("active");
      updateAdminMode(view);
      if (view === "alerts") renderAlertFeed();
      if (view === "caseManagers") renderCaseManagerTable();
      if (view === "patients") renderAdminPatientTable();
      if (view === "dashboard") renderDashboard();
    });
  });

  document.querySelector(".command-banner [data-admin-view='alerts']")?.addEventListener("click", () => {
    document.querySelector(".side-nav [data-admin-view='alerts']")?.click();
  });
  document.querySelector(".monitor-link[data-admin-view='alerts']")?.addEventListener("click", () => {
    document.querySelector(".side-nav [data-admin-view='alerts']")?.click();
  });

  document.querySelectorAll(".filter-btn").forEach((button) => {
    button.addEventListener("click", () => {
      activeZoneFilter = button.dataset.zone;
      document.querySelectorAll(".filter-btn").forEach((item) => item.classList.toggle("active", item === button));
      renderPriorityTable();
    });
  });
  document.querySelector("#prioritySearch")?.addEventListener("input", renderPriorityTable);
  document.querySelector("#ackSos")?.addEventListener("click", acknowledgeSos);
  document.querySelector("[data-close-admin-dialog]")?.addEventListener("click", () => document.querySelector("#adminDetailDialog")?.close());
  updateAdminMode(document.querySelector(".admin-view.active")?.id?.replace("admin-view-", "") || "dashboard");
}

function updateAdminMode(view) {
  document.querySelector("#adminApp")?.classList.toggle("dashboard-mode", view === "dashboard");
}

function initClock() {
  const tick = () => {
    const now = new Date();
    const dateTarget = document.querySelector("#thaiDate");
    const timeTarget = document.querySelector("#thaiTime");
    if (dateTarget) {
      dateTarget.textContent = new Intl.DateTimeFormat("th-TH-u-ca-buddhist", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric"
      }).format(now);
    }
    if (timeTarget) timeTarget.textContent = now.toLocaleTimeString("th-TH", { hour12: false });
    const dashTime = document.querySelector("#dashTime");
    const dashDate = document.querySelector("#dashDate");
    const dashWeekday = document.querySelector("#dashWeekday");
    const dashUpdated = document.querySelector("#dashUpdated");
    if (dashTime) dashTime.textContent = now.toLocaleTimeString("th-TH", { hour12: false });
    if (dashDate) dashDate.textContent = new Intl.DateTimeFormat("th-TH-u-ca-buddhist", { day: "numeric", month: "long", year: "numeric" }).format(now);
    if (dashWeekday) dashWeekday.textContent = new Intl.DateTimeFormat("th-TH", { weekday: "long" }).format(now);
    if (dashUpdated) dashUpdated.textContent = now.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", hour12: false });
  };
  tick();
  setInterval(tick, 1000);
}

function initAdminForms() {
  document.querySelector("#openCaseManagerForm")?.addEventListener("click", () => showCaseManagerForm());
  document.querySelector("#cancelCaseManagerForm")?.addEventListener("click", hideCaseManagerForm);
  document.querySelector("#openPatientForm")?.addEventListener("click", () => showPatientForm());
  document.querySelector("#cancelPatientForm")?.addEventListener("click", hidePatientForm);

  document.querySelector("#caseManagerForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const payload = Object.fromEntries(new FormData(form).entries());
    const caseManagers = storage.get("caseManagers", []);
    if (payload.id) {
      const index = caseManagers.findIndex((item) => item.id === payload.id);
      if (index >= 0) caseManagers[index] = { ...caseManagers[index], ...payload, updatedAt: new Date().toISOString() };
    } else {
      payload.id = `CM-${Date.now()}`;
      caseManagers.push({ ...payload, createdAt: new Date().toISOString() });
    }
    storage.set("caseManagers", caseManagers);
    await apiPost("saveCaseManager", payload);
    alert("บันทึกข้อมูลโรงพยาบาลแล้ว");
    form.reset();
    hideCaseManagerForm();
    setupAddressSelects(document);
    renderCaseManagerTable();
    renderDashboard();
  });

  document.querySelector("#patientForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const payload = Object.fromEntries(new FormData(form).entries());
    const editingKey = payload.editingKey;
    delete payload.editingKey;
    if (!payload.patientCode && payload.hn) payload.patientCode = `${payload.hn}SMIV`;
    payload.latlng = calculateLatLngFromAddress(payload);
    payload.baselineScore = Number(payload.baselineScore || 0);
    payload.status = statusByZone(classifyRisk(payload.baselineScore));
    const patients = storage.get("patients", []);
    const index = patients.findIndex((patient) => patient.patientCode === (editingKey || payload.patientCode));
    if (index >= 0) patients[index] = { ...patients[index], ...payload, updatedAt: new Date().toISOString() };
    else patients.push({ ...payload, createdAt: new Date().toISOString() });
    storage.set("patients", patients);
    await apiPost("savePatient", payload);
    alert("บันทึกผู้ป่วยแล้ว");
    form.reset();
    hidePatientForm();
    setupAddressSelects(document);
    renderAdminPatientTable();
    renderDashboard();
  });

  initPatientAddressAutomation();
}

function showCaseManagerForm(cm = null) {
  const card = document.querySelector("#caseManagerFormCard");
  const form = document.querySelector("#caseManagerForm");
  const title = document.querySelector("#caseManagerFormTitle");
  if (!card || !form) return;
  form.reset();
  if (title) title.textContent = cm ? "แก้ไขข้อมูลโรงพยาบาลในพื้นที่" : "ลงทะเบียนโรงพยาบาลในพื้นที่";
  
  if (form.elements.id) form.elements.id.value = cm?.id || "";
  
  if (cm) {
    if (form.elements.workplace) form.elements.workplace.value = cm.workplace || "";
    if (form.elements.phone) form.elements.phone.value = cm.phone || "";
    // ฟิลด์ที่ซ่อนไว้เพื่อป้องกันข้อมูลเดิมสูญหาย
    if (form.elements.prefix) form.elements.prefix.value = cm.prefix || "";
    if (form.elements.fullName) form.elements.fullName.value = cm.fullName || "-";
    if (form.elements.position) form.elements.position.value = cm.position || "-";
    setAddressFormValues(form, cm);
  } else {
    setupAddressSelects(document);
  }
  card.classList.remove("hidden");
  card.classList.add("form-reveal");
  card.scrollIntoView({ behavior: "smooth", block: "start" });
}

function hideCaseManagerForm() {
  document.querySelector("#caseManagerForm")?.reset();
  document.querySelector("#caseManagerFormCard")?.classList.add("hidden");
}

function showPatientForm(patient = null) {
  const card = document.querySelector("#patientFormCard");
  const form = document.querySelector("#patientForm");
  if (!card || !form) return;
  form.reset();
  document.querySelector("#patientFormTitle").textContent = patient ? "แก้ไขข้อมูลผู้ป่วย" : "ลงทะเบียนผู้ป่วย";
  form.elements.editingKey.value = patient?.patientCode || "";
  if (patient) {
    [
      "patientCode",
      "hn",
      "prefix",
      "fullName",
      "gender",
      "dob",
      "violenceHistoryDate",
      "substanceUse",
      "substanceDetail",
      "dx",
      "dischargeDate",
      "baselineScore",
      "zipcode",
      "addressLine",
      "latlng"
    ].forEach((name) => {
      if (form.elements[name]) form.elements[name].value = patient[name] || "";
    });
    setAddressFormValues(form, patient);
    updatePatientLatLng(form);
  } else {
    setupAddressSelects(document);
    updatePatientLatLng(form);
  }
  card.classList.remove("hidden");
  card.classList.add("form-reveal");
  card.scrollIntoView({ behavior: "smooth", block: "start" });
}

function hidePatientForm() {
  document.querySelector("#patientForm")?.reset();
  document.querySelector("#patientFormCard")?.classList.add("hidden");
}

function setAddressFormValues(form, payload) {
  if (!form || !payload) return;
  if (form.elements.province && payload.province) {
    form.elements.province.value = payload.province;
    form.elements.province.dispatchEvent(new Event("change", { bubbles: true }));
  }
  if (form.elements.district && payload.district) {
    form.elements.district.value = payload.district;
    form.elements.district.dispatchEvent(new Event("change", { bubbles: true }));
  }
  if (form.elements.subdistrict && payload.subdistrict) {
    form.elements.subdistrict.value = payload.subdistrict;
    form.elements.subdistrict.dispatchEvent(new Event("change", { bubbles: true }));
  }
  if (form.elements.zipcode && payload.zipcode) form.elements.zipcode.value = payload.zipcode;
}

function initPatientAddressAutomation() {
  const form = document.querySelector("#patientForm");
  if (!form) return;
  const hnInput = form.elements.hn;
  const codeInput = form.elements.patientCode;
  hnInput?.addEventListener("input", () => {
    if (codeInput && !codeInput.dataset.touched) codeInput.value = hnInput.value ? `${hnInput.value.trim()}SMIV` : "";
  });
  codeInput?.addEventListener("input", () => {
    codeInput.dataset.touched = "1";
  });
  ["province", "district", "subdistrict", "addressLine"].forEach((name) => {
    form.elements[name]?.addEventListener("input", () => updatePatientLatLng(form));
    form.elements[name]?.addEventListener("change", () => updatePatientLatLng(form));
  });
  updatePatientLatLng(form);
}

function updatePatientLatLng(form) {
  const latlngField = form.elements.latlng;
  if (!latlngField) return;
  latlngField.value = calculateLatLngFromAddress(Object.fromEntries(new FormData(form).entries()));
}

function calculateLatLngFromAddress(payload) {
  const districtCoords = {
    "เมืองนครสวรรค์": [15.7047, 100.1372],
    "โกรกพระ": [15.5559, 100.0712],
    "ชุมแสง": [15.8918, 100.3079],
    "หนองบัว": [15.8645, 100.5869],
    "บรรพตพิสัย": [15.9362, 99.9815],
    "เก้าเลี้ยว": [15.8506, 100.0794],
    "ตาคลี": [15.2633, 100.3438],
    "ท่าตะโก": [15.6422, 100.4789],
    "ไพศาลี": [15.6008, 100.6551],
    "พยุหะคีรี": [15.4552, 100.1358],
    "ลาดยาว": [15.7511, 99.7897],
    "ตากฟ้า": [15.3499, 100.4956],
    "แม่วงก์": [15.7811, 99.5205],
    "แม่เปิน": [15.6578, 99.4687],
    "ชุมตาบง": [15.6333, 99.5534]
  };
  const base = districtCoords[payload.district] || [15.7047, 100.1372];
  const source = `${payload.addressLine || ""}${payload.subdistrict || ""}${payload.district || ""}`;
  const hash = [...source].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const lat = base[0] + ((hash % 23) - 11) / 1000;
  const lng = base[1] + ((hash % 29) - 14) / 1000;
  return `${lat.toFixed(5)},${lng.toFixed(5)}`;
}

function statusByZone(zone) {
  if (zone === "RED") return "รอการติดต่อ";
  if (zone === "YELLOW") return "เฝ้าระวัง";
  return "ติดตามต่อเนื่อง";
}

function patientCurrentRows() {
  const patients = storage.get("patients", []);
  const assessments = storage.get("assessments", []);
  return patients.map((patient) => {
    const latest = assessments
      .filter((assessment) => assessment.patientCode === patient.patientCode)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
    const score = Number(latest?.score ?? patient.lastScore ?? patient.baselineScore ?? 0);
    const zone = latest?.zone || patient.lastZone || classifyRisk(score);
    return {
      ...patient,
      score,
      zone,
      status: latest?.status || patient.status || statusByZone(zone),
      updatedAt: latest?.createdAt || patient.updatedAt || patient.createdAt || patient.dischargeDate || new Date().toISOString()
    };
  });
}

function renderDashboard() {
  if (!document.body.classList.contains("admin-body")) return;
  const rows = patientCurrentRows();
  renderOverview(rows);
  renderTrend(rows);
  renderMap(rows);
  renderPriorityTable();
  renderAlertFeed();
  showUnacknowledgedSos();
}

function renderOverview(rows) {
  const container = document.querySelector("#overviewCards");
  if (!container) return;
  const counts = countZones(rows);
  const cards = [
    ["ผู้ป่วย RED ZONE", counts.RED, "ต้องดำเนินการเร่งด่วน", "red", "!"],
    ["ผู้ป่วย YELLOW ZONE", counts.YELLOW, "เฝ้าระวังใกล้ชิด", "yellow", "!"],
    ["ผู้ป่วย GREEN ZONE", counts.GREEN, "ความเสี่ยงต่ำ", "green", "✓"],
    ["ผู้ป่วยทั้งหมดในระบบ", rows.length, "ราย", "", "●"]
  ];
  container.innerHTML = cards
    .map(([label, value, desc, cls, icon]) => `<article class="metric-card ${cls}"><i>${icon}</i><span>${label}</span><strong>${value}</strong><small>${desc}</small></article>`)
    .join("");
}

function countZones(rows) {
  return rows.reduce(
    (acc, row) => {
      acc[row.zone] = (acc[row.zone] || 0) + 1;
      return acc;
    },
    { GREEN: 0, YELLOW: 0, RED: 0 }
  );
}

function renderTrend(rows) {
  const canvas = document.querySelector("#trendCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const days = [...Array(7)].map((_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    date.setHours(0, 0, 0, 0);
    return date;
  });
  const assessments = storage.get("assessments", []);
  const series = { GREEN: [], YELLOW: [], RED: [] };
  days.forEach((day, index) => {
    const end = new Date(day.getTime() + 86400000);
    const dayAssessments = assessments.filter((item) => {
      const created = new Date(item.createdAt);
      return created >= day && created < end;
    });
    const fallback = index === days.length - 1 ? rows : [];
    ["GREEN", "YELLOW", "RED"].forEach((zone) => {
      const count = dayAssessments.length
        ? dayAssessments.filter((item) => item.zone === zone).length
        : Math.max(0, fallback.filter((item) => item.zone === zone).length - (6 - index));
      series[zone].push(count);
    });
  });

  const ratio = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  if (rect.width && rect.height && (canvas.width !== Math.round(rect.width * ratio) || canvas.height !== Math.round(rect.height * ratio))) {
    canvas.width = Math.round(rect.width * ratio);
    canvas.height = Math.round(rect.height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  } else {
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  }
  const chart = { width: rect.width || canvas.width / ratio, height: rect.height || canvas.height / ratio };
  ctx.clearRect(0, 0, chart.width, chart.height);
  drawChartGrid(ctx, chart, days);
  drawLine(ctx, chart, series.RED, "#ff4b55", "RED");
  drawLine(ctx, chart, series.YELLOW, "#f6c84b", "YELLOW");
  drawLine(ctx, chart, series.GREEN, "#35d47a", "GREEN");
}

function drawChartGrid(ctx, canvas, days) {
  const pad = { left: 44, right: 24, top: 28, bottom: 42 };
  ctx.strokeStyle = "rgba(159, 190, 213, 0.14)";
  ctx.lineWidth = 1;
  ctx.font = "12px Prompt, Tahoma";
  ctx.fillStyle = "rgba(214, 231, 244, 0.68)";
  for (let i = 0; i <= 4; i += 1) {
    const y = pad.top + ((canvas.height - pad.top - pad.bottom) / 4) * i;
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(canvas.width - pad.right, y);
    ctx.stroke();
  }
  days.forEach((day, index) => {
    const x = pad.left + ((canvas.width - pad.left - pad.right) / 6) * index;
    ctx.fillText(day.toLocaleDateString("th-TH", { day: "numeric", month: "short" }), x - 28, canvas.height - 12);
  });
}

function drawLine(ctx, canvas, values, color, label) {
  const pad = { left: 44, right: 24, top: 28, bottom: 42 };
  const max = Math.max(5, ...values);
  const points = values.map((value, index) => ({
    x: pad.left + ((canvas.width - pad.left - pad.right) / 6) * index,
    y: canvas.height - pad.bottom - (value / max) * (canvas.height - pad.top - pad.bottom),
    value
  }));
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = 12;
  ctx.strokeStyle = color;
  ctx.lineWidth = 3.5;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  points.forEach((point, index) => {
    if (index === 0) {
      ctx.moveTo(point.x, point.y);
      return;
    }
    const previous = points[index - 1];
    const cp1x = previous.x + (point.x - previous.x) * 0.48;
    const cp2x = point.x - (point.x - previous.x) * 0.48;
    ctx.bezierCurveTo(cp1x, previous.y, cp2x, point.y, point.x, point.y);
  });
  ctx.stroke();
  ctx.restore();
  ctx.fillStyle = color;
  points.forEach((point) => {
    ctx.beginPath();
    ctx.arc(point.x, point.y, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#061b2d";
    ctx.stroke();
  });
  const legendIndex = { GREEN: 0, YELLOW: 1, RED: 2 }[label];
  ctx.font = "600 12px Prompt, Tahoma";
  ctx.fillStyle = color;
  ctx.fillText(label, canvas.width - 230 + legendIndex * 76, 22);
}

function renderMap(rows) {
  const map = document.querySelector("#riskMap");
  if (!map) return;
  const points = rows.map((row) => ({ ...row, coords: parseLatLng(row.latlng) })).filter((row) => row.coords);
  const center = points.length
    ? [
        points.reduce((sum, item) => sum + item.coords[0], 0) / points.length,
        points.reduce((sum, item) => sum + item.coords[1], 0) / points.length
      ]
    : [15.7047, 100.1372];
  const zoom = 9;
  const width = map.clientWidth || 640;
  const height = map.clientHeight || 360;
  const tileSize = 256;
  const centerPixel = mercatorPixel(center[0], center[1], zoom);
  const startX = centerPixel.x - width / 2;
  const startY = centerPixel.y - height / 2;
  const firstTileX = Math.floor(startX / tileSize);
  const firstTileY = Math.floor(startY / tileSize);
  const lastTileX = Math.floor((startX + width) / tileSize);
  const lastTileY = Math.floor((startY + height) / tileSize);
  let html = `<div class="osm-tiles">`;
  for (let x = firstTileX; x <= lastTileX; x += 1) {
    for (let y = firstTileY; y <= lastTileY; y += 1) {
      const left = Math.round(x * tileSize - startX);
      const top = Math.round(y * tileSize - startY);
      html += `<img src="https://tile.openstreetmap.org/${zoom}/${x}/${y}.png" style="left:${left}px;top:${top}px" alt="" loading="lazy" />`;
    }
  }
  html += `</div>`;
  html += points
    .map((row) => {
      const pixel = mercatorPixel(row.coords[0], row.coords[1], zoom);
      const left = pixel.x - startX;
      const top = pixel.y - startY;
      return `<button class="real-map-pin ${zoneClass(row.zone)}" style="left:${left}px;top:${top}px" data-view-patient="${escapeHtml(row.patientCode)}" title="HN ${escapeHtml(row.hn)} ${escapeHtml(row.district)}"><span><b>${row.score}</b></span><small>${escapeHtml(row.district || "")}</small></button>`;
    })
    .join("");
  html += `<a class="osm-credit" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap</a>`;
  map.innerHTML = html;
  map.querySelectorAll("[data-view-patient]").forEach((button) => {
    button.addEventListener("click", () => showPatientDetail(button.dataset.viewPatient));
  });
}

function parseLatLng(value = "") {
  const [lat, lng] = String(value).split(",").map((item) => Number(item.trim()));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return [lat, lng];
}

function mercatorPixel(lat, lng, zoom) {
  const sin = Math.sin((lat * Math.PI) / 180);
  const scale = 256 * 2 ** zoom;
  return {
    x: ((lng + 180) / 360) * scale,
    y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * scale
  };
}

function getCriticalPatient() {
  return patientCurrentRows().sort((a, b) => zoneWeight(b.zone) - zoneWeight(a.zone) || b.score - a.score)[0];
}

function renderPriorityTable() {
  const tbody = document.querySelector("#priorityRows");
  if (!tbody) return;
  const search = document.querySelector("#prioritySearch")?.value?.trim().toLowerCase() || "";
  let rows = patientCurrentRows().sort((a, b) => zoneWeight(b.zone) - zoneWeight(a.zone) || b.score - a.score);
  if (activeZoneFilter !== "ALL") rows = rows.filter((row) => row.zone === activeZoneFilter);
  if (search) {
    rows = rows.filter((row) => [row.hn, row.dx, row.district, row.fullName].some((value) => String(value || "").toLowerCase().includes(search)));
  }
  tbody.innerHTML = rows
    .map((row, index) => {
      const cm = findCaseManager(row.district);
      return `
        <tr>
          <td>${index + 1}</td>
          <td><span class="risk-badge ${zoneClass(row.zone)}">${row.zone}</span></td>
          <td>${escapeHtml(row.hn)}</td>
          <td>${escapeHtml(row.dx)}</td>
          <td><strong>${row.score}</strong></td>
          <td>${escapeHtml(row.district)}</td>
          <td>${formatThaiDateTime(row.updatedAt)}</td>
          <td>
            <select data-status-code="${escapeHtml(row.patientCode)}">
              ${statusOptions(row.status)}
            </select>
          </td>
          <td>
            <div class="row-actions">
              <a href="tel:${cm?.phone || "1669"}" title="โทร"><svg><use href="#i-phone"></use></svg></a>
              <button data-view-patient="${escapeHtml(row.patientCode)}" title="ดูข้อมูล"><svg><use href="#i-eye"></use></svg></button>
            </div>
          </td>
        </tr>
      `;
    })
    .join("");

  tbody.querySelectorAll("[data-status-code]").forEach((select) => {
    select.addEventListener("change", () => updatePatientStatus(select.dataset.statusCode, select.value));
  });
  tbody.querySelectorAll("[data-view-patient]").forEach((button) => {
    button.addEventListener("click", () => showPatientDetail(button.dataset.viewPatient));
  });
}

function zoneWeight(zone) {
  return { GREEN: 1, YELLOW: 2, RED: 3 }[zone] || 0;
}

function statusOptions(current) {
  const options = ["ติดตามต่อเนื่อง", "เฝ้าระวัง", "รอการติดต่อ", "รอการช่วยเหลือ", "ช่วยเหลือสำเร็จ: รับไว้ในความดูแล", "ช่วยเหลือสำเร็จ: ส่งต่อรพ.ใกล้บ้าน"];
  return options.map((option) => `<option ${option === current ? "selected" : ""}>${option}</option>`).join("");
}

function updatePatientStatus(patientCode, status) {
  const patients = storage.get("patients", []);
  const index = patients.findIndex((patient) => patient.patientCode === patientCode);
  if (index >= 0) {
    patients[index].status = status;
    patients[index].updatedAt = new Date().toISOString();
    storage.set("patients", patients);
  }
  const alerts = storage.get("alerts", []).map((alert) => (alert.patientCode === patientCode ? { ...alert, status } : alert));
  storage.set("alerts", alerts);
  apiPost("updateStatus", { patientCode, status });
  renderAlertFeed();
}

function showPatientDetail(patientCode) {
  const row = patientCurrentRows().find((patient) => patient.patientCode === patientCode);
  if (!row) return;
  const cm = findCaseManager(row.district);
  const caregivers = getCaregiversByPatient(row.patientCode);
  showAdminDetail(`
    <div class="detail-summary ${zoneClass(row.zone)}">
      <span class="risk-badge ${zoneClass(row.zone)}">${row.zone}</span>
      <h2>${escapeHtml(row.prefix || "")}${escapeHtml(row.fullName || "")}</h2>
      <p>HN ${escapeHtml(row.hn)} | Dx ${escapeHtml(row.dx || "-")} | ${row.score} คะแนน</p>
    </div>
    <div class="detail-grid-admin">
      ${detailItem("รหัสผู้ป่วย", row.patientCode)}
      ${detailItem("เพศ", row.gender)}
      ${detailItem("วันเกิด / อายุ", `${row.dob || "-"} / ${calculateAge(row.dob) || "-"} ปี`)}
      ${detailItem("วันที่จำหน่าย", row.dischargeDate ? formatThaiDateTime(row.dischargeDate) : "-")}
      ${detailItem("ประวัติความรุนแรง", row.violenceHistoryDate || "-")}
      ${detailItem("สารเสพติด", row.substanceUse === "ใช้" ? `ใช้: ${row.substanceDetail || "-"}` : "ไม่ใช้")}
      ${detailItem("ที่อยู่", `${row.addressLine || "-"} ต.${row.subdistrict || "-"} อ.${row.district || "-"} จ.${row.province || "-"}`)}
      ${detailItem("พิกัด", row.latlng || "-")}
      ${detailItem("สถานะ", row.status || "-")}
      ${detailItem("โรงพยาบาลในพื้นที่", cm ? `${cm.workplace} | โทร ${cm.phone}` : "ไม่พบข้อมูล")}
    </div>
    <h3>ข้อมูลผู้ดูแล</h3>
    <div class="caregiver-detail-list">
      ${
        caregivers.length
          ? caregivers.map((caregiver) => `
              <article>
                <strong>${escapeHtml(caregiver.prefix || "")}${escapeHtml(caregiver.fullName || "")}</strong>
                <span>${escapeHtml(caregiver.relationship || "-")} | ${escapeHtml(caregiver.phone || "-")}</span>
                <small>${escapeHtml(caregiver.addressLine || "-")} ต.${escapeHtml(caregiver.subdistrict || "-")} อ.${escapeHtml(caregiver.district || "-")}</small>
              </article>
            `).join("")
          : `<div class="muted-box">ยังไม่พบผู้ดูแลที่เชื่อมกับผู้ป่วยรายนี้</div>`
      }
    </div>
  `);
}

function renderCaseManagerTable() {
  const tbody = document.querySelector("#caseManagerRows");
  if (!tbody) return;
  const caseManagers = storage.get("caseManagers", []).sort((a, b) => String(a.district || "").localeCompare(String(b.district || ""), "th"));
  tbody.innerHTML = caseManagers.length
    ? caseManagers
        .map((cm) => `
          <tr>
            <td><strong>${escapeHtml(cm.workplace || "-")}</strong></td>
            <td>อ.${escapeHtml(cm.district || "-")}, จ.${escapeHtml(cm.province || "-")}</td>
            <td>${escapeHtml(cm.phone || "-")}</td>
            <td style="text-align: right;">
              <div class="row-actions" style="justify-content: flex-end;">
                <button data-view-cm="${escapeHtml(cm.id)}" title="ดูรายละเอียด"><svg><use href="#i-eye"></use></svg></button>
                <button data-edit-cm="${escapeHtml(cm.id)}" title="แก้ไข"><svg><use href="#i-edit"></use></svg></button>
                <button data-delete-cm="${escapeHtml(cm.id)}" title="ลบ"><svg><use href="#i-trash"></use></svg></button>
              </div>
            </td>
          </tr>
        `)
        .join("")
    : `<tr><td colspan="4"><div class="muted-box">ยังไม่มีข้อมูลโรงพยาบาลในพื้นที่</div></td></tr>`;

  tbody.querySelectorAll("[data-view-cm]").forEach((button) => {
    button.addEventListener("click", () => showCaseManagerDetail(button.dataset.viewCm));
  });
  tbody.querySelectorAll("[data-edit-cm]").forEach((button) => {
    button.addEventListener("click", () => {
      const cm = storage.get("caseManagers", []).find((item) => item.id === button.dataset.editCm);
      if (cm) showCaseManagerForm(cm);
    });
  });
  tbody.querySelectorAll("[data-delete-cm]").forEach((button) => {
    button.addEventListener("click", () => deleteCaseManager(button.dataset.deleteCm));
  });
}

function showCaseManagerDetail(id) {
  const cm = storage.get("caseManagers", []).find((item) => item.id === id);
  if (!cm) return;
  const patients = patientCurrentRows().filter((patient) => patient.district === cm.district);
  showAdminDetail(`
    <div class="detail-summary teal">
      <span class="detail-avatar">
        <svg style="width: 2.5rem; height: 2.5rem;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
      </span>
      <h2>${escapeHtml(cm.workplace || "ไม่มีชื่อโรงพยาบาล")}</h2>
      <p>โทรศัพท์: ${escapeHtml(cm.phone || "-")}</p>
    </div>
    <div class="detail-grid-admin">
      ${detailItem("จังหวัด", cm.province)}
      ${detailItem("อำเภอรับผิดชอบ", cm.district)}
      ${detailItem("จำนวนผู้ป่วยในพื้นที่", `${patients.length} ราย`)}
    </div>
    <h3>ผู้ป่วยในพื้นที่รับผิดชอบ</h3>
    <div class="mini-table-list">
      ${
        patients.length
          ? patients.map((patient) => `<article><strong>${escapeHtml(patient.hn)}</strong><span>${escapeHtml(patient.prefix || "")}${escapeHtml(patient.fullName || "")}</span><em class="${zoneClass(patient.zone)}">${patient.zone}</em></article>`).join("")
          : `<div class="muted-box">ยังไม่มีผู้ป่วยในพื้นที่นี้</div>`
      }
    </div>
  `);
}

function deleteCaseManager(id) {
  const cm = storage.get("caseManagers", []).find((item) => item.id === id);
  if (!cm) return;
  if (!confirm(`ต้องการลบข้อมูลของ ${cm.workplace || "โรงพยาบาลนี้"} (อ.${cm.district || "-"}) ใช่หรือไม่?`)) return;
  storage.set("caseManagers", storage.get("caseManagers", []).filter((item) => item.id !== id));
  renderCaseManagerTable();
  renderDashboard();
}

function renderAdminPatientTable() {
  const tbody = document.querySelector("#adminPatientRows");
  if (!tbody) return;
  const rows = patientCurrentRows().sort((a, b) => String(a.hn || "").localeCompare(String(b.hn || ""), "th"));
  tbody.innerHTML = rows.length
    ? rows
        .map((row) => {
          const cm = findCaseManager(row.district);
          return `
            <tr>
              <td><strong>${escapeHtml(row.hn || "-")}</strong></td>
              <td>${escapeHtml(row.prefix || "")}${escapeHtml(row.fullName || "")}</td>
              <td>${escapeHtml(row.dx || "-")}</td>
              <td>${row.dischargeDate ? formatThaiDateTime(row.dischargeDate) : "-"}</td>
              <td><span class="risk-badge ${zoneClass(row.zone)}">${row.zone}</span><br><small>${row.score} คะแนน | ${formatThaiDateTime(row.updatedAt)}</small></td>
              <td>${escapeHtml(row.district || "-")}</td>
              <td>${cm ? `<span style="font-weight: 600; color: #0f766e;">${escapeHtml(cm.workplace || "")}</span><br><small>อ.${escapeHtml(cm.district || "")}</small>` : '<span class="muted">ไม่มีข้อมูล</span>'}</td>
              <td>
                <div class="row-actions">
                  <button data-view-admin-patient="${escapeHtml(row.patientCode)}" title="ดูข้อมูล"><svg><use href="#i-eye"></use></svg></button>
                  <button data-edit-admin-patient="${escapeHtml(row.patientCode)}" title="แก้ไข"><svg><use href="#i-edit"></use></svg></button>
                  <button data-delete-admin-patient="${escapeHtml(row.patientCode)}" title="ลบ"><svg><use href="#i-trash"></use></svg></button>
                </div>
              </td>
            </tr>
          `;
        })
        .join("")
    : `<tr><td colspan="8"><div class="muted-box">ยังไม่มีทะเบียนผู้ป่วย</div></td></tr>`;

  tbody.querySelectorAll("[data-view-admin-patient]").forEach((button) => {
    button.addEventListener("click", () => showPatientDetail(button.dataset.viewAdminPatient));
  });
  tbody.querySelectorAll("[data-edit-admin-patient]").forEach((button) => {
    button.addEventListener("click", () => {
      const patient = storage.get("patients", []).find((item) => item.patientCode === button.dataset.editAdminPatient);
      if (patient) showPatientForm(patient);
    });
  });
  tbody.querySelectorAll("[data-delete-admin-patient]").forEach((button) => {
    button.addEventListener("click", () => deletePatientRecord(button.dataset.deleteAdminPatient));
  });
}

function deletePatientRecord(patientCode) {
  const patient = storage.get("patients", []).find((item) => item.patientCode === patientCode);
  if (!patient) return;
  if (!confirm(`ลบข้อมูลผู้ป่วย HN ${patient.hn || "-"} ${patient.fullName || ""}?`)) return;
  storage.set("patients", storage.get("patients", []).filter((item) => item.patientCode !== patientCode));
  storage.set(
    "caregivers",
    storage.get("caregivers", []).map((caregiver) => ({
      ...caregiver,
      patientCodes: (caregiver.patientCodes || []).filter((code) => code !== patientCode),
      activePatientCode: caregiver.activePatientCode === patientCode ? (caregiver.patientCodes || []).find((code) => code !== patientCode) || "" : caregiver.activePatientCode
    }))
  );
  storage.set("assessments", storage.get("assessments", []).filter((item) => item.patientCode !== patientCode));
  storage.set("alerts", storage.get("alerts", []).filter((item) => item.patientCode !== patientCode));
  renderAdminPatientTable();
  renderDashboard();
}

function getCaregiversByPatient(patientCode) {
  return storage.get("caregivers", []).filter((caregiver) => (caregiver.patientCodes || []).includes(patientCode));
}

function detailItem(label, value) {
  return `<article><span>${escapeHtml(label)}</span><strong>${escapeHtml(value || "-")}</strong></article>`;
}

function showAdminDetail(html) {
  const dialog = document.querySelector("#adminDetailDialog");
  const content = document.querySelector("#adminDetailContent");
  if (!dialog || !content) return;
  content.innerHTML = html;
  dialog.showModal();
}

function renderAlertFeed() {
  const feed = document.querySelector("#alertFeed");
  if (!feed) return;
  const alerts = storage.get("alerts", []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  feed.innerHTML = alerts.length
    ? alerts
        .map(
          (alert) => `
            <article class="alert-item">
              <span class="alert-dot ${zoneClass(alert.zone)}"></span>
              <div>
                <strong>${alert.zone} ZONE | HN ${escapeHtml(alert.hn || "-")} | ${escapeHtml(alert.dx || "-")}</strong>
                <p>${alert.score} คะแนน | ${escapeHtml(alert.district || "-")} | ${escapeHtml(alert.status || "-")}</p>
              </div>
              <small>${formatThaiDateTime(alert.createdAt)}</small>
            </article>
          `
        )
        .join("")
    : `<div class="muted-box">ยังไม่มีรายการแจ้งเตือน Yellow/Red Zone</div>`;
}

function showUnacknowledgedSos() {
  const dialog = document.querySelector("#sosDialog");
  const detail = document.querySelector("#sosDetail");
  if (!dialog) return;
  const alert = storage.get("alerts", []).find((item) => item.zone === "RED" && !item.acknowledged);
  if (!alert) return;
  if (detail) detail.textContent = `HN ${alert.hn || "-"} | ${alert.dx || "-"} | ${alert.score} คะแนน | ${alert.district || "-"}`;
  if (!dialog.open) dialog.showModal();
  startAlarm();
}

function startAlarm() {
  if (alarmTimer) return;
  try {
    alarmContext = alarmContext || new AudioContext();
    alarmTimer = setInterval(() => {
      const oscillator = alarmContext.createOscillator();
      const gain = alarmContext.createGain();
      oscillator.type = "square";
      oscillator.frequency.setValueAtTime(880, alarmContext.currentTime);
      gain.gain.setValueAtTime(0.0001, alarmContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.18, alarmContext.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, alarmContext.currentTime + 0.35);
      oscillator.connect(gain);
      gain.connect(alarmContext.destination);
      oscillator.start();
      oscillator.stop(alarmContext.currentTime + 0.36);
    }, 720);
  } catch {
    alarmTimer = window.setInterval(() => undefined, 720);
  }
}

function stopAlarm() {
  if (alarmTimer) clearInterval(alarmTimer);
  alarmTimer = null;
}

function acknowledgeSos() {
  const alerts = storage.get("alerts", []).map((alert) => (alert.zone === "RED" ? { ...alert, acknowledged: true, status: alert.status || "รอการช่วยเหลือ" } : alert));
  storage.set("alerts", alerts);
  stopAlarm();
  document.querySelector("#sosDialog")?.close();
  renderAlertFeed();
  apiPost("acknowledgeAlert", { zone: "RED", acknowledgedAt: new Date().toISOString() });
}

document.addEventListener("DOMContentLoaded", initAdmin);
