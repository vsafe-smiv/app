let activeZoneFilter = "ALL";
let alarmContext;
let alarmTimer;

// ตัวแปรสำหรับระบบกราฟเดือน และ แบ่งหน้าตาราง
let selectedTrendMonth = new Date().getMonth(); 
let selectedTrendYear = new Date().getFullYear();
let currentPriorityPage = 1;
const priorityItemsPerPage = 10;


async function initAdmin() {
  if (!document.body.classList.contains("admin-body")) return;
  
  // จุดนี้จะทำการเรียกฟังก์ชันใน app.js เพื่อดึงทั้งข้อมูลผู้ป่วยและข้อมูลที่อยู่
  await syncDataFromCloud(); 

  initLogin();
  initAdminNavigation();
  
  // ฟังก์ชันนี้ใน admin.js จะสามารถดึง storage.get("addressData") ไปใช้งานได้อย่างถูกต้อง
  setupAddressSelects(document); 
  initAdminForms();
  initClock();
  renderDashboard();
  
  // ระบบ Auto-Sync เบื้องหลังทุกๆ 30 วินาที จะอัปเดตข้อมูลที่อยู่ใหม่ๆ ตามไป
  setInterval(async () => {
    await syncDataFromCloud();
    renderDashboard();
  }, 30000);
}

document.addEventListener("DOMContentLoaded", initAdmin);

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
    
    // แก้ไขเพิ่มความปลอดภัย: ดึงค่าได้ทั้งกรณีที่ HTML ตั้งชื่อว่า user หรือ username
    const username = data.get("user") || data.get("username");
    const password = data.get("password");
    
    if (username === "14171" && password === "14171") {
      sessionStorage.setItem("vsafe:admin", "1");
      login.classList.add("hidden");
      app.classList.remove("hidden");
      renderDashboard();
    } else {
      // เปลี่ยนมาใช้กล่องข้อความเตือนสุดพรีเมียมตัวใหม่แทนการใช้ alert เดิมของบราวเซอร์
      if (typeof AppDialog !== "undefined") {
        AppDialog.alert("ชื่อผู้ใช้หรือรหัสผ่านระบบไม่ถูกต้อง", "เข้าสู่ระบบล้มเหลว", "warning");
      } else {
        alert("User หรือรหัสผ่านไม่ถูกต้อง");
      }
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

  document.querySelectorAll(".filter-btn").forEach((button) => {
    button.addEventListener("click", () => {
      activeZoneFilter = button.dataset.zone;
      document.querySelectorAll(".filter-btn").forEach((item) => item.classList.toggle("active", item === button));
      currentPriorityPage = 1; // กลับไปหน้าแรกเมื่อกดเปลี่ยน Filter
      renderPriorityTable();
    });
  });

  document.querySelector("#prioritySearch")?.addEventListener("input", () => {
    currentPriorityPage = 1; // กลับไปหน้าแรกเมื่อค้นหา
    renderPriorityTable();
  });
  
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
        weekday: "long", year: "numeric", month: "long", day: "numeric"
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
    await AppDialog.alert("บันทึกข้อมูลโรงพยาบาลในพื้นที่เรียบร้อยแล้ว", "สำเร็จ", "success");
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
    await AppDialog.alert("บันทึกข้อมูลผู้ป่วยเรียบร้อยแล้ว", "สำเร็จ", "success");
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

// =========================================================
// ปรับปรุงฟังก์ชันเปิดหน้าฟอร์ม (showPatientForm) ให้เคลียร์และป้อน 4 ช่องใหม่
// =========================================================
function showPatientForm(patient = null) {
  const card = document.querySelector("#patientFormCard");
  const form = document.querySelector("#patientForm");
  if (!card || !form) return;
  form.reset();
  
  const titleHeading = document.querySelector("#patientFormHeading");
  if (titleHeading) titleHeading.textContent = patient ? "แก้ไขข้อมูลผู้ป่วย" : "ลงทะเบียนผู้ป่วยใหม่";
  
  form.elements.editingKey.value = patient?.patientCode || "";
  
  if (patient) {
    // โหลดฟิลด์ข้อมูลรวมถึง 4 ฟิลด์ที่อยู่ที่สร้างขึ้นมาใหม่ลงบนช่องฟอร์ม
    ["patientCode","hn","prefix","fullName","gender","dob","violenceHistoryDate","substanceUse","substanceDetail","dx","dischargeDate","baselineScore","zipcode","houseNo","moo","villageName","road"].forEach((name) => {
      if (form.elements[name]) form.elements[name].value = patient[name] || "";
    });
    setAddressFormValues(form, patient);
    updatePatientLatLng(form);
  } else {
    setupAddressSelects(scope = document);
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

function setAddressFormValues(form, patient) {
  const provinceSelect = form.querySelector(".adminProvince");
  const districtSelect = form.querySelector(".adminDistrict");
  const subdistrictSelect = form.querySelector(".adminSubdistrict");
  const zipcodeInput = form.querySelector(".adminZipcode");

  if (!provinceSelect || !patient) return;

  // 1. เลือกจังหวัด
  provinceSelect.value = patient.province || "";
  // สั่งให้ดรอปดาวน์อัปเดตรายการอำเภอตามจังหวัดนั้น
  provinceSelect.dispatchEvent(new Event("change"));

  // 2. เลือกอำเภอ
  if (districtSelect) {
    districtSelect.value = patient.district || "";
    // สั่งให้ดรอปดาวน์อัปเดตรายการตำบลตามอำเภอนั้น
    districtSelect.dispatchEvent(new Event("change"));
  }

  // 3. เลือกตำบล
  if (subdistrictSelect) {
    subdistrictSelect.value = patient.subdistrict || "";
  }
  
  if (zipcodeInput) {
    zipcodeInput.value = patient.zipcode || "";
  }
}

// =========================================================
// ปรับปรุงฟังก์ชันผูก Event Listener และเพิ่มปุ่มจับพิกัด GPS จริง
// =========================================================
function initPatientAddressAutomation() {
  const form = document.querySelector("#patientForm");
  if (!form) return;

  const hnInput = form.elements.hn;
  const codeInput = form.elements.patientCode;

  hnInput?.addEventListener("input", () => {
    if (codeInput && !codeInput.dataset.touched) codeInput.value = hnInput.value ? `${hnInput.value.trim()}SMIV` : "";
  });
  codeInput?.addEventListener("input", () => { codeInput.dataset.touched = "1"; });

  // ตรวจจับการพิมพ์ใน 4 ช่องข้อมูลที่อยู่ใหม่ และดรอปดาวน์ทั้งหมด
  const addressFields = ["houseNo", "moo", "villageName", "road"];
  addressFields.forEach((name) => {
    form.elements[name]?.addEventListener("input", () => updatePatientLatLng(form));
  });

  // ปุ่มกดรับพิกัดปัจจุบันจาก GPS สดของอุปกรณ์ ณ ขณะนั้น (สำหรับงานลงพื้นที่)
  document.querySelector("#btnGetActualGPS")?.addEventListener("click", () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          form.elements.latlng.value = `${position.coords.latitude.toFixed(5)},${position.coords.longitude.toFixed(5)}`;
          AppDialog.alert("ดึงพิกัดจาก GPS เรียบร้อยแล้ว", "สำเร็จ", "success");
        }, 
        () => {
          AppDialog.alert("ไม่สามารถดึง GPS ได้ กรุณาตรวจสอบสิทธิ์การเข้าถึงพิกัดบนอุปกรณ์", "ข้อผิดพลาด", "warning");
        }
      );
    } else {
      AppDialog.alert("อุปกรณ์หรือเบราว์เซอร์นี้ไม่รองรับระบบ Geolocation", "ข้อผิดพลาด", "warning");
    }
  });
}

