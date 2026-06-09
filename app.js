const VSAFE_GAS_URL = "https://script.google.com/macros/s/AKfycbxsT6r8zi70CW7q6s-FzehYxJInL-n5k1B5___BREp_BDOtT4QcIwFscXn0k5XVkR78oA/exec";

// =========================================================
// CUSTOM DIALOG UTILITY (ลบ window.alert, confirm แบบเดิมทิ้ง)
// =========================================================
const AppDialog = {
  init() {
    if (document.getElementById('modernAppDialog')) return;
    const html = `
      <dialog id="modernAppDialog" class="modern-dialog">
        <div class="modern-dialog-box">
          <div id="dialogIcon" class="modern-dialog-icon"></div>
          <h3 id="dialogTitle">แจ้งเตือน</h3>
          <p id="dialogMessage"></p>
          <div class="modern-dialog-actions">
            <button id="dialogBtnCancel" class="secondary-btn hidden">ยกเลิก</button>
            <button id="dialogBtnConfirm" class="primary-btn">ตกลง</button>
          </div>
        </div>
      </dialog>
    `;
    document.body.insertAdjacentHTML('beforeend', html);
  },
  show(type, msg, title) {
    return new Promise((resolve) => {
      this.init();
      const dialog = document.getElementById('modernAppDialog');
      const titleEl = document.getElementById('dialogTitle');
      const msgEl = document.getElementById('dialogMessage');
      const iconEl = document.getElementById('dialogIcon');
      const btnConfirm = document.getElementById('dialogBtnConfirm');
      const btnCancel = document.getElementById('dialogBtnCancel');

      msgEl.textContent = msg;
      titleEl.textContent = title || "แจ้งเตือน";

      const icons = {
        info: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4M12 8h.01"></path></svg>`,
        success: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`,
        warning: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>`
      };

      iconEl.innerHTML = icons[type] || icons.info;
      iconEl.className = `modern-dialog-icon ${type}`;

      if (type === 'warning' || type === 'confirm') {
        btnCancel.classList.remove('hidden');
      } else {
        btnCancel.classList.add('hidden');
      }

      const cleanup = () => {
        btnConfirm.onclick = null;
        btnCancel.onclick = null;
        dialog.close();
      };

      btnConfirm.onclick = () => { cleanup(); resolve(true); };
      btnCancel.onclick = () => { cleanup(); resolve(false); };

      dialog.showModal();
    });
  },
  alert(msg, title = "แจ้งเตือน", type = "info") {
    return this.show(type, msg, title);
  },
  confirm(msg, title = "ยืนยันการทำรายการ") {
    return this.show('confirm', msg, title);
  }
};

// =========================================================
// STATIC DATA (ข้อมูลคงที่สำหรับแอป)
// =========================================================
const riskDomains = [
  { key: "psychotic", title: "อาการทางจิต", description: "มีพฤติกรรมพูดคนเดียว หัวเราะคนเดียว หรือแสดงอาการว่ามีคนมาทำร้าย/วางแผนที่จะเอาชีวิตหรือไม่" },
  { key: "substance", title: "การใช้สารเสพติด", description: "มีการดื่มเหล้า ใช้สารเสพติด หรือดื่มน้ำกระท่อมบ่อยหรือไม่" },
  { key: "personality", title: "บุคลิกภาพ", description: "มีความก้าวร้าว ชอบทำอะไรไม่คิดหน้าคิดหลัง อารมณ์แปรปรวนง่ายบ่อยหรือไม่" },
  { key: "medication", title: "การกินยา", description: "ปฏิเสธการกินยา หรือแอบหยุดยา ทิ้งยา บ่อยหรือไม่" },
  { key: "anger", title: "อารมณ์และความโกรธ", description: "หงุดหงิดง่ายขึ้น มีการทะเลาะ หรือควบคุมอารมณ์ไม่ได้แม้เรื่องเล็กน้อย บ่อยหรือไม่" },
  { key: "stressors", title: "สภาพแวดล้อม / ความเครียด", description: "มีปัญหาทะเลาะกับเพื่อนบ้าน มีเรื่องเงินทอง หรือเสียใจจากการสูญเสียของรักใกล้ชิด บ่อยหรือไม่" },
  { key: "empathy", title: "ขาดการเห็นอกเห็นใจผู้อื่น", description: "ไม่เห็นใจผู้อื่น จากปัญหาหรือเหตุการณ์ที่เข้ามากระทบบ่อยหรือไม่" },
  { key: "cognition", title: "การตัดสินใจ ความจำ", description: "พูดจาไม่รู้เรื่อง หลงลืมบ่อยมาก หรือตัดสินใจเรื่องง่ายในชีวิตประจำวันไม่ได้ บ่อยหรือไม่" },
  { key: "family", title: "สัมพันธภาพในครอบครัว", description: "คนในบ้านรู้สึกกลัว หรือกังวลต่ออารมณ์และพฤติกรรมของผู้ป่วย บ่อยหรือไม่" },
  { key: "insight", title: "การรับรู้ความเจ็บป่วย", description: "ความรุนแรงในการไม่ยอมรับว่าตัวเองป่วย หรือคิดว่าตัวเองปกติแล้วไม่ต้องรักษามากเท่าใด" }
];

