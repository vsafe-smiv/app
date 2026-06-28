let activeZoneFilter = "ALL";
let alarmContext;
let alarmTimer;

// ตัวแปรสำหรับระบบกราฟเดือน และ แบ่งหน้าตาราง
let selectedTrendMonth = new Date().getMonth(); 
let selectedTrendYear = new Date().getFullYear();
let currentPriorityPage = 1;
const priorityItemsPerPage = 10;

// =================================================================
// PERFORMANCE: แคช patientCurrentRows และ debounce renderDashboard
// =================================================================

// Module-level cache สำหรับ patientCurrentRows (หมดอายุใน 10 วินาที)
let _cachedPatientRows = null;
let _rowsCacheTime = 0;
const ROWS_CACHE_TTL = 10000; // 10 วินาที

// Debounce timer สำหรับ renderDashboard
let _dashDebounceTimer = null;

// =========================================================
// LOADING OVERLAY HELPERS
// =========================================================

function showAdminLoading(message) {
  const overlay = document.querySelector("#adminLoadingOverlay");
  const status  = document.querySelector("#adminLoadingStatus");
  if (overlay) overlay.style.display = "flex";
  if (status && message) status.textContent = message;
}

function hideAdminLoading() {
  const overlay = document.querySelector("#adminLoadingOverlay");
  if (!overlay) return;
  overlay.style.opacity = "0";
  overlay.style.pointerEvents = "none";
  setTimeout(() => { overlay.style.display = "none"; }, 450);
}

function setLoadingStatus(msg) {
  const el = document.querySelector("#adminLoadingStatus");
  if (el) el.textContent = msg;
}

// =========================================================
// INIT ADMIN — crash-proof with timeout guard
// =========================================================

async function initAdmin() {
  if (!document.body.classList.contains("admin-body")) return;

  // Show loading overlay immediately
  showAdminLoading("กำลังเชื่อมต่อฐานข้อมูล...");

  // 20-second timeout safety net
  const loadingTimeout = setTimeout(() => {
    setLoadingStatus("โหลดนานเกินไป แสดง UI โดยไม่มีข้อมูลทั้งหมด");
    hideAdminLoading();
    initLogin();
    initAdminNavigation();
    initLogout();
    initClock();
  }, 20000);

  try {
    setLoadingStatus("ดึงข้อมูลจาก Google Sheets...");
    await syncDataFromCloud();

    clearTimeout(loadingTimeout);

    setLoadingStatus("เตรียม UI สำเร็จแล้ว...");

    initLogin();
    initAdminNavigation();
    initLogout();
    setupAddressSelects(document);
    initAdminForms();
    initClock();

    setLoadingStatus("โหลด Dashboard...");
    renderDashboard();

    // Auto-Sync เบื้องหลังทุก 3 นาที (ลดจาก 30 วิ เพื่อลดการเรียก GAS บ่อยเกินไป)
    setInterval(async () => {
      try {
        await syncDataFromCloud({ silent: true, force: true });
        // แค่ re-render ถ้าอยู่ที่หน้า Dashboard
        const activeBtn = document.querySelector(".side-nav [data-admin-view].active");
        if (!activeBtn || activeBtn.dataset.adminView === "dashboard") {
          invalidatePatientRowsCache();
          renderDashboard();
        }
      } catch (e) {
        console.warn("Auto-sync failed:", e.message);
      }
    }, 180000); // 3 นาที

    hideAdminLoading();

  } catch (error) {
    clearTimeout(loadingTimeout);
    console.error("เกิดข้อผิดพลาดในการเริ่มต้นแอป:", error);

    setLoadingStatus("ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่อีกครั้ง (แสดง UI ด้วยข้อมูลใน Cache)");

    // ยัง init UI ได้แม้ไม่มีข้อมูลใหม่ — ใช้ cache จาก localStorage
    try {
      initLogin();
      initAdminNavigation();
      initLogout();
      setupAddressSelects(document);
      initAdminForms();
      initClock();
      renderDashboard();
    } catch (uiError) {
      console.error("UI init failed:", uiError.message);
    }

    setTimeout(() => hideAdminLoading(), 2000);
  }
}

document.addEventListener("DOMContentLoaded", initAdmin);

// =========================================================
// LOGIN — crash-safe
// =========================================================

function initLogin() {
  const login = document.querySelector("#adminLogin");
  const app   = document.querySelector("#adminApp");
  const form  = document.querySelector("#loginForm");

  if (!login || !app) return;

  const isLoggedIn = sessionStorage.getItem("vsafe:admin") === "1";
  if (isLoggedIn) {
    login.classList.add("hidden");
    app.classList.remove("hidden");
  }

  form?.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const username = normalizeCredential(data.get("user") || data.get("username"));
    const password = normalizeCredential(data.get("password"));

    if (username === "14171" && password === "14171") {
      sessionStorage.setItem("vsafe:admin", "1");
      login.classList.add("hidden");
      app.classList.remove("hidden");
      try { renderDashboard(); } catch(e) { console.warn("renderDashboard after login:", e); }
    } else {
      if (typeof AppDialog !== "undefined") {
        AppDialog.alert("ชื่อผู้ใช้หรือรหัสผ่านระบบไม่ถูกต้อง", "เข้าสู่ระบบล้มเหลว", "warning");
      } else {
        alert("ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง");
      }
    }
  });
}

// =========================================================
// LOGOUT
// =========================================================

function performLogout() {
  // Clear all admin session data
  sessionStorage.removeItem("vsafe:admin");
  sessionStorage.clear();

  // Clear admin-specific localStorage keys (keep patient cache for app)
  ["vsafe:adminSidebarCollapsed"].forEach(k => localStorage.removeItem(k));

  // Prevent back-button return to admin
  history.pushState(null, "", location.href);
  window.onpopstate = () => { history.pushState(null, "", location.href); };

  // Redirect to login (reload page clears JS state)
  location.reload();
}