// =========================================================
// แก้ไขฟังก์ชัน setupAddressSelects ให้ดึงจากข้อมูลฐานข้อมูลจริง
// =========================================================
function setupAddressSelects(scope = document) {
  const provinceSelects = scope.querySelectorAll(".adminProvince");
  
  // เปลี่ยนมาดึงข้อมูลจริงจากฐานข้อมูลที่บันทึกไว้ใน storage (ที่รับมาจาก Google Apps Script)
  // หากยังไม่มีให้ใช้ Array ว่างเปล่าเพื่อป้องกันระบบพัง
  const addressList = storage.get("addressData") || []; 

  if (addressList.length === 0) {
    console.warn("ไม่พบข้อมูลที่อยู่ในฐานข้อมูล (addressData)");
    return;
  }

  provinceSelects.forEach((provinceSelect) => {
    const form = provinceSelect.closest("form");
    if (!form) return;
    
    const districtSelect = form.querySelector(".adminDistrict");
    const subdistrictSelect = form.querySelector(".adminSubdistrict");
    const zipcodeInput = form.querySelector(".adminZipcode");

    // 1. ดึงรายชื่อจังหวัดทั้งหมดแบบไม่ซ้ำกัน (ตามคอลัมน์ province)
    const uniqueProvinces = [...new Set(addressList.map(item => item.province))].filter(Boolean).sort();
    
    // ใส่ตัวเลือกจังหวัดลงไปในดรอปดาวน์
    provinceSelect.innerHTML = `<option value="">-- เลือกจังหวัด --</option>` + 
      uniqueProvinces.map(p => `<option value="${escapeHtml(p)}">${escapeHtml(p)}</option>`).join("");

    // 2. ฟังก์ชันอัปเดตอำเภอเมื่อจังหวัดเปลี่ยน (ตามคอลัมน์ amphoe)
    const refreshDistricts = () => {
      if (!districtSelect) return;
      const selectedProvince = provinceSelect.value;
      
      if (!selectedProvince) {
        districtSelect.innerHTML = '<option value="">-- เลือกอำเภอ --</option>';
        if (subdistrictSelect) subdistrictSelect.innerHTML = '<option value="">-- เลือกตำบล --</option>';
        if (zipcodeInput) zipcodeInput.value = '';
        return;
      }

      const filtered = addressList.filter(item => item.province === selectedProvince);
      const uniqueAmphoes = [...new Set(filtered.map(item => item.amphoe))].filter(Boolean).sort();
      
      districtSelect.innerHTML = `<option value="">-- เลือกอำเภอ --</option>` +
        uniqueAmphoes.map(a => `<option value="${escapeHtml(a)}">${escapeHtml(a)}</option>`).join("");
      
      refreshSubdistricts();
    };

    // 3. ฟังก์ชันอัปเดตตำบลเมื่ออำเภอเปลี่ยน (ตามคอลัมน์ tambon)
    const refreshSubdistricts = () => {
      if (!subdistrictSelect) return;
      const selectedProvince = provinceSelect.value;
      const selectedAmphoe = districtSelect.value;

      if (!selectedAmphoe) {
        subdistrictSelect.innerHTML = '<option value="">-- เลือกตำบล --</option>';
        if (zipcodeInput) zipcodeInput.value = '';
        return;
      }

      const filtered = addressList.filter(item => item.province === selectedProvince && item.amphoe === selectedAmphoe);
      const uniqueTambons = [...new Set(filtered.map(item => item.tambon))].filter(Boolean).sort();
      
      subdistrictSelect.innerHTML = `<option value="">-- เลือกตำบล --</option>` +
        filtered.map(item => `<option value="${escapeHtml(item.tambon)}">${escapeHtml(item.tambon)}</option>`).join("");
      
      // อัปเดตรหัสไปรษณีย์และพิกัดเริ่มต้น
      if (zipcodeInput && filtered.length > 0) {
        zipcodeInput.value = filtered[0].zipcode || "";
      }
      if (typeof updatePatientLatLng === "function") updatePatientLatLng(form);
    };

    // ผูกเหตุการณ์การเปลี่ยนแปลงค่าดรอปดาวน์ (Event Listeners)
    provinceSelect.addEventListener("change", refreshDistricts);
    districtSelect?.addEventListener("change", refreshSubdistricts);
    
    subdistrictSelect?.addEventListener("change", () => {
      const selectedProvince = provinceSelect.value;
      const selectedAmphoe = districtSelect.value;
      const selectedTambon = subdistrictSelect.value;
      
      const match = addressList.find(item => 
        item.province === selectedProvince && 
        item.amphoe === selectedAmphoe && 
        item.tambon === selectedTambon
      );
      
      if (zipcodeInput && match) {
        zipcodeInput.value = match.zipcode || "";
      }
      if (typeof updatePatientLatLng === "function") updatePatientLatLng(form);
    });
  });
}