const knowledgeItems = [
  ["การสื่อสารเชิงบวก", "ใช้น้ำเสียงสงบ ประโยคสั้น รับฟังก่อนแนะนำ และหลีกเลี่ยงการตำหนิ"],
  ["การลดระดับความโกรธ", "ลดสิ่งกระตุ้น เว้นระยะห่าง เปิดพื้นที่ปลอดภัย และไม่โต้เถียงเมื่ออารมณ์สูง"],
  ["การส่งเสริมการกินยา", "จัดกล่องยา ตั้งเตือน และสังเกตผลข้างเคียงเพื่อแจ้งทีมรักษา"],
  ["การจัดสิ่งแวดล้อมให้ปลอดภัย", "เก็บของมีคม แยกสิ่งกระตุ้น และเตรียมทางออกฉุกเฉิน"],
  ["การจัดการความเครียดของผู้ดูแล", "พักให้พอ ขอคนช่วยแบ่งเบา และใช้ช่องทางปรึกษาเมื่อเริ่มไม่ไหว"],
  ["ความรู้เกี่ยวกับโรคและการดูแลต่อเนื่อง", "ติดตามนัด ประเมินซ้ำตามรอบ และสื่อสารกับโรงพยาบาลในพื้นที่"]
];

const zoneAdvice = {
  GREEN: {
    label: "Green Zone", title: "ความเสี่ยงต่ำ",
    description: "ผู้ป่วยอยู่ในระดับเฝ้าระวังทั่วไป อาการคงที่ ยังไม่พบสัญญาณเตือนที่เสี่ยงต่อพฤติกรรมรุนแรง",
    steps: ["ให้ผู้ป่วยกินยาต่อเนื่องตามแพทย์สั่ง", "สื่อสารเชิงบวก พูดคุยด้วยน้ำเสียงอ่อนโยน", "ส่งเสริมการนอนหลับและพักผ่อนให้เพียงพอ", "ทำกิจกรรมร่วมกันเพื่อสร้างสัมพันธ์ที่ดี", "ลดความเครียดในครอบครัว เลี่ยงการตำหนิ/โต้เถียง", "สังเกตอาการเปลี่ยนแปลงและประเมินซ้ำหากมีความกังวล"]
  },
  YELLOW: {
    label: "Yellow Zone", title: "ความเสี่ยงปานกลาง",
    description: "เริ่มมีสัญญาณเตือน จำเป็นต้องเฝ้าระวังใกล้ชิด หากมีอาการผิดปกติให้ติดต่อโรงพยาบาลในพื้นที่โดยด่วน",
    steps: ["สื่อสารด้วยน้ำเสียงสงบ อ่อนโยน", "หลีกเลี่ยงการโต้แย้งหรือตำหนิ", "ลดสิ่งกระตุ้นความเครียด", "เฝ้าระวังอาการอย่างใกล้ชิด", "ส่งเสริมการกินยาอย่างต่อเนื่อง", "จัดสิ่งแวดล้อมให้ปลอดภัย", "ประเมินซ้ำภายใน 24-48 ชั่วโมง"]
  },
  RED: {
    label: "Red Zone", title: "ความเสี่ยงสูง",
    description: "มีความเสี่ยงสูงต่อการเกิดพฤติกรรมรุนแรง เข้าสู่ Emergency Response Pathway",
    steps: ["แยกเด็ก ผู้สูงอายุออกจากพื้นที่", "หลีกเลี่ยงการเผชิญหน้าและโต้เถียง", "พูดสั้นๆ น้ำเสียงสงบ เว้นระยะห่าง", "เก็บอาวุธ ของมีคม และสิ่งอันตราย", "เปิดทางออกหรือหาทางหนีที่ปลอดภัย", "ห้ามอยู่กับผู้ป่วยตามลำพัง"]
  }
};