function initLogout() {
  const handler = async () => {
    // Show confirmation dialog
    let confirmed = false;
    try {
      confirmed = await AppDialog.confirm(
        "คุณต้องการออกจากระบบใช่หรือไม่?",
        "ยืนยันออกจากระบบ"
      );
    } catch(e) {
      // Fallback if AppDialog not available
      confirmed = window.confirm("คุณต้องการออกจากระบบใช่หรือไม่?");
    }
    if (confirmed) performLogout();
  };

  // Sidebar logout button
  document.querySelector("#logoutBtn")?.addEventListener("click", handler);
  // Topbar logout button
  document.querySelector("#topbarLogoutBtn")?.addEventListener("click", handler);
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
      if (view === "knowledge") renderKnowledgeAdmin();
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
    if (payload.id) {
      payload.updatedAt = thaiTimestamp();
    } else {
      payload.id = `CM-${Date.now()}`;
      payload.createdAt = thaiTimestamp();
    }
    const saved = await saveToCloudOrAlert("saveCaseManager", payload, "ไม่สามารถบันทึกข้อมูลโรงพยาบาลลงฐานข้อมูลได้");
    if (!saved) return;
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
    
    // Normalize dates before submission
    payload.dob = toIsoDateString(payload.dob);
    payload.violenceHistoryDate = toIsoDateString(payload.violenceHistoryDate);
    payload.dischargeDate = toIsoDateString(payload.dischargeDate);
    
    // รวมพิกัด lat, lng กลับเป็น latlng เพื่อเซฟลง Google Sheets
    payload.latlng = `${payload.lat || ""},${payload.lng || ""}`;
    delete payload.lat;
    delete payload.lng;
    
    payload.baselineScore = Number(payload.baselineScore || 0);
    
    const existingPatient = editingKey ? storage.get("patients", []).find(p => p.patientCode === editingKey) : null;
    if (existingPatient) {
      payload.status = existingPatient.status || statusByZone(classifyRisk(payload.baselineScore));
      payload.lastScore = existingPatient.lastScore !== undefined ? existingPatient.lastScore : "";
      payload.lastZone = existingPatient.lastZone !== undefined ? existingPatient.lastZone : "";
      payload.createdAt = existingPatient.createdAt;
      payload.updatedAt = thaiTimestamp();
    } else {
      payload.status = statusByZone(classifyRisk(payload.baselineScore));
      payload.createdAt = thaiTimestamp();
    }

    const saved = await saveToCloudOrAlert("savePatient", payload, "ไม่สามารถบันทึกข้อมูลผู้ป่วยลงฐานข้อมูลได้");
    if (!saved) return;
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
    // Populate address select dropdowns first
    setupAddressSelects(form);
    
    // โหลดฟิลด์ข้อมูลลงในฟอร์ม
    ["patientCode","hn","prefix","fullName","gender","dob","violenceHistoryDate","substanceUse","substanceDetail","dx","dischargeDate","baselineScore","zipcode","houseNo","moo","villageName","road"].forEach((name) => {
      let val = patient[name] || "";
      if (["dob", "violenceHistoryDate", "dischargeDate"].indexOf(name) > -1) {
        val = toIsoDateString(val); // Ensure YYYY-MM-DD CE for HTML5 inputs
      }
      if (form.elements[name]) form.elements[name].value = val;
    });
    setAddressFormValues(form, patient);
    
    // โหลดค่า Latitude/Longitude จาก latlng ในฐานข้อมูล
    const latlng = patient.latlng || "";
    const [latVal, lngVal] = latlng.split(",").map(s => s.trim());
    if (form.elements.lat) form.elements.lat.value = latVal || "";
    if (form.elements.lng) form.elements.lng.value = lngVal || "";
  } else {
    setupAddressSelects(form);
    if (form.elements.lat) form.elements.lat.value = "";
    if (form.elements.lng) form.elements.lng.value = "";
  }
  
  // Update and bind B.E. helper text displays
  initDateInputHelpers(form);

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

  // ปุ่มคำนวณพิกัดภูมิศาสตร์จากข้อมูลที่อยู่
  document.querySelector("#btnCalculateCoordinates")?.addEventListener("click", async () => {
    const province = form.elements.province.value.trim();
    const district = form.elements.district.value.trim();
    const subdistrict = form.elements.subdistrict.value.trim();
    const houseNo = form.elements.houseNo.value.trim();

    // 7. ตรวจสอบความครบถ้วนของข้อมูลที่อยู่
    if (!province || !district || !subdistrict || !houseNo) {
      if (typeof AppDialog !== "undefined") {
        AppDialog.alert(
          "กรุณากรอกข้อมูลที่อยู่ให้ครบถ้วนก่อนคำนวณพิกัด (ต้องการ: จังหวัด, อำเภอ, ตำบล, และบ้านเลขที่)",
          "ข้อมูลไม่ครบถ้วน",
          "warning"
        );
      } else {
        alert("กรุณากรอกข้อมูลที่อยู่ให้ครบถ้วนก่อนคำนวณพิกัด (ต้องการ: จังหวัด, อำเภอ, ตำบล, และบ้านเลขที่)");
      }
      return;
    }

    if (typeof AppLoading !== "undefined") AppLoading.show("กำลังคำนวณพิกัดที่แม่นยำจากที่อยู่...");

    const payload = Object.fromEntries(new FormData(form).entries());
    const latlng = await asyncGetLatLngFromAddress(payload);

    if (typeof AppLoading !== "undefined") AppLoading.hide();

    if (latlng && latlng !== "-") {
      const [latVal, lngVal] = latlng.split(",").map(s => s.trim());
      if (form.elements.lat) form.elements.lat.value = latVal || "";
      if (form.elements.lng) form.elements.lng.value = lngVal || "";
      
      if (typeof AppDialog !== "undefined") {
        AppDialog.alert(`คำนวณพิกัดสำเร็จ:\nละติจูด (Latitude): ${latVal}\nลองจิจูด (Longitude): ${lngVal}`, "คำนวณพิกัดสำเร็จ", "success");
      } else {
        alert(`คำนวณพิกัดสำเร็จ:\nละติจูด (Latitude): ${latVal}\nลองจิจูด (Longitude): ${lngVal}`);
      }
    } else {
      if (typeof AppDialog !== "undefined") {
        AppDialog.alert("ไม่สามารถคำนวณพิกัดของที่อยู่นี้ได้ กรุณาตรวจสอบความถูกต้องของข้อมูล", "คำนวณพิกัดล้มเหลว", "warning");
      } else {
        alert("ไม่สามารถคำนวณพิกัดของที่อยู่นี้ได้ กรุณาตรวจสอบความถูกต้องของข้อมูล");
      }
    }
  });
}

// =========================================================
// แก้ไขฟังก์ชัน setupAddressSelects ให้ดึงจากข้อมูลฐานข้อมูล
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
    });
  });
}




function calculateLatLngFromAddress(payload) {
  const provinceCenters = {
    "กรุงเทพมหานคร": [13.7563, 100.5018],
    "นครสวรรค์": [15.7047, 100.1372],
    "อุทัยธานี": [15.3831, 100.0253],
    "ชัยนาท": [15.1852, 100.1251],
    "พิจิตร": [16.4428, 100.3489],
    "กำแพงเพชร": [16.4828, 99.5228],
    "ลพบุรี": [14.7995, 100.6534],
    "พิษณุโลก": [16.8212, 100.2659],
    "สุพรรณบุรี": [14.4745, 100.1176],
    "เชียงใหม่": [18.7883, 98.9853],
    "เชียงราย": [19.9071, 99.8325],
    "นนทบุรี": [13.8591, 100.4927],
    "ปทุมธานี": [14.0208, 100.5250],
    "สมุทรปราการ": [13.5991, 100.5968],
    "สมุทรสาคร": [13.5475, 100.2744],
    "ขอนแก่น": [16.4322, 102.8236],
    "นครราชสีมา": [14.9799, 102.0979],
    "อุบลราชธานี": [15.2287, 104.8564],
    "อุดรธานี": [17.4138, 102.7872],
    "ชลบุรี": [13.3611, 100.9847],
    "ระยอง": [12.6814, 101.2813],
    "เพชรบุรี": [13.1118, 99.9444],
    "ประจวบคีรีขันธ์": [11.8124, 99.7972],
    "ภูเก็ต": [7.8804, 98.3922],
    "สุราษฎร์ธานี": [9.1396, 99.3331],
    "สงขลา": [7.1898, 100.5954],
    "นครศรีธรรมราช": [8.4304, 99.9631],
    "ยะลา": [6.5399, 101.2814],
    "ตาก": [16.8839, 99.1258],
    "แพร่": [18.1446, 100.1403],
    "น่าน": [18.7830, 100.7816]
  };

  const districtCoords = {
    "เมืองนครสวรรค์": [15.7047, 100.1372], "โกรกพระ": [15.5559, 100.0712], "ชุมแสง": [15.8918, 100.3079], "หนองบัว": [15.8645, 100.3238],
    "บรรพตพิสัย": [15.9362, 99.9815], "เก้าเลี้ยว": [15.8506, 100.0794], "ตาคลี": [15.2633, 100.3438], "ท่าตะโก": [15.6422, 100.4789],
    "ไพศาลี": [15.6008, 100.6551], "พยุหะคีรี": [15.4552, 100.1358], "ลาดยาว": [15.7511, 99.7897], "ตากฟ้า": [15.3499, 100.4956],
    "แม่วงก์": [15.7811, 99.5205], "แม่เปิน": [15.6578, 99.4687], "ชุมตาบง": [15.6333, 99.5534]
  };

  const cleanProv = String(payload.province || "").replace(/^(จังหวัด|จ\.)/, "").trim();
  const cleanDist = String(payload.district || "").replace(/^(อำเภอ|อ\.)/, "").trim();

  let base = districtCoords[cleanDist];
  if (!base) {
    base = provinceCenters[cleanProv] || [13.7563, 100.5018];
  }

  const source = `${payload.houseNo || ""}${payload.moo || ""}${payload.subdistrict || ""}${cleanDist}`;
  const hash = [...source].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const lat = base[0] + ((hash % 23) - 11) / 1000;
  const lng = base[1] + ((hash % 29) - 14) / 1000;
  return `${lat.toFixed(5)},${lng.toFixed(5)}`;
}