// =========================================================
// ปรับปรุงฟังก์ชันคำนวณที่อยู่เต็ม และ ผูก Event ตรวจจับอัตโนมัติ
// =========================================================
function updatePatientLatLng(form) {
  const latlngField = form.elements.latlng;
  if (!latlngField) return;

  const payload = Object.fromEntries(new FormData(form).entries());
  
  // ประกอบ Full Address String อัตโนมัติจากช่องข้อมูลใหม่ 4 ช่อง
  const houseNo = payload.houseNo ? `บ้านเลขที่ ${payload.houseNo}` : "";
  const moo = payload.moo ? `หมู่ที่ ${payload.moo}` : "";
  const village = payload.villageName ? `หมู่บ้าน/ชุมชน ${payload.villageName}` : "";
  const road = payload.road ? `ถนน/ซอย ${payload.road}` : "";
  const subdistrict = payload.subdistrict ? `ต.${payload.subdistrict}` : "";
  const district = payload.district ? `อ.${payload.district}` : "";
  const province = payload.province ? `จ.${payload.province}` : "";

  const fullAddress = [houseNo, moo, village, road, subdistrict, district, province].filter(Boolean).join(" ");
  
  // บันทึกที่อยู่เต็มลงใน Object ชั่วคราวเพื่อส่ง Geocoding หรือ บันทึกลงฐานข้อมูล
  form.dataset.fullAddressString = fullAddress;

  // ฟังก์ชันคำนวณจุดกึ่งกลางแบบ Fallback เดิม
  latlngField.value = calculateLatLngFromAddress(payload);
}

function calculateLatLngFromAddress(payload) {
  const districtCoords = {
    "เมืองนครสวรรค์": [15.7047, 100.1372], "โกรกพระ": [15.5559, 100.0712], "ชุมแสง": [15.8918, 100.3079], "หนองบัว": [15.8645, 100.3238],
    "บรรพตพิสัย": [15.9362, 99.9815], "เก้าเลี้ยว": [15.8506, 100.0794], "ตาคลี": [15.2633, 100.3438], "ท่าตะโก": [15.6422, 100.4789],
    "ไพศาลี": [15.6008, 100.6551], "พยุหะคีรี": [15.4552, 100.1358], "ลาดยาว": [15.7511, 99.7897], "ตากฟ้า": [15.3499, 100.4956],
    "แม่วงก์": [15.7811, 99.5205], "แม่เปิน": [15.6578, 99.4687], "ชุมตาบง": [15.6333, 99.5534]
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
      score, zone,
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
  renderDashboardAlerts();
  showUnacknowledgedSos();
}

function renderOverview(rows) {
  const container = document.querySelector("#overviewCards");
  if (!container) return;
  const counts = rows.reduce((acc, row) => { acc[row.zone] = (acc[row.zone] || 0) + 1; return acc; }, { GREEN: 0, YELLOW: 0, RED: 0 });
  const cards = [
    ["ผู้ป่วย RED ZONE", counts.RED, "ต้องดำเนินการเร่งด่วน", "red", "!"],
    ["ผู้ป่วย YELLOW ZONE", counts.YELLOW, "เฝ้าระวังใกล้ชิด", "yellow", "!"],
    ["ผู้ป่วย GREEN ZONE", counts.GREEN, "ความเสี่ยงต่ำ", "green", "✓"],
    ["ผู้ป่วยทั้งหมดในระบบ", rows.length, "ราย", "", "●"]
  ];
  container.innerHTML = cards.map(([label, value, desc, cls, icon]) => `<article class="metric-card ${cls}"><i>${icon}</i><span>${label}</span><strong>${value}</strong><small>${desc}</small></article>`).join("");
}

// ---------------------------------------------
// ระบบกราฟแนวโน้มแสดงทั้งเดือน
// ---------------------------------------------
function renderTrend(rows) {
  const canvas = document.querySelector("#trendCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  // สร้าง Dropdown เลือกเดือนถ้ายังไม่มี
  const monthSelector = document.querySelector("#trendMonthSelector");
  if (monthSelector && monthSelector.options.length === 0) {
    const thMonths = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
    for(let i=0; i<12; i++) {
      const opt = document.createElement("option");
      opt.value = i;
      opt.text = `เดือน${thMonths[i]} ${selectedTrendYear + 543}`;
      if(i === selectedTrendMonth) opt.selected = true;
      monthSelector.appendChild(opt);
    }
    monthSelector.addEventListener("change", (e) => {
      selectedTrendMonth = parseInt(e.target.value);
      renderTrend(patientCurrentRows());
    });
  }

  // สร้าง Array วันที่ทั้งเดือน
  const daysInMonth = new Date(selectedTrendYear, selectedTrendMonth + 1, 0).getDate();
  const days = [];
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(new Date(selectedTrendYear, selectedTrendMonth, i));
  }

  const assessments = storage.get("assessments", []);
  const series = { GREEN: [], YELLOW: [], RED: [] };
  const today = new Date();

  days.forEach((day) => {
    const start = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, 0, 0);
    const end = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 23, 59, 59);
    
    // ดึงประวัติที่ถูกประเมินในวันนั้นๆ
    const dayAssessments = assessments.filter((item) => {
      const created = new Date(item.createdAt);
      return created >= start && created <= end;
    });

    ["GREEN", "YELLOW", "RED"].forEach((zone) => {
      // ถาวันนี้ให้ใช้ยอดผู้ป่วยปัจจุบันเป็น fallback หากไม่มีการประเมิน
      if (day.toDateString() === today.toDateString()) {
        const count = dayAssessments.length 
          ? dayAssessments.filter(item => item.zone === zone).length 
          : rows.filter(r => r.zone === zone).length;
        series[zone].push(count);
      } else {
        const count = dayAssessments.filter(item => item.zone === zone).length;
        series[zone].push(count);
      }
    });
  });

  const ratio = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  if (rect.width && rect.height && (canvas.width !== Math.round(rect.width * ratio) || canvas.height !== Math.round(rect.height * ratio))) {
    canvas.width = Math.round(rect.width * ratio);
    canvas.height = Math.round(rect.height * ratio);
  }
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  
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
  ctx.font = "11px Prompt, Tahoma";
  ctx.fillStyle = "rgba(100, 116, 139, 0.8)";
  for (let i = 0; i <= 4; i += 1) {
    const y = pad.top + ((canvas.height - pad.top - pad.bottom) / 4) * i;
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(canvas.width - pad.right, y);
    ctx.stroke();
  }
  
  const stepX = (canvas.width - pad.left - pad.right) / Math.max(1, days.length - 1);
  days.forEach((day, index) => {
    const x = pad.left + stepX * index;
    // พิมพ์วันที่เฉพาะเลขวัน เพื่อไม่ให้เบียดกัน
    if (index % 2 === 0 || index === days.length - 1) {
      ctx.fillText(day.getDate(), x - 4, canvas.height - 12);
    }
  });
}