let registerDraftPatients = [];

// ==========================================
// DATA LAYER (Local Cache & Cloud Sync)
// ==========================================
const storage = {
  get(key, fallback) {
    try {
      const value = localStorage.getItem(`vsafe:${key}`);
      return value ? JSON.parse(value) : fallback;
    } catch { return fallback; }
  },
  set(key, value) {
    localStorage.setItem(`vsafe:${key}`, JSON.stringify(value));
  }
};

async function syncDataFromCloud() {
  try {
    const response = await fetch(`${VSAFE_GAS_URL}?action=getAllData`);
    const data = await response.json();
    if (data.ok) {
      storage.set("patients", data.patients || []);
      storage.set("caregivers", data.caregivers || []);
      storage.set("caseManagers", data.caseManagers || []);
      storage.set("assessments", data.assessments || []);
      storage.set("alerts", data.alerts || []);
      storage.set("addressData", data.addressData || []); 
      return true;
    }
    return false;
  } catch (error) {
    return false;
  }
}

async function apiPost(action, payload) {
  try {
    const body = new URLSearchParams({ action, payload: JSON.stringify(payload) });
    const response = await fetch(VSAFE_GAS_URL, { method: "POST", body });
    const result = await response.json();
    syncDataFromCloud(); 
    return result;
  } catch (error) {
    return { ok: true, offline: true };
  }
}

// =========================================================
// USER SESSION & PATIENT CONTEXT
// =========================================================
function getCaregivers() { return storage.get("caregivers", []); }
function getCurrentCaregiver() {
  const cgId = sessionStorage.getItem("vsafe:currentUser");
  return cgId ? getCaregivers().find((c) => c.id === cgId) : null;
}
function setCurrentCaregiver(caregiver) {
  if (caregiver) sessionStorage.setItem("vsafe:currentUser", caregiver.id);
  else sessionStorage.removeItem("vsafe:currentUser");
}
function getLinkedPatients() {
  const caregiver = getCurrentCaregiver();
  if (!caregiver || !caregiver.patientCodes) return [];
  return storage.get("patients", []).filter((p) => caregiver.patientCodes.includes(p.patientCode));
}
function getActivePatient() {
  const caregiver = getCurrentCaregiver();
  if (!caregiver || !caregiver.activePatientCode) return getLinkedPatients()[0] || null;
  return getLinkedPatients().find((p) => p.patientCode === caregiver.activePatientCode) || getLinkedPatients()[0] || null;
}
function setActivePatient(patientCode) {
  const caregiver = getCurrentCaregiver();
  if (caregiver && caregiver.activePatientCode !== patientCode) {
    caregiver.activePatientCode = patientCode;
    const all = getCaregivers();
    const index = all.findIndex((c) => c.id === caregiver.id);
    if (index >= 0) { all[index] = caregiver; storage.set("caregivers", all); }
    apiPost("saveCaregiver", caregiver);
  }
  renderAuthenticatedApp();
}

// =========================================================
// ADDRESS DROPDOWN SYSTEM (ดึงจากชีต AddressData)
// =========================================================
function setupUserAddressSelects(formScope = document) {
  const provinceSelect = formScope.querySelector('select[name="province"]');
  const districtSelect = formScope.querySelector('select[name="district"]');
  const subdistrictSelect = formScope.querySelector('select[name="subdistrict"]');
  const zipcodeInput = formScope.querySelector('input[name="zipcode"]');

  if (!provinceSelect) return;
  const addressList = storage.get("addressData") || [];
  if (addressList.length === 0) return;

  const uniqueProvinces = [...new Set(addressList.map(item => item.province))].filter(Boolean).sort();
  provinceSelect.innerHTML = '<option value="">-- เลือกจังหวัด --</option>' + uniqueProvinces.map(p => `<option value="${p}">${p}</option>`).join("");

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
    districtSelect.innerHTML = '<option value="">-- เลือกอำเภอ --</option>' + uniqueAmphoes.map(a => `<option value="${a}">${a}</option>`).join("");
    refreshSubdistricts();
  };

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
    subdistrictSelect.innerHTML = '<option value="">-- เลือกตำบล --</option>' + uniqueTambons.map(t => `<option value="${t}">${t}</option>`).join("");
    if (zipcodeInput && filtered.length > 0) zipcodeInput.value = filtered[0].zipcode || "";
  };

  provinceSelect.addEventListener("change", refreshDistricts);
  districtSelect?.addEventListener("change", refreshSubdistricts);
  subdistrictSelect?.addEventListener("change", () => {
    const match = addressList.find(item => item.province === provinceSelect.value && item.amphoe === districtSelect.value && item.tambon === subdistrictSelect.value);
    if (zipcodeInput && match) zipcodeInput.value = match.zipcode || "";
  });

  refreshDistricts();
}