async function asyncGetLatLngFromAddress(payload) {
  const subdistrict = (payload.subdistrict || "").trim();
  const district = (payload.district || "").trim();
  const province = (payload.province || "").trim();
  const houseNo = (payload.houseNo || "").trim();
  const moo = (payload.moo || "").trim();
  const villageName = (payload.villageName || "").trim();
  const road = (payload.road || "").trim();

  const cleanSub = subdistrict.replace(/^(ตำบล|ต\.)/, "").trim();
  const cleanDist = district.replace(/^(อำเภอ|อ\.)/, "").trim();
  const cleanProv = province.replace(/^(จังหวัด|จ\.)/, "").trim();

  const queries = [];

  // Stage 1: Full address (with HouseNo, Moo, Village Name, Road, Subdistrict, District, Province)
  let q1Parts = [];
  if (houseNo) q1Parts.push(`บ้านเลขที่ ${houseNo}`);
  if (moo) q1Parts.push(`หมู่ที่ ${moo}`);
  if (villageName) q1Parts.push(villageName);
  if (road) q1Parts.push(road);
  if (cleanSub) q1Parts.push(`ตำบล${cleanSub}`);
  if (cleanDist) q1Parts.push(`อำเภอ${cleanDist}`);
  if (cleanProv) q1Parts.push(`จังหวัด${cleanProv}`);
  q1Parts.push("ประเทศไทย");
  queries.push(q1Parts.join(" "));

  // Stage 2: Village name, Subdistrict, District, Province
  if (villageName) {
    let q2Parts = [villageName];
    if (cleanSub) q2Parts.push(`ตำบล${cleanSub}`);
    if (cleanDist) q2Parts.push(`อำเภอ${cleanDist}`);
    if (cleanProv) q2Parts.push(`จังหวัด${cleanProv}`);
    q2Parts.push("ประเทศไทย");
    queries.push(q2Parts.join(" "));
  }

  // Stage 3: Subdistrict, District, Province
  if (cleanSub && cleanDist && cleanProv) {
    queries.push(`ตำบล${cleanSub} อำเภอ${cleanDist} จังหวัด${cleanProv} ประเทศไทย`);
  }

  // Stage 4: District, Province
  if (cleanDist && cleanProv) {
    queries.push(`อำเภอ${cleanDist} จังหวัด${cleanProv} ประเทศไทย`);
  }

  // Stage 5: Province
  if (cleanProv) {
    queries.push(`จังหวัด${cleanProv} ประเทศไทย`);
  }

  for (let i = 0; i < queries.length; i++) {
    const q = queries[i];
    try {
      if (i > 0) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=1`, {
        headers: {
          'Accept-Language': 'th,en',
          'User-Agent': 'VSAFE-App/1.0 (psychiatric-monitoring-system)'
        }
      });
      const data = await response.json();
      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lon = parseFloat(data[0].lon);
        console.log(`Geocoding succeeded at stage ${i + 1} with query: "${q}" -> [${lat}, ${lon}]`);
        return `${lat.toFixed(5)},${lon.toFixed(5)}`;
      }
    } catch (e) {
      console.error(`Geocoding failed at stage ${i + 1} for query: "${q}"`, e);
    }
  }

  return calculateLatLngFromAddress(payload);
}

function statusByZone(zone) {
  if (zone === "RED") return "รอการติดต่อ";
  if (zone === "YELLOW") return "เฝ้าระวัง";
  return "ติดตามต่อเนื่อง";
}

function patientCurrentRows() {
  const now = Date.now();
  // คืนค่า Cache ถ้ายังใหม่อยู่
  if (_cachedPatientRows && (now - _rowsCacheTime) < ROWS_CACHE_TTL) {
    return _cachedPatientRows;
  }
  const patients = storage.get("patients", []);
  const assessments = storage.get("assessments", []);
  _cachedPatientRows = patients.map((patient) => {
    const latest = assessments
      .filter((assessment) => assessment.patientCode === patient.patientCode)
      .sort((a, b) => timestampMs(b.createdAt) - timestampMs(a.createdAt))[0];
    const score = Number(latest?.score ?? patient.lastScore ?? patient.baselineScore ?? 0);
    const zone = latest?.zone || patient.lastZone || classifyRisk(score);
    return {
      ...patient,
      score, zone,
      status: latest?.status || patient.status || statusByZone(zone),
      updatedAt: latest?.createdAt || patient.updatedAt || patient.createdAt || patient.dischargeDate || thaiTimestamp()
    };
  });
  _rowsCacheTime = now;
  return _cachedPatientRows;
}

/** ล้าง Cache patientCurrentRows (เรียกเมื่อมีข้อมูลใหม่) */
function invalidatePatientRowsCache() {
  _cachedPatientRows = null;
  _rowsCacheTime = 0;
}

function renderDashboard() {
  if (!document.body.classList.contains("admin-body")) return;
  // Debounce: รวม render ซ้ำๆ ที่เกิดขึ้นติดๆ กันให้เป็นครั้งเดียว
  if (_dashDebounceTimer) clearTimeout(_dashDebounceTimer);
  _dashDebounceTimer = setTimeout(() => {
    _dashDebounceTimer = null;
    invalidatePatientRowsCache();
    const rows = patientCurrentRows();
    renderOverview(rows);
    renderTrend(rows);
    renderMap(rows);
    renderPriorityTable();
    renderDashboardAlerts();
    showUnacknowledgedSos();

    // อัปเดตรายการแจ้งเตือนเมื่ออยู่ในหน้าจอแจ้งเตือน
    const activeViewBtn = document.querySelector(".side-nav [data-admin-view].active");
    if (activeViewBtn && activeViewBtn.dataset.adminView === "alerts") {
      renderAlertFeed();
    }
  }, 150);
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
let mapMarkersByHN = {};

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

    // --- เพิ่มระบบค้นหาผู้ป่วยและพื้นที่บนแผนที่ ---
    const searchPatientInput = document.getElementById("mapSearchPatientInput");
    const searchPatientBtn = document.getElementById("mapSearchPatientBtn");
    const searchAreaInput = document.getElementById("mapSearchAreaInput");
    const searchAreaBtn = document.getElementById("mapSearchAreaBtn");
    
    const performPatientSearch = () => {
      const query = searchPatientInput.value.trim().toLowerCase();
      if (!query) return;

      const cleanHn = query.replace(/\s+/g, "").toUpperCase();
      const targetMarker = mapMarkersByHN[cleanHn] || mapMarkersByHN[cleanHn + "SMIV"];
      
      if (targetMarker) {
        leafletMapInstance.flyTo(targetMarker.getLatLng(), 16, { animate: true, duration: 1.5 });
        setTimeout(() => {
          markerClusterGroup.zoomToShowLayer(targetMarker, () => {
            targetMarker.openPopup();
          });
        }, 1200);
        return;
      }

      // ค้นหาแบบ HN บางส่วน
      const matchingHnKey = Object.keys(mapMarkersByHN).find(key => key.includes(cleanHn));
      if (matchingHnKey) {
        const matchedMarker = mapMarkersByHN[matchingHnKey];
        leafletMapInstance.flyTo(matchedMarker.getLatLng(), 16, { animate: true, duration: 1.5 });
        setTimeout(() => {
          markerClusterGroup.zoomToShowLayer(matchedMarker, () => {
            matchedMarker.openPopup();
          });
        }, 1200);
        return;
      }

      if (typeof AppDialog !== "undefined") {
        AppDialog.alert("ไม่พบข้อมูลผู้ป่วยที่มี HN หรือ รหัสผู้ป่วยนี้บนแผนที่", "ไม่พบผลลัพธ์", "info");
      } else {
        alert("ไม่พบข้อมูลผู้ป่วยที่มี HN หรือ รหัสผู้ป่วยนี้บนแผนที่");
      }
    };

    const performAreaSearch = async () => {
      const query = searchAreaInput.value.trim();
      if (!query) return;

      let searchQ = query;
      if (!searchQ.toLowerCase().includes("thailand") && !searchQ.includes("ประเทศไทย")) {
        searchQ += " ประเทศไทย";
      }

      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQ)}&limit=1`, {
          headers: {
            'Accept-Language': 'th,en'
          }
        });
        const data = await response.json();
        if (data && data.length > 0) {
          const lat = parseFloat(data[0].lat);
          const lon = parseFloat(data[0].lon);
          
          let zoomLevel = 12; // default for district
          const queryLower = query.toLowerCase();
          if (queryLower.includes("จังหวัด") || queryLower.includes("จ.") || queryLower.includes("province") || 
              (data[0].class === "boundary" && data[0].type === "administrative" && data[0].importance > 0.6)) {
            zoomLevel = 9;
          }

          leafletMapInstance.flyTo([lat, lon], zoomLevel, { animate: true, duration: 1.5 });
        } else {
          throw new Error("No results found on Nominatim");
        }
      } catch (error) {
        console.error("Geocoding area search error, using local coordinates:", error);
        const districtCoords = {
          "เมืองนครสวรรค์": [15.7047, 100.1372], "โกรกพระ": [15.5559, 100.0712], "ชุมแสง": [15.8918, 100.3079], "หนองบัว": [15.8645, 100.3238],
          "บรรพตพิสัย": [15.9362, 99.9815], "เก้าเลี้ยว": [15.8506, 100.0794], "ตาคลี": [15.2633, 100.3438], "ท่าตะโก": [15.6422, 100.4789],
          "ไพศาลี": [15.6008, 100.6551], "พยุหะคีรี": [15.4552, 100.1358], "ลาดยาว": [15.7511, 99.7897], "ตากฟ้า": [15.3499, 100.4956],
          "แม่วงก์": [15.7811, 99.5205], "แม่เปิน": [15.6578, 99.4687], "ชุมตาบง": [15.6333, 99.5534]
        };
        let normQuery = query.replace(/^(อำเภอ|อ\.|จังหวัด|จ\.)/, "").trim();
        const matchedDistrict = Object.keys(districtCoords).find(d => d.includes(normQuery) || normQuery.includes(d));
        if (matchedDistrict) {
          leafletMapInstance.flyTo(districtCoords[matchedDistrict], 12, { animate: true, duration: 1.5 });
        } else if (normQuery.includes("นครสวรรค์")) {
          leafletMapInstance.flyTo([15.7047, 100.1372], 9, { animate: true, duration: 1.5 });
        } else {
          if (typeof AppDialog !== "undefined") {
            AppDialog.alert("ไม่พบพิกัดของพื้นที่นี้ กรุณาตรวจสอบคำค้นหา", "ไม่พบผลลัพธ์", "info");
          } else {
            alert("ไม่พบพิกัดของพื้นที่นี้");
          }
        }
      }
    };

    searchPatientBtn?.addEventListener("click", performPatientSearch);
    searchPatientInput?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        performPatientSearch();
      }
    });

    searchAreaBtn?.addEventListener("click", performAreaSearch);
    searchAreaInput?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        performAreaSearch();
      }
    });
  }

  // 2. เคลียร์หมุดเก่า
  markerClusterGroup.clearLayers();
  mapMarkersByHN = {};

  // 3. วาดหมุดผู้ป่วย
  const points = rows.map((row) => {
    let latlng = row.latlng;
    if (!latlng || latlng === "-" || String(latlng).trim() === "") {
      latlng = calculateLatLngFromAddress(row);
    }
    return { ...row, coords: parseLatLng(latlng) };
  }).filter((row) => row.coords);
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

    // บันทึกการอ้างอิงหมุดด้วย HN และ Patient Code เพื่อใช้ในการค้นหา
    if (row.hn) {
      mapMarkersByHN[normalizePatientCode(row.hn)] = marker;
    }
    if (row.patientCode) {
      mapMarkersByHN[normalizePatientCode(row.patientCode)] = marker;
    }
  });
}