function drawLine(ctx, canvas, values, color, label) {
  const pad = { left: 44, right: 24, top: 28, bottom: 42 };
  const max = Math.max(5, ...values);
  const stepX = (canvas.width - pad.left - pad.right) / Math.max(1, values.length - 1);
  
  const points = values.map((value, index) => ({
    x: pad.left + stepX * index,
    y: canvas.height - pad.bottom - (value / max) * (canvas.height - pad.top - pad.bottom),
    value
  }));
  
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = 8;
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  points.forEach((point, index) => {
    if (index === 0) { ctx.moveTo(point.x, point.y); return; }
    const previous = points[index - 1];
    const cp1x = previous.x + (point.x - previous.x) * 0.4;
    const cp2x = point.x - (point.x - previous.x) * 0.4;
    ctx.bezierCurveTo(cp1x, previous.y, cp2x, point.y, point.x, point.y);
  });
  ctx.stroke();
  ctx.restore();
  
  // วาดจุดบนกราฟให้เล็กลงเพื่อให้ดูสบายตา
  ctx.fillStyle = color;
  points.forEach((point) => {
    ctx.beginPath();
    ctx.arc(point.x, point.y, 3, 0, Math.PI * 2);
    ctx.fill();
  });
  
  const legendIndex = { GREEN: 0, YELLOW: 1, RED: 2 }[label];
  ctx.font = "600 12px Prompt, Tahoma";
  ctx.fillStyle = color;
  ctx.fillText(label, canvas.width - 230 + legendIndex * 76, 22);
}

// ประกาศตัวแปร Global สำหรับเก็บ Instance ของแผนที่เพื่อไม่ให้โหลดซ้ำ
let leafletMapInstance = null;
let markerClusterGroup = null;