function setUserAddressFormValues(formElement, patientData) {
  if (!formElement || !patientData) return;
  const provinceSelect = formElement.querySelector('select[name="province"]');
  const districtSelect = formElement.querySelector('select[name="district"]');
  const subdistrictSelect = formElement.querySelector('select[name="subdistrict"]');
  const zipcodeInput = formElement.querySelector('input[name="zipcode"]');

  if (!provinceSelect) return;
  provinceSelect.value = patientData.province || "";
  provinceSelect.dispatchEvent(new Event("change"));

  if (districtSelect && patientData.district) {
    districtSelect.value = patientData.district;
    districtSelect.dispatchEvent(new Event("change"));
  }
  if (subdistrictSelect && patientData.subdistrict) {
    subdistrictSelect.value = patientData.subdistrict;
    subdistrictSelect.dispatchEvent(new Event("change"));
  }
  if (zipcodeInput && patientData.zipcode) zipcodeInput.value = patientData.zipcode;
}

// =========================================================
// UI FLOW & APP INITIALIZATION
// =========================================================
async function initUserApp() {
  await syncDataFromCloud();
  initConsentLogic();
  initAuthFlow();
  initRegisterForm();
  initAssessmentForm();
  initNavigation();
  renderKnowledge();
  initSosButtons();
  renderAuthenticatedApp();
}

function initConsentLogic() {
  const check1 = document.getElementById('consentCheck1');
  const check2 = document.getElementById('consentCheck2');
  const radioAgree = document.getElementById('consentRadioAgree');
  const nextBtn = document.getElementById('step1NextBtn'); 
  if (!check1 || !nextBtn) return;

  const evaluateConsent = () => {
    nextBtn.disabled = !(check1.checked && check2.checked && radioAgree.checked);
  };
  document.querySelectorAll('.consent-input').forEach(input => input.addEventListener('change', evaluateConsent));
  evaluateConsent();
}

function initAuthFlow() {
  document.querySelector("#loginFormUser")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const payload = Object.fromEntries(new FormData(event.currentTarget).entries());
    const caregiver = getCaregivers().find((item) => item.username === payload.username && item.password === payload.password);
    if (!caregiver) {
      AppDialog.alert("Username หรือ Password ไม่ถูกต้อง", "เข้าสู่ระบบล้มเหลว", "warning");
      return;
    }
    setCurrentCaregiver(caregiver);
    renderAuthenticatedApp();
  });

  document.querySelector("#logoutBtn")?.addEventListener("click", () => {
    setCurrentCaregiver(null);
    renderAuthenticatedApp();
  });

  document.querySelector("#btnGotoRegister")?.addEventListener("click", () => {
    document.querySelector("#loginView")?.classList.add("hidden");
    document.querySelector("#registerView")?.classList.remove("hidden");
    registerDraftPatients = [];
    document.querySelector("#registerAccountForm")?.reset();
    showRegisterStep(1);
  });

  document.querySelector("#btnCancelRegister")?.addEventListener("click", () => {
    document.querySelector("#registerView")?.classList.add("hidden");
    document.querySelector("#loginView")?.classList.remove("hidden");
  });
}

function initNavigation() {
  document.querySelectorAll(".bottom-nav [data-nav]").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".bottom-nav button").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      document.querySelectorAll(".app-view").forEach((item) => item.classList.add("hidden"));
      const view = button.dataset.nav;
      document.querySelector(`#view-${view}`)?.classList.remove("hidden");
      if (view === "home") renderPatientList();
    });
  });
}