// ฟังก์ชันแยก String "15.xxx, 100.yyy" ออกมาเป็น Array ตัวเลข
function parseLatLng(value = "") {
  const [lat, lng] = String(value).split(",").map((item) => Number(item.trim()));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return [lat, lng];
}

// 2. ฟังก์ชันเรนเดอร์แจ้งเตือนในหน้า Dashboard (บล็อกการแจ้งเตือนล่าสุด)
function renderDashboardAlerts() {
  const container = document.querySelector("#dashboardAlertFeed") || document.querySelector("#dashAlertList") || document.querySelector(".dash-alert-list");
  if (!container) return;
  
  const allAlerts = storage.get("alerts", []);
  
  // เรียงจากใหม่ไปเก่า และแสดงไม่เกิน 10 รายการล่าสุด (รวมทั้งที่รับทราบแล้วและยังไม่ได้รับทราบ)
  const recentAlerts = allAlerts
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 10);

  if (recentAlerts.length === 0) {
    container.innerHTML = `<div class="muted-box" style="margin-top: 1rem;">ไม่มีการแจ้งเตือนใหม่</div>`;
    return;
  }

  container.innerHTML = recentAlerts.map(alert => {
    const isRed = alert.zone === "RED";
    const isActive = isAlertActive(alert);
    const borderClass = isRed ? "alert-red" : "alert-yellow";
    
    // สไตล์สำหรับการแจ้งเตือนที่รับทราบแล้ว (dimmed style & gray status dot)
    const opacityStyle = isActive ? "" : "opacity: 0.6; border-left-color: #64748b;";
    const dotStyle = isActive ? "" : "background-color: #64748b;";
    const statusText = isActive ? `${alert.zone || "RED"} ZONE` : `${alert.zone || "RED"} (รับทราบแล้ว)`;

    return `
      <article class="alert-item ${borderClass}" style="cursor: pointer; transition: transform 0.2s; ${opacityStyle}" onclick="showPatientDetail('${escapeHtml(alert.patientCode)}')">
        <div class="status-dot" style="${dotStyle}"></div>
        <div class="alert-info">
          <strong>${statusText} | HN ${escapeHtml(alert.hn || "-")} | ${escapeHtml(alert.dx || "-")}</strong>
          <small>${alert.score || 0} คะแนน | อ.${escapeHtml(alert.district || "-")}</small>
        </div>
        <div style="margin-left: auto; color: #64748b; display: flex; align-items: center;" title="คลิกเพื่อดูข้อมูลผู้ป่วย">
          <svg style="width: 1.25rem; height: 1.25rem;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
        </div>
      </article>
    `;
  }).join("");
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

async function updatePatientStatus(patientCode, status) {
  const saved = await saveToCloudOrAlert("updateStatus", { patientCode, status }, "ไม่สามารถอัปเดตสถานะผู้ป่วยในฐานข้อมูลได้");
  if (!saved) {
    renderPriorityTable();
    return;
  }
  renderAlertFeed();
  renderDashboardAlerts();
  renderPriorityTable();
}