function renderMap(rows) {
  const mapContainer = document.querySelector("#riskMap");
  if (!mapContainer) return;

  // 1. ตรวจสอบว่ามีการสร้างแผนที่ไว้หรือยัง ถ้ายังให้สร้างใหม่
  if (!leafletMapInstance) {
    leafletMapInstance = L.map('riskMap').setView([15.7047, 100.1372], 9);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 18
    }).addTo(leafletMapInstance);

    markerClusterGroup = L.markerClusterGroup({
      iconCreateFunction: function(cluster) {
        return L.divIcon({
          html: `<span>${cluster.getChildCount()}</span>`,
          className: 'custom-cluster-icon',
          iconSize: L.point(40, 40)
        });
      }
    });
    leafletMapInstance.addLayer(markerClusterGroup);

    // --- เพิ่มปุ่มตำแหน่งปัจจุบัน (Locate Me) ---
    const LocateControl = L.Control.extend({
      options: { position: 'topleft' },
      onAdd: function(map) {
        const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control locate-btn');
        container.innerHTML = '📍';
        container.title = "ไปยังตำแหน่งปัจจุบันของฉัน";
        container.style.cursor = 'pointer';
        container.style.backgroundColor = 'white';
        container.style.width = '30px';
        container.style.height = '30px';
        container.style.display = 'flex';
        container.style.alignItems = 'center';
        container.style.justifyContent = 'center';
        
        container.onclick = function() {
          map.locate({ setView: true, maxZoom: 16 });
        };
        return container;
      }
    });
    leafletMapInstance.addControl(new LocateControl());

    // แสดงจุดตำแหน่งของผู้ใช้เมื่อพบพิกัด
    leafletMapInstance.on('locationfound', function(e) {
      L.circleMarker(e.latlng, {
        color: '#3b82f6',
        fillColor: '#3b82f6',
        fillOpacity: 0.7,
        radius: 8
      }).addTo(leafletMapInstance).bindPopup("คุณอยู่ที่นี่").openPopup();
    });

    // ระบบขยายเต็มหน้าจอ
    const fsBtn = document.getElementById('fullscreenMapBtn');
    const mapCard = document.querySelector('.monitor-map-card');
    if (fsBtn && mapCard) {
      fsBtn.addEventListener('click', () => {
        mapCard.classList.toggle('map-fullscreen-active');
        setTimeout(() => leafletMapInstance.invalidateSize(), 300);
      });
    }
  }

  // 2. เคลียร์หมุดเก่า
  markerClusterGroup.clearLayers();

  // 3. วาดหมุดผู้ป่วย
  const points = rows.map((row) => ({ ...row, coords: parseLatLng(row.latlng) })).filter((row) => row.coords);
  points.forEach(row => {
    let pinClass = 'pin-green';
    let hexColor = '#10b981';
    if (row.zone === 'RED') { pinClass = 'pin-red'; hexColor = '#ef4444'; }
    else if (row.zone === 'YELLOW') { pinClass = 'pin-yellow'; hexColor = '#f59e0b'; }

    const customIcon = L.divIcon({
      html: `<div class="map-pin-inner ${pinClass}"><span>${row.score}</span></div>`,
      className: 'custom-leaflet-icon',
      iconSize: [36, 36],
      iconAnchor: [18, 36],
      popupAnchor: [0, -32]
    });

    const marker = L.marker([row.coords[0], row.coords[1]], { icon: customIcon });
    
    // แก้ไขลิงก์ Google Maps ให้ถูกต้อง
    const popupHTML = `
      <div style="min-width: 220px;">
        <div style="background: ${hexColor}; color: white; padding: 10px; font-weight: bold;">
          HN: ${escapeHtml(row.hn || "-")} | ${row.zone}
        </div>
        <div style="padding: 12px;">
          <p>คะแนน: ${row.score} | สถานะ: ${escapeHtml(row.status || "-")}</p>
          <a href="https://www.google.com/maps/search/?api=1&query=${row.coords[0]},${row.coords[1]}" 
             target="_blank" 
             style="display: block; width: 100%; text-align: center; background: #0f766e; color: white; padding: 8px 0; border-radius: 6px; text-decoration: none;">
             🗺️ นำทาง
          </a>
        </div>
      </div>
    `;
    marker.bindPopup(popupHTML);
    markerClusterGroup.addLayer(marker);
  });
}

// ฟังก์ชันแยก String "15.xxx, 100.yyy" ออกมาเป็น Array ตัวเลข
function parseLatLng(value = "") {
  const [lat, lng] = String(value).split(",").map((item) => Number(item.trim()));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return [lat, lng];
}

function renderDashboardAlerts() {
  const container = document.querySelector("#dashboardAlertFeed");
  if (!container) return;
  
  // กำหนด Class สำหรับ Container เพื่อให้ CSS ทำงาน
  container.className = "alert-feed-container";

  const alerts = storage.get("alerts", []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);
  
  container.innerHTML = alerts.length
    ? alerts.map((alert) => {
        const isRed = alert.zone === "RED";
        // เพิ่ม Class สำหรับสีขอบ และ Class สำหรับสีพื้นหลัง
        const borderClass = isRed ? "alert-red" : "alert-yellow";
        const bgClass = isRed ? "bg-red-alert" : "bg-yellow-alert";
        
        // สร้างวันที่แบบสั้น ควบคู่กับเวลา (เช่น 9 มิ.ย. | 14:30)
        const dateObj = new Date(alert.createdAt);
        const shortDate = new Intl.DateTimeFormat("th-TH-u-ca-buddhist", { day: "numeric", month: "short" }).format(dateObj);
        const shortTime = dateObj.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", hour12: false });
        
        return `
          <article class="alert-item ${borderClass} ${bgClass}">
            <div class="time-dot-col">
                <span class="alert-time">${shortTime}</span>
                <div class="status-dot"></div>
            </div>
            <div class="alert-info">
              <strong>${alert.zone} ZONE | HN ${escapeHtml(alert.hn || "-")} | ${escapeHtml(alert.dx || "-")}</strong>
              <small>${alert.score} คะแนน | ${escapeHtml(alert.district || "-")} | ${escapeHtml(alert.status || "-")}</small>
            </div>
            <div class="alert-timestamp">
              ${shortDate}
            </div>
          </article>
        `;
      }).join("")
    : `<div class="muted-box" style="text-align:center; padding:1rem;">ไม่พบรายการแจ้งเตือน</div>`;
}