function renderAuthenticatedApp() {
  const cg = getCurrentCaregiver();
  if (cg) {
    document.querySelector("#loginView")?.classList.add("hidden");
    document.querySelector("#registerView")?.classList.add("hidden");
    document.querySelector("#mainAppView")?.classList.remove("hidden");
    updateActivePatientUI();
    renderPatientList();
    renderAssessmentPatientOptions();
    renderMapPreview(getActivePatient());
  } else {
    document.querySelector("#mainAppView")?.classList.add("hidden");
    document.querySelector("#registerView")?.classList.add("hidden");
    document.querySelector("#loginView")?.classList.remove("hidden");
  }
}

function updateActivePatientUI() {
  const cg = getCurrentCaregiver();
  const active = getActivePatient();
  if (!cg) return;
  document.querySelectorAll(".user-name-display").forEach((el) => el.textContent = `${cg.prefix || ""}${cg.fullName || cg.username}`);
  
  if (active) {
    const assessments = storage.get("assessments", []).filter((a) => a.patientCode === active.patientCode).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const latest = assessments[0];
    const score = latest?.score ?? active.lastScore ?? active.baselineScore ?? 0;
    const zone = latest?.zone || active.lastZone || classifyRisk(score);
    
    document.querySelectorAll(".active-patient-name").forEach((el) => el.textContent = `${active.prefix || ""}${active.fullName || ""}`);
    document.querySelectorAll(".active-patient-hn").forEach((el) => el.textContent = `HN: ${active.hn || "-"}`);
    
    const banner = document.querySelector("#activePatientBanner");
    const indicator = document.querySelector("#zoneIndicator");
    const label = document.querySelector("#zoneLabel");
    if (banner) { banner.className = `patient-banner ${zoneClass(zone)}`; }
    if (indicator) { indicator.className = `status-indicator ${zoneClass(zone)}`; }
    if (label) { label.textContent = `${zone} ZONE`; }
  }
}

function renderPatientList() {
  const list = document.querySelector("#homePatientList");
  if (!list) return;
  const linked = getLinkedPatients();
  const active = getActivePatient();
  
  list.innerHTML = linked.length ? linked.map((patient) => {
    const isActive = active && active.patientCode === patient.patientCode;
    const assessments = storage.get("assessments", []).filter((a) => a.patientCode === patient.patientCode).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const latest = assessments[0];
    const score = latest?.score ?? patient.lastScore ?? patient.baselineScore ?? 0;
    const zone = latest?.zone || patient.lastZone || classifyRisk(score);
    
    return `
      <article class="patient-card ${isActive ? "active" : ""}" onclick="setActivePatient('${escapeHtml(patient.patientCode)}')">
        <div class="patient-card-header">
          <div class="patient-info">
            <strong>${escapeHtml(patient.prefix || "")}${escapeHtml(patient.fullName || "")}</strong>
            <small>HN: ${escapeHtml(patient.hn)} | Dx: ${escapeHtml(patient.dx || "-")}</small>
          </div>
          <span class="risk-badge ${zoneClass(zone)}">${zone}</span>
        </div>
      </article>
    `;
  }).join("") : `<div class="muted-box">ยังไม่มีผู้ป่วยในความดูแล</div>`;
}