// =========================================================
// แก้ไขระบบแสดงผลรายละเอียดที่อยู่ผู้ป่วยแบบเต็มตัว ในตารางและหน้ารายละเอียด
// =========================================================
// 1. ฟังก์ชันแสดงรายละเอียดผู้ป่วย (ชุดที่คุณต้องการ)
function showPatientDetail(patientCode) {
  // 1. ตรวจสอบข้อมูลจาก storage
  const row = storage.get("patients", []).find((p) => p.patientCode === patientCode);
  if (!row) {
    AppDialog.alert("ไม่พบข้อมูลผู้ป่วย", "ข้อผิดพลาด", "warning");
    return;
  }

  // 2. หาข้อมูลผู้ดูแลและ Case Manager
  const cm = storage.get("caseManagers", []).find(item => item.district === row.district) || null;
  const caregivers = getCaregiversByPatient(row.patientCode);

  // 3. ประกอบที่อยู่
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

  // 4. --- ส่วนที่แก้ไขเพื่อป้องกัน Error ---
  // เช็คว่ามี row.zone หรือไม่ ถ้าไม่มีให้ไปดู row.lastZone ถ้าไม่มีอีกให้เป็น "GREEN"
  const currentZone = row.zone || row.lastZone || "GREEN"; 
  const currentScore = row.score || row.lastScore || 0;

  // 5. แสดงผล (ใช้ currentZone แทน row.zone)
  showAdminDetail(`
    <div class="detail-summary ${zoneClass(currentZone)}">
      <span class="risk-badge ${zoneClass(currentZone)}">${currentZone}</span>
      <h2>${escapeHtml(row.prefix || "")}${escapeHtml(row.fullName || "")}</h2>
      <p>HN ${escapeHtml(row.hn || "-")} | Dx ${escapeHtml(row.dx || "-")} | ${currentScore} คะแนน</p>
    </div>
    <div class="detail-grid-admin">
      ${detailItem("รหัสผู้ป่วย", row.patientCode)}
      ${detailItem("เพศ", row.gender || "-")}
      ${detailItem("วันเกิด / อายุ", `${row.dob ? formatThaiDateTime(row.dob, true) : "-"} / ${calculateAge(row.dob) || "-"} ปี`)}
      ${detailItem("วันที่จำหน่าย", row.dischargeDate ? formatThaiDateTime(row.dischargeDate, true) : "-")}
      ${detailItem("ประวัติความรุนแรง", row.violenceHistoryDate ? formatThaiDateTime(row.violenceHistoryDate, true) : "-")}
      ${detailItem("สารเสพติด", row.substanceUse === "ใช้" ? `ใช้: ${row.substanceDetail || "-"}` : "ไม่ใช้")}
      ${detailItem("ที่อยู่", fullAddressDisplay)}
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

// 2. ฟังก์ชันเสริม (Dependencies) เพื่อให้ฟังก์ชันข้างบนทำงานได้
function detailItem(label, value) {
  return `<div class="detail-item"><strong>${label}:</strong> <span>${value}</span></div>`;
}

function calculateAge(dob) {
  if (!dob) return null;
  const ceDob = toIsoDateString(dob);
  const birthDate = new Date(ceDob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
  return age;
}

function toIsoDateString(value) {
  if (!value) return "";
  let str = String(value).trim();
  
  // Check if it has T (ISO timestamp) and extract date part
  const tIndex = str.indexOf("T");
  if (tIndex > -1) str = str.substring(0, tIndex);

  let match = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (match) {
    let year = parseInt(match[1], 10);
    let month = String(parseInt(match[2], 10)).padStart(2, '0');
    let day = String(parseInt(match[3], 10)).padStart(2, '0');
    if (year > 2400) year -= 543;
    return `${year}-${month}-${day}`;
  }
  
  match = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (match) {
    let day = String(parseInt(match[1], 10)).padStart(2, '0');
    let month = String(parseInt(match[2], 10)).padStart(2, '0');
    let year = parseInt(match[3], 10);
    if (year > 2400) year -= 543;
    return `${year}-${month}-${day}`;
  }
  
  const date = new Date(str);
  if (isNaN(date.getTime())) return str;
  
  let year = date.getFullYear();
  if (year > 2400) year -= 543;
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatThaiDateTime(value, dateOnly = false) {
  if (!value) return "-";
  
  let normalizedValue = value;
  if (typeof value === "string") {
    const match = value.match(/^(\d{4})/);
    if (match) {
      let y = parseInt(match[1], 10);
      if (y > 2400) {
        normalizedValue = (y - 543) + value.slice(4);
      }
    }
  }
  
  const date = new Date(normalizedValue);
  if (Number.isNaN(date.getTime())) return "-";
  
  const isDateOnly = dateOnly || (typeof value === "string" && value.length <= 10 && !value.includes("T"));
  
  if (isDateOnly) {
    if (typeof normalizedValue === "string") {
      const parts = normalizedValue.split("T")[0].split(/[-/]/);
      if (parts.length === 3) {
        let y = parseInt(parts[0], 10);
        let m = parseInt(parts[1], 10) - 1;
        let d = parseInt(parts[2], 10);
        const localDate = new Date(y, m, d);
        return new Intl.DateTimeFormat("th-TH-u-ca-buddhist", {
          year: "numeric",
          month: "long",
          day: "numeric"
        }).format(localDate);
      }
    }
    return new Intl.DateTimeFormat("th-TH-u-ca-buddhist", {
      year: "numeric",
      month: "long",
      day: "numeric"
    }).format(date);
  } else {
    let displayDate = date;
    if (date.getFullYear() > 2400) {
      displayDate = new Date(date);
      displayDate.setFullYear(date.getFullYear() - 543);
    }
    return new Intl.DateTimeFormat("th-TH-u-ca-buddhist", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }).format(displayDate);
  }
}

function initDateInputHelpers(container = document) {
  const dateInputs = container.querySelectorAll('input[type="date"]');
  dateInputs.forEach(input => {
    let helper = input.parentNode.querySelector('.be-date-helper');
    if (!helper) {
      helper = document.createElement('div');
      helper.className = 'be-date-helper';
      helper.style.fontSize = '0.82rem';
      helper.style.color = '#0f766e';
      helper.style.marginTop = '0.25rem';
      helper.style.fontWeight = '500';
      input.parentNode.appendChild(helper);
    }

    const updateHelper = () => {
      const val = input.value;
      if (val) {
        const formatted = formatThaiDateTime(val, true);
        helper.textContent = `แสดงผล พ.ศ.: ${formatted}`;
      } else {
        helper.textContent = 'แสดงผล พ.ศ.: ยังไม่ได้เลือกวันที่';
      }
    };

    updateHelper();

    input.removeEventListener('input', updateHelper);
    input.addEventListener('input', updateHelper);
    input.removeEventListener('change', updateHelper);
    input.addEventListener('change', updateHelper);
  });
}

function getCaregiversByPatient(patientCode) {
  const allCaregivers = storage.get("caregivers", []);
  return allCaregivers.filter(cg => {
    let codes = cg.patientCodes;
    if (typeof codes === 'string') {
        try { codes = JSON.parse(codes); } catch (e) { codes = []; }
    }
    return Array.isArray(codes) && codes.includes(patientCode);
  });
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
  
  const deleted = await saveToCloudOrAlert("deleteCaseManager", { id }, "ไม่สามารถลบข้อมูลโรงพยาบาลออกจากฐานข้อมูลได้");
  if (!deleted) return;
  
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
  
  const deleted = await saveToCloudOrAlert("deletePatient", { patientCode }, "ไม่สามารถลบข้อมูลผู้ป่วยออกจากฐานข้อมูลได้");
  if (!deleted) return;
  
  renderAdminPatientTable();
  renderDashboard();
  AppDialog.alert("ลบข้อมูลผู้ป่วยเรียบร้อยแล้ว", "สำเร็จ", "success");
}

function renderAlertFeed() {
  const container = document.querySelector("#alertFeed");
  if (!container) return;
  
  const allAlerts = storage.get("alerts", []);
  const sortedAlerts = allAlerts
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  
  if (sortedAlerts.length === 0) {
    container.innerHTML = `<div class="muted-box">ไม่มีประวัติการแจ้งเตือนในขณะนี้</div>`;
    return;
  }

  container.innerHTML = sortedAlerts.map(alert => {
    const zoneClass = alert.zone || "RED";
    const isActive = isAlertActive(alert);
    const ackButton = isActive
      ? `<button class="action-btn primary-btn" onclick="acknowledgeSos('${alert.alertId}')">รับทราบ</button>`
      : `<span class="status-badge acknowledged">✓ รับทราบแล้ว</span>`;

    return `
      <div class="alert-item-card ${zoneClass.toLowerCase()} ${isActive ? 'active' : 'acknowledged'}">
        <div class="alert-card-main" onclick="showPatientDetail('${escapeHtml(alert.patientCode)}')">
          <div class="alert-card-header">
            <span class="risk-badge ${zoneClass.toLowerCase()}">${zoneClass} ZONE</span>
            <span class="hn-label">HN: <strong>${escapeHtml(alert.hn || "-")}</strong></span>
            <span class="score-badge">คะแนน: <strong>${alert.score || 0}</strong></span>
          </div>
          <div class="alert-card-body">
            <span class="area-label">📍 อ.${escapeHtml(alert.district || "-")}</span>
            <span class="date-label">📅 ${formatThaiDateTime(alert.createdAt)}</span>
          </div>
        </div>
        <div class="alert-card-actions">
          <button class="action-btn view-btn" onclick="showPatientDetail('${escapeHtml(alert.patientCode)}')">ดูข้อมูล</button>
          ${ackButton}
        </div>
      </div>
    `;
  }).join("");
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
  // ดักจับ: เช็คว่าเป็น String เท่านั้น เพื่อป้องกันบั๊ก Event Object จากการกดปุ่มซ้ำซ้อน
  if (!alertId || typeof alertId !== "string") return; 

  // อัปเดต UI ให้หายไปทันที
  const alerts = storage.get("alerts", []);
  const updatedAlerts = alerts.map((alert) => 
    (alert.alertId === alertId ? { ...alert, acknowledged: true, status: alert.status || "รับทราบภารกิจแล้ว" } : alert)
  );
  storage.set("alerts", updatedAlerts);

  // ปิดเสียงและหน้าต่าง
  if (typeof stopAlarm === "function") stopAlarm();
  document.querySelector("#sosDialog")?.close();
  
  // โหลดรายการแจ้งเตือนใหม่ (ให้รายการที่รับทราบแล้วหายไป)
  renderAlertFeed();
  if (typeof renderDashboardAlerts === "function") renderDashboardAlerts();

  // ส่งค่าไปอัปเดตที่ Google Sheets
  try {
    const res = await apiPost("acknowledgeAlert", { alertId: alertId });
    if (!res.ok) {
       console.warn("หมายเหตุ: บันทึกรับทราบในฐานข้อมูลล้มเหลว หรือ Alert นี้ถูกรับทราบไปแล้ว");
    }
  } catch (err) {
    console.error("การเชื่อมต่อมีปัญหา");
  }
}
// ฟังก์ชันช่วยเช็คสถานะการรับทราบ (รองรับข้อความ "FALSE" จาก Google Sheets)
function isAlertActive(alert) {
  if (!alert) return false;
  if (alert.acknowledged === true) return false;
  if (String(alert.acknowledged).toUpperCase() === "TRUE") return false;
  return true;
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

// =========================================================
// KNOWLEDGE MANAGEMENT ADMIN MODULE
// =========================================================

let kmActiveCat = "ALL";
let kmActiveZone = "ALL";
let kmFormInitialized = false; // Guard: attach listeners only once

/** 9 default categories — used as fallback if DB returns nothing */
const KM_DEFAULT_CATEGORIES = [
  { categoryId: "CAT-01", name: "รู้โรค",       order: 1 },
  { categoryId: "CAT-02", name: "อารมณ์ดี",     order: 2 },
  { categoryId: "CAT-03", name: "คุยกัน",       order: 3 },
  { categoryId: "CAT-04", name: "กิจวัตร",      order: 4 },
  { categoryId: "CAT-05", name: "ปลอดยา",       order: 5 },
  { categoryId: "CAT-06", name: "ใจสบาย",       order: 6 },
  { categoryId: "CAT-07", name: "ตกลงกัน",      order: 7 },
  { categoryId: "CAT-08", name: "ปลอดภัย",      order: 8 },
  { categoryId: "CAT-09", name: "อยู่ร่วมกัน",  order: 9 }
];

/** Return sorted categories — always falls back to the 9 defaults */
function getKmCategories() {
  let cats = storage.get("knowledgeCategories", []);
  if (!Array.isArray(cats) || cats.length === 0) {
    // Seed the defaults into local storage so next call is instant
    storage.set("knowledgeCategories", KM_DEFAULT_CATEGORIES);
    cats = KM_DEFAULT_CATEGORIES;
  }
  return [...cats].sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
}

function renderKnowledgeAdmin() {
  buildKmCategoryTabs();
  buildKmZoneFilter();
  renderKmContentGrid();
  initKnowledgeForm(); // safe — guarded against duplicate listeners
}

/** สร้าง Tab หมวดหมู่ */
function buildKmCategoryTabs() {
  const tabBar = document.querySelector("#kmCategoryTabs");
  if (!tabBar) return;

  const sorted = getKmCategories();

  tabBar.innerHTML = `<button class="km-tab ${kmActiveCat === "ALL" ? "active" : ""}" data-km-cat="ALL">ทั้งหมด</button>` +
    sorted.map(c => `<button class="km-tab ${kmActiveCat === c.categoryId ? "active" : ""}" data-km-cat="${c.categoryId}">${escapeHtml(c.name)}</button>`).join("");

  tabBar.querySelectorAll(".km-tab").forEach(btn => {
    btn.addEventListener("click", () => {
      kmActiveCat = btn.dataset.kmCat;
      tabBar.querySelectorAll(".km-tab").forEach(t => t.classList.toggle("active", t === btn));
      renderKmContentGrid();
    });
  });
}

/**
 * Populate (or re-populate) the category <select> inside the knowledge form.
 * Called every time the form opens — ensures fresh options after async sync.
 * If no categories exist in storage, seeds the 9 defaults first.
 */
function populateKmCategoryDropdown(selectedId) {
  const catSelect = document.querySelector("#knowledgeForm select[name='categoryId']");
  if (!catSelect) return;

  const sorted = getKmCategories();

  if (sorted.length === 0) {
    catSelect.innerHTML = `<option value="">ไม่สามารถโหลดหมวดหมู่ได้ กรุณาลองใหม่อีกครั้ง</option>`;
    return;
  }

  catSelect.innerHTML = `<option value="">-- เลือกหมวดหมู่ --</option>` +
    sorted.map(c => `<option value="${c.categoryId}" ${c.categoryId === selectedId ? "selected" : ""}>${escapeHtml(c.name)}</option>`).join("");
}

/** Zone filter button interactions */
function buildKmZoneFilter() {
  document.querySelectorAll(".km-zone-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      kmActiveZone = btn.dataset.kmZone;
      document.querySelectorAll(".km-zone-btn").forEach(b => b.classList.toggle("active", b === btn));
      renderKmContentGrid();
    });
  });
}

/** Get category name by ID */
function getKmCategoryName(categoryId) {
  const cats = storage.get("knowledgeCategories", []);
  const cat = cats.find(c => c.categoryId === categoryId);
  return cat ? cat.name : categoryId;
}

/** Render content grid with filters */
function renderKmContentGrid() {
  const grid = document.querySelector("#knowledgeContentGrid");
  if (!grid) return;

  let contents = storage.get("knowledgeContent", []);

  // Filter by category
  if (kmActiveCat !== "ALL") {
    contents = contents.filter(c => c.categoryId === kmActiveCat);
  }

  // Filter by zone
  if (kmActiveZone !== "ALL") {
    contents = contents.filter(c => {
      const z = (c.zoneTarget || "ALL");
      return z === "ALL" || z === kmActiveZone || z.split(",").map(v => v.trim()).includes(kmActiveZone);
    });
  }

  // Sort by order then createdAt
  contents.sort((a, b) => Number(a.order || 99) - Number(b.order || 99));

  if (contents.length === 0) {
    grid.innerHTML = `<div class="km-empty-state">📚 ยังไม่มีเนื้อหาในหมวดนี้ กด "เพิ่มเนื้อหาใหม่" เพื่อเริ่มต้น</div>`;
    return;
  }

  grid.innerHTML = contents.map(c => renderKmCard(c)).join("");

  // Bind edit/delete buttons
  grid.querySelectorAll("[data-km-edit]").forEach(btn => {
    btn.addEventListener("click", () => openKnowledgeEditForm(btn.dataset.kmEdit));
  });
  grid.querySelectorAll("[data-km-delete]").forEach(btn => {
    btn.addEventListener("click", () => deleteKnowledgeContent(btn.dataset.kmDelete));
  });
}

/** Build HTML for a single knowledge card */
function renderKmCard(c) {
  const catName = getKmCategoryName(c.categoryId);
  const zoneMap = { GREEN: "🟢 เขียว", YELLOW: "🟡 เหลือง", RED: "🔴 แดง", ALL: "🌐 ทุกโซน" };
  const zone = c.zoneTarget || "ALL";
  const label = zone.split(",").map(z => zoneMap[z.trim()] || z.trim()).join(" + ");
  const accentClass = zone.includes(",") ? "YELLOW" : zone;
  const statusBadge = c.status === "draft"
    ? `<span class="km-status-badge draft">ฉบับร่าง</span>`
    : `<span class="km-status-badge published">เผยแพร่</span>`;

  // Thumbnail
  let thumb = `<div class="km-card-thumb">📄</div>`;
  if (c.contentType === "image" && c.imageUrl) {
    thumb = `<div class="km-card-thumb"><img src="${escapeHtml(c.imageUrl)}" alt="${escapeHtml(c.title)}" loading="lazy" /></div>`;
  } else if ((c.contentType === "video_file" || c.contentType === "video_link") && c.videoUrl) {
    const ytEmbed = getYoutubeEmbedUrl(c.videoUrl);
    if (ytEmbed) {
      thumb = `<div class="km-card-thumb"><iframe src="${ytEmbed}" loading="lazy" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>`;
    } else {
      thumb = `<div class="km-card-thumb">🎬</div>`;
    }
  }

  return `
    <article class="km-card">
      <div class="km-card-accent ${accentClass}"></div>
      ${thumb}
      <div class="km-card-body">
        <span class="km-card-category">${escapeHtml(catName)}</span>
        <p class="km-card-title">${escapeHtml(c.title || "-")}</p>
        <p class="km-card-desc">${escapeHtml(c.description || "")}</p>
        <span class="km-zone-badge ${accentClass}">${label}</span>
        ${statusBadge}
      </div>
      <div class="km-card-footer">
        <button class="km-btn-edit" data-km-edit="${escapeHtml(c.contentId)}">✏️ แก้ไข</button>
        <button class="km-btn-delete" data-km-delete="${escapeHtml(c.contentId)}">🗑️ ลบ</button>
      </div>
    </article>`;
}

/** Convert YouTube URL to embed URL */
function getYoutubeEmbedUrl(url) {
  if (!url) return null;
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (match) return `https://www.youtube.com/embed/${match[1]}`;
  return null;
}

/** Init knowledge form events — guarded so listeners are attached only ONCE */
function initKnowledgeForm() {
  if (kmFormInitialized) return; // prevent duplicate listeners on repeated nav clicks
  kmFormInitialized = true;

  // Open form button
  document.querySelector("#openKnowledgeForm")?.addEventListener("click", () => {
    openKnowledgeAddForm();
  });

  // Cancel button
  document.querySelector("#cancelKnowledgeForm")?.addEventListener("click", () => {
    document.querySelector("#knowledgeFormCard")?.classList.add("hidden");
  });

  // Content type switcher
  document.querySelector("#kmContentType")?.addEventListener("change", (e) => {
    switchKmMediaSection(e.target.value);
  });

  // Image file upload
  document.querySelector("#kmImageUpload")?.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    await handleKmFileUpload(file, "image");
  });

  // Video file upload
  document.querySelector("#kmVideoUpload")?.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    await handleKmFileUpload(file, "video");
  });

  // Form submit
  document.querySelector("#knowledgeForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    await submitKnowledgeForm(e.currentTarget);
  });
}