// ---------------------------------------------
// ระบบตาราง พร้อมแบ่งหน้า (Pagination)
// ---------------------------------------------
function renderPriorityTable() {
  const tbody = document.querySelector("#priorityRows");
  if (!tbody) return;
  const search = document.querySelector("#prioritySearch")?.value?.trim().toLowerCase() || "";
  let rows = patientCurrentRows().sort((a, b) => zoneWeight(b.zone) - zoneWeight(a.zone) || b.score - a.score);
  if (activeZoneFilter !== "ALL") rows = rows.filter((row) => row.zone === activeZoneFilter);
  if (search) {
    rows = rows.filter((row) => [row.hn, row.dx, row.district, row.fullName].some((value) => String(value || "").toLowerCase().includes(search)));
  }

  // คำนวณการแบ่งหน้า
  const totalPages = Math.max(1, Math.ceil(rows.length / priorityItemsPerPage));
  if (currentPriorityPage > totalPages) currentPriorityPage = totalPages;
  const startIdx = (currentPriorityPage - 1) * priorityItemsPerPage;
  const paginatedRows = rows.slice(startIdx, startIdx + priorityItemsPerPage);

  tbody.innerHTML = paginatedRows.length ? paginatedRows
    .map((row, index) => {
      const cm = findCaseManager(row.district);
      return `
        <tr>
          <td>${startIdx + index + 1}</td>
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
    .join("") : `<tr><td colspan="9" style="text-align: center; padding: 2rem; color: #64748b;">ไม่พบข้อมูลผู้ป่วย</td></tr>`;

  tbody.querySelectorAll("[data-status-code]").forEach((select) => {
    select.addEventListener("change", () => updatePatientStatus(select.dataset.statusCode, select.value));
  });
  tbody.querySelectorAll("[data-view-patient]").forEach((button) => {
    button.addEventListener("click", () => showPatientDetail(button.dataset.viewPatient));
  });

  // สร้างปุ่มเปลี่ยนหน้า
  const paginationDiv = document.querySelector("#priorityPagination");
  if (paginationDiv) {
    paginationDiv.innerHTML = `
      <button class="secondary-btn" style="padding: 0.4rem 1rem;" ${currentPriorityPage === 1 ? "disabled" : ""} onclick="window.changePriorityPage(-1)">ย้อนกลับ</button>
      <span style="font-size: 0.95rem; font-weight: 500; color: #475569;">หน้า ${currentPriorityPage} จาก ${totalPages}</span>
      <button class="primary-btn" style="padding: 0.4rem 1rem;" ${currentPriorityPage === totalPages ? "disabled" : ""} onclick="window.changePriorityPage(1)">ถัดไป</button>
    `;
  }
}

window.changePriorityPage = function(delta) {
  currentPriorityPage += delta;
  renderPriorityTable();
};

function zoneWeight(zone) { return { GREEN: 1, YELLOW: 2, RED: 3 }[zone] || 0; }
function statusOptions(current) {
  const options = ["ติดตามต่อเนื่อง", "เฝ้าระวัง", "รอการติดต่อ", "รอการช่วยเหลือ", "ช่วยเหลือแล้ว"];
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
  renderDashboardAlerts();
}

// =========================================================
// แก้ไขระบบแสดงผลรายละเอียดที่อยู่ผู้ป่วยแบบเต็มตัว ในตารางและหน้ารายละเอียด
// =========================================================
function showPatientDetail(patientCode) {
  const row = patientCurrentRows().find((patient) => patient.patientCode === patientCode);
  if (!row) return;
  const cm = findCaseManager(row.district);
  const caregivers = getCaregiversByPatient(row.patientCode);

  // การประกอบคำที่อยู่ให้ละเอียดชัดเจนครบถ้วนเพื่อแสดงผลในฝั่งแอดมิน
  const fullAddressDisplay = [
    row.houseNo ? `เลขที่ ${row.houseNo}` : "",
    row.moo ? `ม.${row.moo}` : "",
    row.villageName ? `${row.villageName}` : "",
    row.road ? `ถ./ซอย ${row.road}` : "",
    row.subdistrict ? `ต.${row.subdistrict}` : "",
    row.district ? `อ.${row.district}` : "",
    row.province ? `จ.${row.province}` : "",
    row.zipcode ? `${row.zipcode}` : ""
  ].filter(Boolean).join(" ");

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
      ${detailItem("รายละเอียดที่อยู่ละเอียด", fullAddressDisplay)}
      ${detailItem("พิกัดแผนที่", row.latlng || "-")}
      ${detailItem("สถานะการดูแล", row.status || "-")}
      ${detailItem("ศูนย์ดูแลรับผิดชอบ", cm ? `${cm.workplace} | โทร ${cm.phone}` : "ไม่พบข้อมูล")}
    </div>
    <h3>ข้อมูลผู้ดูแล (ญาติ)</h3>
    <div class="caregiver-detail-list">
      ${caregivers.length ? caregivers.map((c) => `<article><strong>${escapeHtml(c.prefix || "")}${escapeHtml(c.fullName || "")}</strong><span>${escapeHtml(c.relationship || "-")} | ${escapeHtml(c.phone || "-")}</span></article>`).join("") : "<p style='color: #999;'>ไม่มีข้อมูลผู้ดูแล</p>"}
    </div>
  `);
}

function escapeHtml(unsafe) {
  if (!unsafe) return "";
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function renderCaseManagerTable() {
  const tbody = document.querySelector("#caseManagerRows");
  if (!tbody) return;
  
  // ดึงข้อมูลและป้องกันกรณีเป็น null
  const caseManagers = storage.get("caseManagers") || [];
  const sortedCaseManagers = caseManagers.sort((a, b) => String(a.district || "").localeCompare(String(b.district || ""), "th"));
  
  tbody.innerHTML = sortedCaseManagers.length
    ? sortedCaseManagers.map((cm) => `
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
      `).join("")
    : `<tr><td colspan="4"><div class="muted-box" style="text-align:center; padding:1.5rem;">ยังไม่มีข้อมูลโรงพยาบาลในพื้นที่</div></td></tr>`;
    
  tbody.querySelectorAll("[data-view-cm]").forEach((btn) => btn.addEventListener("click", () => showCaseManagerDetail(btn.dataset.viewCm)));
  tbody.querySelectorAll("[data-edit-cm]").forEach((btn) => btn.addEventListener("click", () => {
    const cm = storage.get("caseManagers", []).find((item) => item.id === btn.dataset.editCm);
    if (cm) showCaseManagerForm(cm);
  }));
  tbody.querySelectorAll("[data-delete-cm]").forEach((btn) => btn.addEventListener("click", () => deleteCaseManager(btn.dataset.deleteCm)));
}

function showCaseManagerDetail(id) {
  const cm = storage.get("caseManagers", []).find((item) => item.id === id);
  if (!cm) return;
  const patients = patientCurrentRows().filter((patient) => patient.district === cm.district);
  showAdminDetail(`
    <div class="detail-summary teal">
      <span class="detail-avatar"><svg style="width:2.5rem; height:2.5rem;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path></svg></span>
      <h2>${escapeHtml(cm.workplace || "ไม่มีชื่อโรงพยาบาล")}</h2><p>โทรศัพท์: ${escapeHtml(cm.phone || "-")}</p>
    </div>
    <div class="detail-grid-admin">
      ${detailItem("จังหวัด", cm.province)}
      ${detailItem("อำเภอรับผิดชอบ", cm.district)}
      ${detailItem("จำนวนผู้ป่วยในพื้นที่", `${patients.length} ราย`)}
    </div>
    <h3>ผู้ป่วยในพื้นที่รับผิดชอบ</h3>
    <div class="mini-table-list">
      ${patients.length ? patients.map((p) => `<article><strong>${escapeHtml(p.hn)}</strong><span>${escapeHtml(p.prefix || "")}${escapeHtml(p.fullName || "")}</span><em class="${zoneClass(p.zone)}">${p.zone}</em></article>`).join("") : "<p style='color: #999;'>ไม่มีผู้ป่วยในพื้นที่นี้</p>"}
    </div>
  `);
}

async function deleteCaseManager(id) {
  const cm = storage.get("caseManagers", []).find((item) => item.id === id);
  if (!cm) return;
  
  // ใช้ await รอให้แอดมินกดยืนยันจากกล่อง Popup ใหม่
  const confirmed = await AppDialog.confirm(`ต้องการลบข้อมูลของ ${cm.workplace || "โรงพยาบาลนี้"} (อ.${cm.district || "-"}) ใช่หรือไม่?`, "ยืนยันการลบ");
  if (!confirmed) return;
  
  const updatedList = storage.get("caseManagers", []).filter((item) => item.id !== id);
  storage.set("caseManagers", updatedList);
  
  // เรียก API ไปลบที่ฐานข้อมูล (ถ้าคุณมีฟังก์ชันลบฝั่ง API ให้ใส่ตรงนี้)
  // await apiPost("deleteCaseManager", { id });
  
  renderCaseManagerTable();
  renderDashboard();
  AppDialog.alert("ลบข้อมูลโรงพยาบาลเรียบร้อยแล้ว", "สำเร็จ", "success");
}

function renderAdminPatientTable() {
  const tbody = document.querySelector("#adminPatientRows");
  if (!tbody) return;
  const rows = patientCurrentRows().sort((a, b) => String(a.hn || "").localeCompare(String(b.hn || ""), "th"));
  tbody.innerHTML = rows.length
    ? rows.map((row) => {
        const cm = findCaseManager(row.district);
        return `
          <tr>
            <td><strong>${escapeHtml(row.hn || "-")}</strong></td>
            <td>${escapeHtml(row.prefix || "")}${escapeHtml(row.fullName || "")}</td>
            <td>${escapeHtml(row.dx || "-")}</td>
            <td>${row.dischargeDate ? formatThaiDateTime(row.dischargeDate) : "-"}</td>
            <td><span class="risk-badge ${zoneClass(row.zone)}">${row.zone}</span><br><small>${row.score} คะแนน</small></td>
            <td>${escapeHtml(row.district || "-")}</td>
            <td>${cm ? `<span style="font-weight: 600; color: #0f766e;">${escapeHtml(cm.workplace || "")}</span>` : '<span class="muted">ไม่มีข้อมูล</span>'}</td>
            <td>
              <div class="row-actions">
                <button data-view-admin-patient="${escapeHtml(row.patientCode)}" title="ดูข้อมูล"><svg><use href="#i-eye"></use></svg></button>
                <button data-edit-admin-patient="${escapeHtml(row.patientCode)}" title="แก้ไข"><svg><use href="#i-edit"></use></svg></button>
                <button data-delete-admin-patient="${escapeHtml(row.patientCode)}" title="ลบ"><svg><use href="#i-trash"></use></svg></button>
              </div>
            </td>
          </tr>
        `;
      }).join("")
    : `<tr><td colspan="8"><div class="muted-box">ยังไม่มีทะเบียนผู้ป่วย</div></td></tr>`;
  tbody.querySelectorAll("[data-view-admin-patient]").forEach((btn) => btn.addEventListener("click", () => showPatientDetail(btn.dataset.viewAdminPatient)));
  tbody.querySelectorAll("[data-edit-admin-patient]").forEach((btn) => btn.addEventListener("click", () => {
    const patient = storage.get("patients", []).find((item) => item.patientCode === btn.dataset.editAdminPatient);
    if (patient) showPatientForm(patient);
  }));
  tbody.querySelectorAll("[data-delete-admin-patient]").forEach((btn) => btn.addEventListener("click", () => deletePatientRecord(btn.dataset.deleteAdminPatient)));
}

async function deletePatientRecord(patientCode) {
  const patient = storage.get("patients", []).find((item) => item.patientCode === patientCode);
  if (!patient) return;
  
  // ใช้ await รอการยืนยัน
  const confirmed = await AppDialog.confirm(`ลบข้อมูลผู้ป่วย HN ${patient.hn || "-"} ใช่หรือไม่?`, "ยืนยันการลบ");
  if (!confirmed) return;
  
  storage.set("patients", storage.get("patients", []).filter((item) => item.patientCode !== patientCode));
  storage.set("assessments", storage.get("assessments", []).filter((item) => item.patientCode !== patientCode));
  
  renderAdminPatientTable();
  renderDashboard();
  AppDialog.alert("ลบข้อมูลผู้ป่วยเรียบร้อยแล้ว", "สำเร็จ", "success");
}

function renderAlertFeed() {
  const feed = document.querySelector("#alertFeed");
  if (!feed) return;
  
  // กำหนด Class สำหรับ Container เพื่อใช้ CSS ชุดใหม่
  feed.className = "alert-feed-container";

  const alerts = storage.get("alerts", []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  
  feed.innerHTML = alerts.length
    ? alerts.map((alert) => {
        const isRed = alert.zone === "RED";
        const borderClass = isRed ? "alert-red" : "alert-yellow";
        
        return `
          <article class="alert-item ${borderClass}">
            <div class="status-dot"></div>
            <div class="alert-info">
              <strong>${alert.zone} ZONE | HN ${escapeHtml(alert.hn || "-")} | ${escapeHtml(alert.dx || "-")}</strong>
              <small>${alert.score} คะแนน | ${escapeHtml(alert.district || "-")} | ${escapeHtml(alert.status || "-")}</small>
            </div>
            <div class="alert-timestamp">
              ${formatThaiDateTime(alert.createdAt)}
            </div>
          </article>
        `;
      }).join("")
    : `<div class="muted-box" style="text-align:center; padding:1rem;">ไม่พบรายการแจ้งเตือน</div>`;
}

function showUnacknowledgedSos() {
  const dialog = document.querySelector("#sosDialog");
  if (!dialog) return;

  const alert = storage.get("alerts", []).find((item) => item.zone === "RED" && !item.acknowledged);
  
  // ถ้าไม่มี Alert ค้างอยู่ ให้ปิด Dialog แล้วจบการทำงาน
  if (!alert) {
    if (dialog.open) dialog.close();
    return;
  }

  // อัปเดตรายละเอียดผู้ป่วยใน Popup
  const detail = document.querySelector("#sosDetail");
  if (detail) {
    detail.innerHTML = `ผู้ป่วย HN: ${escapeHtml(alert.hn || "-")} <br> คะแนน: ${alert.score} <br> พื้นที่: ${escapeHtml(alert.district || "-")}`;
  }

  // --- ส่วนแก้ไข: ป้องกัน TypeError ---
  const ackBtn = document.querySelector("#ackSos");
  if (ackBtn) {
    ackBtn.onclick = () => acknowledgeSos(alert.alertId);
  } else {
    console.error("ไม่พบปุ่ม #ackSos ในหน้า admin.html");
  }

  // จัดการปุ่มดูข้อมูลผู้ป่วย
  const modal = dialog.querySelector(".sos-modal");
  let viewBtn = modal.querySelector(".view-patient-btn");
  
  if (!viewBtn) {
    viewBtn = document.createElement("button");
    viewBtn.className = "secondary-btn wide view-patient-btn";
    viewBtn.style.marginTop = "10px";
    viewBtn.textContent = "🔍 ดูข้อมูลผู้ป่วย";
    modal.appendChild(viewBtn);
  }
  
  viewBtn.onclick = () => {
    acknowledgeSos(alert.alertId); // กดดู = รับทราบภารกิจทันที
    dialog.close();
    showPatientDetail(alert.patientCode);
  };

  if (!dialog.open) dialog.showModal();
  startAlarm();
}

function startAlarm() {
  if (alarmTimer) return;
  try {
    alarmContext = alarmContext || new AudioContext();
    alarmTimer = setInterval(() => {
      const osc = alarmContext.createOscillator(), gain = alarmContext.createGain();
      osc.type = "square"; osc.frequency.setValueAtTime(880, alarmContext.currentTime);
      gain.gain.setValueAtTime(0.0001, alarmContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.18, alarmContext.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, alarmContext.currentTime + 0.35);
      osc.connect(gain); gain.connect(alarmContext.destination);
      osc.start(); osc.stop(alarmContext.currentTime + 0.36);
    }, 720);
  } catch { alarmTimer = window.setInterval(() => undefined, 720); }
}

function stopAlarm() { if (alarmTimer) clearInterval(alarmTimer); alarmTimer = null; }
// แก้ไขฟังก์ชันนี้ใน admin.js
async function acknowledgeSos(alertId) {
  if (!alertId) return;

  // 1. อัปเดตใน Local Storage ทันที
  const alerts = storage.get("alerts", []).map((alert) => 
    (alert.alertId === alertId ? { ...alert, acknowledged: true, status: alert.status || "รับทราบภารกิจแล้ว" } : alert)
  );
  storage.set("alerts", alerts);

  // 2. ส่งค่าไปอัปเดตที่ Google Sheets (สำคัญมากเพื่อป้องกันการเตือนซ้ำ)
  await apiPost("acknowledgeAlert", { alertId: alertId });

  stopAlarm();
  document.querySelector("#sosDialog")?.close();
  renderAlertFeed();
  renderDashboardAlerts();
}
// ฟังก์ชันสำหรับค้นหาผู้ดูแลที่เชื่อมโยงกับรหัสผู้ป่วยนั้นๆ
function getCaregiversByPatient(patientCode) {
  const allCaregivers = storage.get("caregivers", []);
  
  return allCaregivers.filter(cg => {
    let codes = cg.patientCodes;
    
    // จัดการกรณีข้อมูลเป็น JSON string (เผื่อดึงมาจาก Google Sheets แล้วติด String มา)
    if (typeof codes === 'string') {
      try {
        codes = JSON.parse(codes);
      } catch (e) {
        codes = [];
      }
    }
    
    // ตรวจสอบว่ามี patientCode นี้อยู่ในรายการหรือไม่
    return Array.isArray(codes) && codes.includes(patientCode);
  });
}
// --- ส่วนที่ 1: ฟังก์ชันแสดงรายละเอียด (ต้องมีเพื่อให้เรียกใช้ได้) ---
function showAdminDetail(htmlContent) {
  const dialog = document.querySelector("#adminDetailDialog");
  const content = document.querySelector("#adminDetailContent");
  
  if (dialog && content) {
    content.innerHTML = htmlContent;
    dialog.showModal();
  } else {
    console.error("ไม่พบ Dialog หรือ Content");
  }
}

// --- ส่วนที่ 2: ผูก Event ปิด Dialog (แนะนำให้ครอบด้วย DOMContentLoaded) ---
document.addEventListener('DOMContentLoaded', () => {
  const closeBtn = document.querySelector(".admin-dialog-close");
  const dialog = document.querySelector("#adminDetailDialog");
  
  if (closeBtn && dialog) {
    closeBtn.addEventListener("click", () => {
      dialog.close();
    });
  }
});