// =========================================================
// REGISTER & DRAFT PATIENT SYSTEM
// =========================================================
function initRegisterForm() {
  const form = document.querySelector("#registerAccountForm");
  if (!form) return;
  
  setupUserAddressSelects(form); // เปิดใช้ Address Dropdown แบบ Dynamic

  document.querySelectorAll("[data-next-step]").forEach((btn) => btn.addEventListener("click", async () => {
    const target = Number(btn.dataset.nextStep);
    if (target > 1 && !(await validateRegisterStep(target - 1))) return;
    showRegisterStep(target);
  }));
  document.querySelectorAll("[data-prev-step]").forEach((btn) => btn.addEventListener("click", () => showRegisterStep(Number(btn.dataset.prevStep))));
  
  document.querySelector("#checkPatientBtn")?.addEventListener("click", async () => {
    const hn = document.querySelector("#regHn")?.value.trim();
    if (!hn) return AppDialog.alert("กรุณาระบุ HN", "ข้อมูลไม่ครบ", "warning");
    const patients = storage.get("patients", []);
    const match = patients.find((p) => p.hn === hn);
    const resultDiv = document.querySelector("#patientSearchResult");
    if (!resultDiv) return;
    
    if (match) {
      resultDiv.innerHTML = `<div class="success-box">พบข้อมูล: ${escapeHtml(match.prefix || "")}${escapeHtml(match.fullName || "")}</div>`;
      resultDiv.dataset.foundCode = match.patientCode;
    } else {
      resultDiv.innerHTML = `<div class="error-box">ไม่พบประวัติผู้ป่วยในระบบ V-SAFE สมาร์ทโหมด</div>`;
      delete resultDiv.dataset.foundCode;
    }
  });

  document.querySelector("#addPatientToDraftBtn")?.addEventListener("click", async () => {
    const added = await addDraftPatientFromInput();
    if (added) {
      document.querySelector("#regHn").value = "";
      document.querySelector("#patientSearchResult").innerHTML = "";
    }
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const payload = Object.fromEntries(new FormData(form).entries());
    
    if (payload.password !== payload.confirmPassword) {
      return AppDialog.alert("Password และยืนยัน Password ไม่ตรงกัน", "ข้อมูลไม่ถูกต้อง", "warning");
    }
    if (getCaregivers().some((cg) => cg.username === payload.username)) {
      return AppDialog.alert("Username นี้ถูกใช้แล้ว กรุณาเลือกใหม่", "ชื่อผู้ใช้ซ้ำ", "warning");
    }
    if (!registerDraftPatients.length) await addDraftPatientFromInput();
    if (!registerDraftPatients.length) {
      return AppDialog.alert("กรุณาเพิ่มผู้ป่วยอย่างน้อย 1 คนก่อนลงทะเบียน", "ข้อมูลไม่ครบ", "warning");
    }

    const newCaregiver = {
      id: `CG-${Date.now()}`, username: payload.username, password: payload.password,
      prefix: payload.cgPrefix, fullName: payload.cgFullName, gender: payload.cgGender,
      relationship: payload.relationship, phone: payload.phone, province: payload.province,
      district: payload.district, subdistrict: payload.subdistrict, zipcode: payload.zipcode,
      patientCodes: registerDraftPatients.map((p) => p.patientCode),
      activePatientCode: registerDraftPatients[0].patientCode,
      createdAt: new Date().toISOString()
    };

    const cgs = storage.get("caregivers", []);
    cgs.push(newCaregiver);
    storage.set("caregivers", cgs);
    await apiPost("saveCaregiver", newCaregiver);
    
    await AppDialog.alert("ลงทะเบียนสำเร็จ กรุณาเข้าสู่ระบบ", "สำเร็จ", "success");
    document.querySelector("#registerView")?.classList.add("hidden");
    document.querySelector("#loginView")?.classList.remove("hidden");
    form.reset();
  });
}

function showRegisterStep(step) {
  document.querySelectorAll(".register-step").forEach((el) => el.classList.remove("active"));
  document.querySelector(`#regStep${step}`)?.classList.add("active");
  document.querySelectorAll(".step-indicator .step").forEach((el, index) => {
    el.classList.toggle("active", index + 1 === step);
    el.classList.toggle("completed", index + 1 < step);
  });
  if (step === 4) renderDraftPatients();
}

async function validateRegisterStep(step) {
  const form = document.querySelector("#registerAccountForm");
  if (!form.checkValidity()) { form.reportValidity(); return false; }
  
  if (step === 2) {
    const payload = Object.fromEntries(new FormData(form).entries());
    if (payload.password !== payload.confirmPassword) {
      AppDialog.alert("Password ไม่ตรงกัน", "ข้อมูลไม่ถูกต้อง", "warning");
      return false;
    }
    if (getCaregivers().some((cg) => cg.username === payload.username)) {
      AppDialog.alert("Username ถูกใช้แล้ว", "ข้อมูลไม่ถูกต้อง", "warning");
      return false;
    }
  }
  if (step === 4) {
    if (!registerDraftPatients.length) await addDraftPatientFromInput();
    if (!registerDraftPatients.length) {
      AppDialog.alert("กรุณาเพิ่มผู้ป่วยอย่างน้อย 1 คน", "ข้อมูลไม่ครบ", "warning");
      return false;
    }
  }
  return true;
}