/** Show/hide media sections based on content type */
function switchKmMediaSection(type) {
  const sections = {
    image: "#kmImageSection",
    video_file: "#kmVideoFileSection",
    video_link: "#kmVideoLinkSection",
    text: "#kmTextSection"
  };
  Object.entries(sections).forEach(([key, selector]) => {
    document.querySelector(selector)?.classList.toggle("hidden", key !== type);
  });
}

/** Open form for adding new content */
function openKnowledgeAddForm() {
  const form = document.querySelector("#knowledgeForm");
  const card = document.querySelector("#knowledgeFormCard");
  const heading = document.querySelector("#knowledgeFormHeading");
  if (!form || !card) return;

  form.reset();
  form.querySelector("[name='contentId']").value = "";
  if (heading) heading.textContent = "เพิ่มเนื้อหาใหม่";

  // Always re-populate the category dropdown fresh (handles async sync timing)
  populateKmCategoryDropdown("");

  switchKmMediaSection("text");
  card.classList.remove("hidden");
  card.scrollIntoView({ behavior: "smooth", block: "start" });
}

/** Open form pre-filled for editing */
function openKnowledgeEditForm(contentId) {
  const contents = storage.get("knowledgeContent", []);
  const item = contents.find(c => c.contentId === contentId);
  if (!item) return;

  const form = document.querySelector("#knowledgeForm");
  const card = document.querySelector("#knowledgeFormCard");
  const heading = document.querySelector("#knowledgeFormHeading");
  if (!form || !card) return;

  // Re-populate category dropdown first (with pre-selection)
  populateKmCategoryDropdown(item.categoryId || "");

  form.reset();
  form.querySelector("[name='contentId']").value = item.contentId || "";
  // After form.reset() clears the select, re-apply the category selection
  populateKmCategoryDropdown(item.categoryId || "");

  form.querySelector("[name='status']").value = item.status || "published";
  form.querySelector("[name='title']").value = item.title || "";
  form.querySelector("[name='description']").value = item.description || "";
  form.querySelector("[name='contentType']").value = item.contentType || "text";
  const zoneVal = item.zoneTarget || "ALL";
  form.querySelectorAll("[name='zoneTargetCheckbox']").forEach(cb => {
    if (zoneVal === "ALL") {
      cb.checked = true;
    } else {
      cb.checked = zoneVal.split(",").map(v => v.trim()).includes(cb.value);
    }
  });
  form.querySelector("[name='order']").value = item.order || 1;
  form.querySelector("[name='richTextContent']").value = item.richTextContent || "";

  // Set URL fields
  const imgUrlEl = form.querySelector("#kmImageUrl");
  if (imgUrlEl) imgUrlEl.value = item.imageUrl || "";
  const vidUrlEl = form.querySelector("#kmVideoUrl");
  if (vidUrlEl) vidUrlEl.value = item.videoUrl || "";
  const vidLinkEl = form.querySelector("#kmVideoLinkUrl");
  if (vidLinkEl) vidLinkEl.value = item.videoUrl || "";

  if (heading) heading.textContent = "แก้ไขเนื้อหา";
  switchKmMediaSection(item.contentType || "text");
  card.classList.remove("hidden");
  card.scrollIntoView({ behavior: "smooth", block: "start" });
}