async function addDraftPatientFromInput() {
  if (registerDraftPatients.length >= 3) {
    AppDialog.alert("เพิ่มผู้ป่วยได้สูงสุด 3 คน", "จำกัดจำนวน", "warning");
    return null;
  }
  const resultDiv = document.querySelector("#patientSearchResult");
  const code = resultDiv?.dataset.foundCode;
  if (!code) return null;
  
  const reviewedPatient = storage.get("patients", []).find((p) => p.patientCode === code);
  if (reviewedPatient) {
    if (registerDraftPatients.some((item) => item.patientCode === reviewedPatient.patientCode)) {
      AppDialog.alert("ผู้ป่วยรายนี้ถูกเพิ่มแล้ว", "ข้อมูลซ้ำ", "info");
      return reviewedPatient;
    }
    registerDraftPatients.push(reviewedPatient);
    renderDraftPatients();
    return reviewedPatient;
  }
  return null;
}

function renderDraftPatients() {
  const container = document.querySelector("#draftPatientList");
  if (!container) return;
  container.innerHTML = registerDraftPatients.map((p, index) => `
    <article class="patient-card">
      <div class="patient-info">
        <strong>${escapeHtml(p.prefix || "")}${escapeHtml(p.fullName || "")}</strong>
        <small>HN: ${escapeHtml(p.hn)}</small>
      </div>
      <button type="button" class="icon-btn danger" onclick="removeDraftPatient(${index})">ลบ</button>
    </article>
  `).join("");
}
window.removeDraftPatient = function(index) {
  registerDraftPatients.splice(index, 1);
  renderDraftPatients();
};

// =========================================================
// ASSESSMENT SYSTEM
// =========================================================
function initAssessmentForm() {
  const container = document.querySelector("#assessmentQuestions");
  if (!container) return;
  
  container.innerHTML = riskDomains.map((domain, index) => `
    <article class="question-card">
      <div class="question-header">
        <span class="q-number">${index + 1}</span>
        <div class="q-text">
          <h4>${domain.title}</h4>
          <p>${domain.description}</p>
        </div>
      </div>
      <div class="radio-group">
        <label><input type="radio" name="${domain.key}" value="0" required /> ไม่มีอาการเลย (0)</label>
        <label><input type="radio" name="${domain.key}" value="1" required /> มีบ้าง จัดการได้ (1)</label>
        <label><input type="radio" name="${domain.key}" value="2" required /> มีบ่อย รบกวนชีวิต (2)</label>
      </div>
    </article>
  `).join("");

  document.querySelector("#assessmentForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const patientCode = form.elements.patientCode.value;
    const patient = storage.get("patients", []).find((p) => p.patientCode === patientCode);
    
    if (!patient) return AppDialog.alert("ไม่พบรหัสผู้ป่วย", "ข้อผิดพลาด", "warning");

    const answers = {};
    let rawScore = 0;
    riskDomains.forEach((domain) => {
      const val = Number(form.elements[domain.key].value);
      answers[domain.key] = val;
      rawScore += val;
    });

    const baseline = Number(patient.baselineScore || 0);
    const finalScore = rawScore + baseline;
    const zone = classifyRisk(finalScore);

    const assessment = {
      id: `ASM-${Date.now()}`, patientCode: patient.patientCode, hn: patient.hn,
      dx: patient.dx, patientName: patient.fullName, district: patient.district,
      province: patient.province, score: finalScore, zone: zone, status: "ติดตามต่อเนื่อง",
      createdAt: new Date().toISOString(), answers: answers
    };

    const assessments = storage.get("assessments", []);
    assessments.push(assessment);
    storage.set("assessments", assessments);
    
    const patients = storage.get("patients", []);
    const index = patients.findIndex((item) => item.patientCode === patientCode);
    if (index >= 0) {
      patients[index] = { ...patients[index], lastScore: finalScore, lastZone: zone, status: assessment.status, updatedAt: new Date().toISOString() };
      storage.set("patients", patients);
    }

    if (zone === "RED" || zone === "YELLOW") {
      const alerts = storage.get("alerts", []);
      alerts.push({ alertId: `ALT-${Date.now()}`, ...assessment, acknowledged: false });
      storage.set("alerts", alerts);
      apiPost("saveAlert", assessment);
    }
    
    await apiPost("saveAssessment", assessment);
    
    form.reset();
    document.querySelector('[data-nav="home"]')?.click();
    updateActivePatientUI();
    AppDialog.alert(`บันทึกประเมินสำเร็จ\nคะแนนรวม: ${finalScore} คะแนน\nระดับ: ${zone} ZONE`, "ผลการประเมิน", "success");
  });
}

function renderAssessmentPatientOptions() {
  const select = document.querySelector("#assessmentPatientCode");
  if (!select) return;
  const linked = getLinkedPatients();
  const active = getActivePatient();
  select.innerHTML = linked.length ? linked.map((patient) => `<option value="${escapeHtml(patient.patientCode)}">HN ${escapeHtml(patient.hn)} - ${escapeHtml(patient.fullName || "")}</option>`).join("") : `<option value="">-- ไม่มีผู้ป่วย --</option>`;
  if (active) select.value = active.patientCode;
}

function classifyRisk(score) {
  if (score <= 7) return "GREEN";
  if (score <= 13) return "YELLOW";
  return "RED";
}

// =========================================================
// SOS & MAP SYSTEM
// =========================================================
function initSosButtons() {
  document.querySelector("#homeSos")?.addEventListener("click", async () => {
    const active = getActivePatient();
    if (!active) return AppDialog.alert("กรุณาเพิ่มผู้ป่วยก่อนใช้ฟังก์ชัน SOS", "ผิดพลาด", "warning");
    const confirmed = await AppDialog.confirm(`ยืนยันการแจ้งเหตุฉุกเฉิน (SOS) สำหรับผู้ป่วย ${active.fullName || active.hn} ใช่หรือไม่?`, "แจ้งเหตุฉุกเฉิน!");
    if (confirmed) {
      const alertPayload = {
        alertId: `ALT-${Date.now()}`, patientCode: active.patientCode, hn: active.hn, dx: active.dx,
        district: active.district, score: active.lastScore || active.baselineScore || 0,
        zone: "RED", status: "รอการช่วยเหลือ", createdAt: new Date().toISOString(), acknowledged: false
      };
      const alerts = storage.get("alerts", []);
      alerts.push(alertPayload);
      storage.set("alerts", alerts);
      apiPost("saveAlert", alertPayload);
      AppDialog.alert("ระบบส่งสัญญาณ SOS ไปยังศูนย์รับแจ้งเหตุเรียบร้อยแล้ว", "SOS ถูกส่ง", "success");
    }
  });
}

function renderMapPreview(patient) {
  const wrapper = document.querySelector("#patientMapPreview");
  if (!wrapper || !patient) return;
  if (!patient.latlng) { wrapper.innerHTML = `<div class="muted-box">ไม่พบข้อมูลพิกัด</div>`; return; }
  
  const [lat, lng] = patient.latlng.split(",").map(Number);
  if (!lat || !lng) return;
  
  wrapper.innerHTML = `
    <div style="height: 180px; background: #e2e8f0; border-radius: 0.75rem; overflow: hidden; position: relative;">
      <a href="https://maps.google.com/?q=${lat},${lng}" target="_blank" style="display:block; width:100%; height:100%;">
        <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 2rem;">📍</div>
        <div style="position: absolute; bottom: 8px; left: 8px; right: 8px; background: rgba(0,0,0,0.6); color: white; padding: 4px 8px; border-radius: 4px; text-align: center; font-size: 0.85rem;">
          กดเพื่อเปิด Google Maps
        </div>
      </a>
    </div>
  `;
}

// =========================================================
// UTILITIES
// =========================================================
function escapeHtml(unsafe) {
  if (!unsafe) return "";
  return String(unsafe).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
function zoneClass(zone) { return zone ? zone.toLowerCase() : "green"; }
function formatThaiDateTime(value) {
  return new Intl.DateTimeFormat("th-TH-u-ca-buddhist", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

// เกร็ดความรู้
function renderKnowledge() {
  const container = document.querySelector("#knowledgeList");
  if (!container) return;
  container.innerHTML = knowledgeItems.map(([title, desc]) => `
    <article class="knowledge-card">
      <div class="knowledge-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 6v12m-8-6h16"></path></svg></div>
      <div class="knowledge-content"><h4>${escapeHtml(title)}</h4><p>${escapeHtml(desc)}</p></div>
    </article>
  `).join("");
}

// Service Worker
function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./service-worker.js").catch(() => {});
  }
}

document.addEventListener("DOMContentLoaded", initUserApp);