/** Handle file upload to Google Drive via backend */
async function handleKmFileUpload(file, type) {
  const previewId  = type === "image" ? "#kmImagePreview"  : "#kmVideoPreview";
  const urlInputId = type === "image" ? "#kmImageUrl"      : "#kmVideoUrl";
  const statusId   = type === "image" ? "#kmImageStatus"   : "#kmVideoStatus";

  const previewEl = document.querySelector(previewId);
  const urlInput  = document.querySelector(urlInputId);
  let   statusEl  = document.querySelector(statusId);

  // --- Client-side validation ---
  const ALLOWED_TYPES = [
    "image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif",
    "video/mp4",  "video/webm", "video/ogg",
    "application/pdf"
  ];
  const MAX_SIZE_MB = 50;
  const MAX_BYTES   = MAX_SIZE_MB * 1024 * 1024;

  if (!ALLOWED_TYPES.includes(file.type)) {
    AppDialog.alert(
      "ประเภทไฟล์ไม่รองรับ กรุณาใช้ไฟล์:\n• รูปภาพ: JPG, PNG, WEBP, GIF\n• วิดีโอ: MP4, WEBM\n• เอกสาร: PDF",
      "ไฟล์ไม่รองรับ", "warning"
    );
    return;
  }
  if (file.size > MAX_BYTES) {
    AppDialog.alert(
      `ไฟล์มีขนาดใหญ่เกินไป (${(file.size / 1024 / 1024).toFixed(1)} MB)\nกรุณาใช้ไฟล์ขนาดไม่เกิน ${MAX_SIZE_MB} MB`,
      "ไฟล์ใหญ่เกินไป", "warning"
    );
    return;
  }

  // --- Inject a status element under the file input if not exist ---
  if (!statusEl) {
    const input = document.querySelector(type === "image" ? "#kmImageUpload" : "#kmVideoUpload");
    statusEl = document.createElement("div");
    statusEl.id = statusId.replace("#", "");
    statusEl.style.cssText = "margin-top:0.5rem;font-size:0.82rem;display:flex;align-items:center;gap:0.5rem;";
    input?.parentElement?.insertAdjacentElement("afterend", statusEl);
  }

  // Show uploading state
  statusEl.innerHTML = `
    <span style="display:inline-block;width:1rem;height:1rem;border:2px solid #0f766e;border-top-color:transparent;border-radius:50%;animation:spin 0.8s linear infinite;flex-shrink:0;"></span>
    <span style="color:#0f766e;font-weight:600;">กำลังอัปโหลด ${escapeHtml(file.name)} (${(file.size/1024/1024).toFixed(1)} MB)...</span>`;

  // Add spin keyframes once
  if (!document.getElementById("km-spin-style")) {
    const s = document.createElement("style");
    s.id = "km-spin-style";
    s.textContent = "@keyframes spin{to{transform:rotate(360deg)}}";
    document.head.appendChild(s);
  }

  try {
    const base64 = await fileToBase64(file);
    const res = await apiPost("uploadMedia", {
      base64Data: base64,
      filename:   file.name,
      mimeType:   file.type
    });

    if (res.ok && res.url) {
      // Fill URL field
      if (urlInput) urlInput.value = res.url;

      // Show preview
      if (previewEl) {
        previewEl.classList.remove("hidden");
        previewEl.innerHTML = type === "image"
          ? `<img src="${res.url}" alt="Preview" style="width:100%;max-height:200px;object-fit:contain;" />`
          : `<video src="${res.url}" controls style="width:100%;max-height:200px;"></video>`;
      }

      // Success status
      statusEl.innerHTML = `
        <span style="color:#16a34a;font-size:1rem;">✅</span>
        <span style="color:#16a34a;font-weight:600;">อัปโหลดสำเร็จ! (${escapeHtml(res.filename || file.name)})</span>`;

    } else if (res.authRequired) {
      // Special: Drive auth error
      statusEl.innerHTML = `<span style="color:#b91c1c;font-weight:600;">⛔ ระบบไม่มีสิทธิ์เข้าถึง Google Drive</span>`;
      AppDialog.alert(
        "ระบบไม่มีสิทธิ์เข้าถึง Google Drive\n\nวิธีแก้ไข:\n1. เปิด Google Apps Script Editor\n2. กด Deploy → New Deployment\n3. ยืนยันสิทธิ์ Google Drive ใหม่\n4. คัดลอก URL ใหม่ไปอัปเดตในระบบ",
        "จำเป็นต้องอนุญาตสิทธิ์ใหม่", "error"
      );
    } else {
      const errMsg = res.error || "ข้อผิดพลาดไม่ทราบสาเหตุ";
      const retryInputId = type === "image" ? "#kmImageUpload" : "#kmVideoUpload";
      statusEl.innerHTML =
        `<span style="color:#b91c1c;font-weight:600;">❌ อัปโหลดล้มเหลว</span>` +
        `<button onclick="document.querySelector('${retryInputId}').click()"` +
        ` style="margin-left:0.5rem;padding:0.2rem 0.6rem;background:#fee2e2;color:#b91c1c;border:none;border-radius:0.4rem;cursor:pointer;font-family:'Prompt',sans-serif;font-size:0.78rem;font-weight:600;">` +
        `🔄 ลองใหม่</button>`;
      AppDialog.alert("ไม่สามารถอัปโหลดไฟล์ได้:\n" + errMsg, "อัปโหลดล้มเหลว", "error");
    }

  } catch (err) {
    statusEl.innerHTML = `<span style="color:#b91c1c;font-weight:600;">❌ เกิดข้อผิดพลาด: ${escapeHtml(err.message || "ไม่ทราบสาเหตุ")}</span>`;
    AppDialog.alert("เกิดข้อผิดพลาดในการอ่านหรืออัปโหลดไฟล์\n" + (err.message || ""), "ผิดพลาด", "error");
  }
}

/** Convert File to base64 string */
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      // Strip data URL prefix (e.g. "data:image/png;base64,")
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/** Submit knowledge form (save or update) */
async function submitKnowledgeForm(form) {
  const data = Object.fromEntries(new FormData(form).entries());
  
  const selectedZones = Array.from(form.querySelectorAll("[name='zoneTargetCheckbox']:checked")).map(cb => cb.value);
  if (selectedZones.length === 0) {
    AppDialog.alert("กรุณาเลือกกลุ่มเป้าหมาย (โซน) อย่างน้อย 1 รายการ", "ไม่ครบถ้วน", "warning");
    return;
  }
  data.zoneTarget = selectedZones.join(",");

  const contentType = data.contentType || "text";

  // Resolve the correct URL fields based on content type
  const imageUrlEl = document.querySelector("#kmImageUrl");
  const videoUrlEl = document.querySelector("#kmVideoUrl");
  const videoLinkEl = document.querySelector("#kmVideoLinkUrl");

  if (contentType === "image") {
    data.imageUrl = imageUrlEl?.value || "";
    data.videoUrl = "";
  } else if (contentType === "video_file") {
    data.videoUrl = videoUrlEl?.value || "";
    data.imageUrl = "";
  } else if (contentType === "video_link") {
    data.videoUrl = videoLinkEl?.value || "";
    data.imageUrl = "";
  } else {
    data.imageUrl = "";
    data.videoUrl = "";
  }

  if (!data.title) {
    AppDialog.alert("กรุณากรอกชื่อเรื่อง / หัวข้อ", "ไม่ครบถ้วน", "warning");
    return;
  }
  if (!data.categoryId) {
    AppDialog.alert("กรุณาเลือกหมวดหมู่", "ไม่ครบถ้วน", "warning");
    return;
  }

  data.order = Number(data.order || 1);
  data.createdAt = data.contentId ? undefined : thaiTimestamp();
  data.updatedAt = thaiTimestamp();

  const saved = await saveToCloudOrAlert("saveKnowledgeContent", data, "ไม่สามารถบันทึกเนื้อหาได้");
  if (!saved) return;

  // Update local storage
  const contents = storage.get("knowledgeContent", []);
  const idx = contents.findIndex(c => c.contentId === data.contentId);
  if (idx > -1) {
    contents[idx] = { ...contents[idx], ...data };
  } else {
    contents.push(data);
  }
  storage.set("knowledgeContent", contents);

  AppDialog.alert("บันทึกเนื้อหาเรียบร้อยแล้ว", "สำเร็จ", "success");
  document.querySelector("#knowledgeFormCard")?.classList.add("hidden");
  form.reset();
  renderKmContentGrid();
}

/** Delete a knowledge content item */
async function deleteKnowledgeContent(contentId) {
  const confirmed = await AppDialog.confirm("ต้องการลบเนื้อหานี้หรือไม่? การลบไม่สามารถยกเลิกได้", "ยืนยันการลบ");
  if (!confirmed) return;

  const res = await apiPost("deleteKnowledgeContent", { contentId });
  if (!res.ok) {
    AppDialog.alert("ลบเนื้อหาล้มเหลว: " + (res.error || res.message), "ผิดพลาด", "error");
    return;
  }

  // Update local storage
  const contents = storage.get("knowledgeContent", []);
  storage.set("knowledgeContent", contents.filter(c => c.contentId !== contentId));

  AppDialog.alert("ลบเนื้อหาเรียบร้อยแล้ว", "สำเร็จ", "success");
  renderKmContentGrid();
}
