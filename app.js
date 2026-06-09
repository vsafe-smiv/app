const VSAFE_GAS_URL = "https://script.google.com/macros/s/AKfycbxsT6r8zi70CW7q6s-FzehYxJInL-n5k1B5___BREp_BDOtT4QcIwFscXn0k5XVkR78oA/exec";

// =========================================================
// 1. CUSTOM DIALOG UTILITY (ลบการใช้ window.alert, confirm ทิ้ง)
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
            <button id="dialogBtnCancel" class="secondary-btn hidden" type="button">ยกเลิก</button>
            <button id="dialogBtnConfirm" class="primary-btn" type="button">ตกลง</button>
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
// 2. CONSTANTS & MOCK DATA
// =========================================================
const riskDomains = [
  { key: "psychotic", title: "อาการทางจิต", description: "มีพฤติกรรมพูดคนเดียว หัวเราะคนเดียว หรือแสดงอาการว่ามีคนมาทำร้าย" },
  { key: "substance", title: "การใช้สารเสพติด", description: "มีการดื่มเหล้า ใช้สารเสพติด หรือดื่มน้ำกระท่อมบ่อยหรือไม่" },
  { key: "personality", title: "บุคลิกภาพ", description: "มีความก้าวร้าว ชอบทำอะไรไม่คิดหน้าคิดหลัง อารมณ์แปรปรวนง่ายบ่อยหรือไม่" },
  { key: "medication", title: "การกินยา", description: "ปฏิเสธการกินยา หรือแอบหยุดยา ทิ้งยา บ่อยหรือไม่" },
  { key: "anger", title: "อารมณ์และความโกรธ", description: "หงุดหงิดง่ายขึ้น มีการทะเลาะ หรือควบคุมอารมณ์ไม่ได้แม้เรื่องเล็กน้อย บ่อยหรือไม่" },
  { key: "stressors", title: "สภาพแวดล้อม / ความเครียด", description: "มีปัญหาทะเลาะกับเพื่อนบ้าน มีเรื่องเงินทอง หรือเสียใจจากการสูญเสียของรักใกล้ชิด" },
  { key: "empathy", title: "ขาดการเห็นอกเห็นใจผู้อื่น", description: "ไม่เห็นใจผู้อื่น จากปัญหาหรือเหตุการณ์ที่เข้ามากระทบ" },
  { key: "cognition", title: "การตัดสินใจ ความจำ", description: "พูดจาไม่รู้เรื่อง หลงลืมบ่อยมาก หรือตัดสินใจเรื่องง่ายๆ ไม่ได้" },
  { key: "family", title: "สัมพันธภาพในครอบครัว", description: "คนในบ้านรู้สึกกลัว หรือกังวลต่ออารมณ์และพฤติกรรมของผู้ป่วย" },
  { key: "insight", title: "การรับรู้ความเจ็บป่วย", description: "ไม่ยอมรับว่าตัวเองป่วย หรือคิดว่าตัวเองปกติแล้วไม่ต้องรักษา" }
];

let registerDraftPatients = [];
let selectedPatientDetailCode = null;

// =========================================================
// 3. STORAGE & CLOUD SYNC
// =========================================================
const storage = {
  get(key, fallback) {
    try {
      const value = localStorage.getItem(`vsafe:${key}`);
      return value ? JSON.parse(value) : fallback;
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    localStorage.setItem(`vsafe:${key}`, JSON.stringify(value));
  }
};

async function syncDataFromCloud() {
  try {
    console.log("กำลังซิงค์ข้อมูลจากฐานข้อมูลจริง...");
    const response = await fetch(`${VSAFE_GAS_URL}?action=getAllData`);
    const data = await response.json();
    
    if (data.ok) {
      storage.set("patients", data.patients || []);
      storage.set("caregivers", data.caregivers || []);
      storage.set("caseManagers", data.caseManagers || []);
      storage.set("assessments", data.assessments || []);
      storage.set("alerts", data.alerts || []);
      storage.set("addressData", data.addressData || []); 
      console.log("ซิงค์ข้อมูลสำเร็จ!");
      return true;
    } else {
      console.error("ซิงค์ล้มเหลว:", data.message);
      return false;
    }
  } catch (error) {
    console.error("Network error ระหว่างการซิงค์:", error);
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
    console.info("V-SAFE Offline Mode: บันทึกลง Local ชั่วคราว", error.message);
    return { ok: true, offline: true };
  }
}

// =========================================================
// 4. ADDRESS DROPDOWN LOGIC (ดึงจาก AddressData จริง)
// =========================================================
function setupUserAddressSelects(formScope = document) {
  const provinceSelect = formScope.querySelector('select[name="province"]');
  const districtSelect = formScope.querySelector('select[name="district"]');
  const subdistrictSelect = formScope.querySelector('select[name="subdistrict"]');
  const zipcodeInput = formScope.querySelector('input[name="zipcode"]');

  if (!provinceSelect) return;

  const addressList = storage.get("addressData") || [];

  if (addressList.length === 0) {
    console.warn("ไม่พบข้อมูล AddressData ในระบบพื้นที่");
    return;
  }

  // สร้างตัวเลือกจังหวัด
  const uniqueProvinces = [...new Set(addressList.map(item => item.province))].filter(Boolean).sort();
  provinceSelect.innerHTML = '<option value="">-- เลือกจังหวัด --</option>' + 
    uniqueProvinces.map(p => `<option value="${p}">${p}</option>`).join("");

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
    
    districtSelect.innerHTML = '<option value="">-- เลือกอำเภอ --</option>' +
      uniqueAmphoes.map(a => `<option value="${a}">${a}</option>`).join("");
    
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
    
    subdistrictSelect.innerHTML = '<option value="">-- เลือกตำบล --</option>' +
      uniqueTambons.map(t => `<option value="${t}">${t}</option>`).join("");
    
    if (zipcodeInput && filtered.length > 0) {
      zipcodeInput.value = filtered[0].zipcode || "";
    }
    updateCaseManagerPreview(); // อัปเดตศูนย์ฯ ทันทีเมื่อเปลี่ยนที่อยู่
  };

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
    updateCaseManagerPreview();
  });

  refreshDistricts();
}

function setUserAddressFormValues(formElement, data) {
  if (!formElement || !data) return;

  const provinceSelect = formElement.querySelector('select[name="province"]');
  const districtSelect = formElement.querySelector('select[name="district"]');
  const subdistrictSelect = formElement.querySelector('select[name="subdistrict"]');
  const zipcodeInput = formElement.querySelector('input[name="zipcode"]');

  if (!provinceSelect) return;

  provinceSelect.value = data.province || "";
  provinceSelect.dispatchEvent(new Event("change"));

  if (districtSelect && data.district) {
    districtSelect.value = data.district;
    districtSelect.dispatchEvent(new Event("change"));
  }

  if (subdistrictSelect && data.subdistrict) {
    subdistrictSelect.value = data.subdistrict;
    subdistrictSelect.dispatchEvent(new Event("change"));
  }

  if (zipcodeInput && data.zipcode) {
    zipcodeInput.value = data.zipcode;
  }
}

// =========================================================
// 5. CAREGIVER & PATIENT LOGIC
// =========================================================
function getCaregivers() { return storage.get("caregivers", []); }
function saveCaregivers(caregivers) { storage.set("caregivers", caregivers); }
function getCurrentCaregiver() {
  const id = storage.get("currentCaregiverId", null);
  if (!id) return null;
  return getCaregivers().find((caregiver) => caregiver.id === id) || null;
}
function setCurrentCaregiver(caregiver) {
  storage.set("currentCaregiverId", caregiver.id);
  storage.set("rememberedUsername", caregiver.username);
  renderAuthenticatedApp();
}
function logoutCaregiver() {
  localStorage.removeItem("vsafe:currentCaregiverId");
  renderAuthenticatedApp();
}

function getLinkedPatients() {
  const caregiver = getCurrentCaregiver();
  if (!caregiver) return [];
  return (caregiver.patientCodes || []).map((code) => storage.get("patients", []).find(p => p.patientCode === code)).filter(Boolean);
}

function getActivePatient() {
  const caregiver = getCurrentCaregiver();
  const linked = getLinkedPatients();
  if (!caregiver || !linked.length) return null;
  return linked.find((patient) => patient.patientCode === caregiver.activePatientCode) || linked[0];
}

function setActivePatient(patientCode) {
  const current = getCurrentCaregiver();
  if (!current) return;
  const caregivers = getCaregivers();
  const index = caregivers.findIndex((c) => c.id === current.id);
  if (index < 0) return;
  caregivers[index] = { ...caregivers[index], activePatientCode: patientCode, updatedAt: new Date().toISOString() };
  saveCaregivers(caregivers);
  renderPatientPanels();
  renderAssessmentPatientOptions();
}

function classifyRisk(score) {
  if (score < 7) return "GREEN";
  if (score <= 13) return "YELLOW";
  return "RED";
}
function zoneClass(zone) { return zone.toLowerCase(); }

// =========================================================
// 6. AUTHENTICATION FLOW
// =========================================================
function initAuthFlow() {
  const remembered = storage.get("rememberedUsername", "");
  const rememberedText = document.querySelector("#rememberedUsername");
  if (rememberedText) rememberedText.textContent = `จำชื่อผู้ใช้ล่าสุด: ${remembered}`;

  document.querySelector("#loginFormUser")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const payload = Object.fromEntries(new FormData(event.currentTarget).entries());
    const caregiver = getCaregivers().find((item) => item.username === payload.username && item.password === payload.password);
    
    if (!caregiver) {
      AppDialog.alert("Username หรือ Password ไม่ถูกต้อง", "เข้าสู่ระบบล้มเหลว", "warning");
      return;
    }
    setCurrentCaregiver(caregiver);
  });

  document.querySelector("#registerAccountForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const payload = Object.fromEntries(new FormData(event.currentTarget).entries());
    
    if (payload.password !== payload.confirmPassword) {
      AppDialog.alert("Password ไม่ตรงกัน", "ข้อมูลไม่ถูกต้อง", "warning");
      return;
    }
    if (getCaregivers().some((c) => c.username === payload.username)) {
      AppDialog.alert("Username นี้ถูกใช้แล้ว", "ข้อผิดพลาด", "warning");
      return;
    }
    if (!registerDraftPatients.length) await addDraftPatientFromInput();
    if (!registerDraftPatients.length) {
      AppDialog.alert("กรุณาเพิ่มผู้ป่วยอย่างน้อย 1 คน", "ข้อมูลไม่ครบ", "warning");
      return;
    }

    payload.id = `CG-${Date.now()}`;
    payload.patientCodes = registerDraftPatients.map((p) => p.patientCode);
    payload.activePatientCode = payload.patientCodes[0];
    
    const caregivers = getCaregivers();
    caregivers.push({ ...payload, createdAt: new Date().toISOString() });
    saveCaregivers(caregivers);
    
    await apiPost("saveCaregiver", payload);
    AppDialog.alert("ลงทะเบียนเรียบร้อยแล้ว กรุณาเข้าสู่ระบบ", "สำเร็จ", "success").then(() => {
      document.querySelector('[data-nav="login"]')?.click();
      event.currentTarget.reset();
      registerDraftPatients = [];
      renderRegisterDraftList();
    });
  });
}

// =========================================================
// 7. MULTI-STEP REGISTER FORM
// =========================================================
function initRegisterForm() {
  const form = document.querySelector("#registerAccountForm");
  if (!form) return;
  setupUserAddressSelects(form); // เรียกใช้ฟังก์ชันดรอปดาวน์ใหม่ที่นี่!

  const steps = form.querySelectorAll(".register-step");
  const progressSteps = form.querySelectorAll(".step");
  let currentStep = 1;

  const showStep = (step) => {
    steps.forEach((el, index) => el.classList.toggle("active", index + 1 === step));
    progressSteps.forEach((el, index) => el.classList.toggle("active", index + 1 <= step));
  };

  form.querySelectorAll(".next-step-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const isValid = await validateRegisterStep(currentStep, form);
      if (isValid && currentStep < steps.length) {
        currentStep++;
        showStep(currentStep);
        form.scrollIntoView({ behavior: "smooth" });
      }
    });
  });

  form.querySelectorAll(".prev-step-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (currentStep > 1) {
        currentStep--;
        showStep(currentStep);
        form.scrollIntoView({ behavior: "smooth" });
      }
    });
  });

  document.querySelector("#addPatientToDraftBtn")?.addEventListener("click", async () => {
    await addDraftPatientFromInput();
  });
}

async function validateRegisterStep(step, form) {
  const currentStepEl = form.querySelector(`.register-step[data-step="${step}"]`);
  const requiredFields = currentStepEl.querySelectorAll("[required]");
  for (const field of requiredFields) {
    if (!field.checkValidity()) {
      field.reportValidity();
      return false;
    }
  }

  if (step === 2) {
    const payload = Object.fromEntries(new FormData(form).entries());
    if (payload.password !== payload.confirmPassword) {
      AppDialog.alert("Password ไม่ตรงกัน", "ตรวจสอบข้อมูล", "warning");
      return false;
    }
    if (getCaregivers().some((c) => c.username === payload.username)) {
      AppDialog.alert("Username นี้ถูกใช้แล้ว", "ข้อผิดพลาด", "warning");
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
  const input = document.querySelector("#registerPatientCodeInput");
  const val = input?.value.trim().toUpperCase();
  if (!val) return null;

  const patient = storage.get("patients", []).find((p) => p.patientCode === val);
  if (!patient) {
    AppDialog.alert("ไม่พบรหัสผู้ป่วยนี้ในระบบ", "ข้อผิดพลาด", "warning");
    return null;
  }
  if (registerDraftPatients.some((item) => item.patientCode === patient.patientCode)) {
    AppDialog.alert("ผู้ป่วยรายนี้ถูกเพิ่มไปแล้ว", "ข้อมูลซ้ำ", "info");
    return patient;
  }

  registerDraftPatients.push(patient);
  input.value = "";
  renderRegisterDraftList();
  return patient;
}

function renderRegisterDraftList() {
  const list = document.querySelector("#registerPatientDraftList");
  if (!list) return;
  list.innerHTML = registerDraftPatients.map((p) => `
    <article class="draft-patient-item">
      <span><svg><use href="#i-shield"></use></svg></span>
      <div>
        <strong>รหัส: ${escapeHtml(p.patientCode)}</strong>
        <small>HN ${escapeHtml(p.hn)}</small>
      </div>
      <button type="button" onclick="removeDraftPatient('${p.patientCode}')"><svg><use href="#i-trash"></use></svg></button>
    </article>
  `).join("");
}

window.removeDraftPatient = function(code) {
  registerDraftPatients = registerDraftPatients.filter((p) => p.patientCode !== code);
  renderRegisterDraftList();
};

// =========================================================
// 8. ASSESSMENT & HOME
// =========================================================
function initAssessmentForm() {
  const form = document.querySelector("#assessmentForm");
  if (!form) return;
  
  const questionsHtml = riskDomains.map((item, index) => `
    <fieldset class="risk-item">
      <legend><strong>ข้อ ${index + 1}: ${item.title}</strong><br><small>${item.description}</small></legend>
      <div class="radio-group-modern">
        <label><input type="radio" name="${item.key}" value="0" required /><span>ไม่มีอาการ</span></label>
        <label><input type="radio" name="${item.key}" value="1" /><span>มีเล็กน้อย</span></label>
        <label><input type="radio" name="${item.key}" value="2" /><span>มีชัดเจน/บ่อย</span></label>
      </div>
    </fieldset>
  `).join("");
  document.querySelector("#assessmentQuestions").innerHTML = questionsHtml;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const patientCode = document.querySelector("#assessmentPatientCode")?.value;
    const patient = getLinkedPatients().find((p) => p.patientCode === patientCode);
    if (!patient) {
      AppDialog.alert("กรุณาตรวจสอบผู้ป่วย", "ข้อผิดพลาด", "warning");
      return;
    }

    let score = 0;
    const answers = {};
    riskDomains.forEach((item) => {
      const value = Number(form.querySelector(`input[name="${item.key}"]:checked`)?.value || 0);
      score += value;
      answers[item.key] = value;
    });

    const zone = classifyRisk(score);
    const assessment = {
      id: `AS-${Date.now()}`,
      patientCode: patient.patientCode,
      hn: patient.hn,
      dx: patient.dx,
      patientName: patient.fullName,
      district: patient.district,
      province: patient.province,
      score,
      zone,
      status: zone === "RED" ? "รอการติดต่อ" : "ติดตามต่อเนื่อง",
      createdAt: new Date().toISOString(),
      answers
    };

    const assessments = storage.get("assessments", []);
    assessments.push(assessment);
    storage.set("assessments", assessments);

    await apiPost("saveAssessment", assessment);
    AppDialog.alert(`ประเมินสำเร็จ (คะแนน: ${score} - ${zone} ZONE)`, "สำเร็จ", "success").then(() => {
      form.reset();
      document.querySelector('[data-nav="home"]')?.click();
      renderHomeNextAssessment();
    });
  });
}

// =========================================================
// 9. APP INITIALIZATION
// =========================================================
function initNavigation() {
  document.querySelectorAll("[data-nav]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const view = btn.dataset.nav;
      document.querySelectorAll(".view-section").forEach((sec) => sec.classList.remove("active"));
      document.querySelector(`#view-${view}`)?.classList.add("active");
      document.querySelectorAll(".nav-bar button").forEach((b) => b.classList.toggle("active", b === btn));
      window.scrollTo(0, 0);
    });
  });
}

function updateCaseManagerPreview() {
  const form = document.querySelector("#registerAccountForm");
  const preview = document.querySelector("#caseManagerPreview");
  if (!form || !preview) return;
  const district = form.querySelector('select[name="district"]')?.value;
  const cm = storage.get("caseManagers", []).find((c) => c.district === district);
  if (cm) {
    preview.innerHTML = `<div><strong>${cm.workplace}</strong><br><small>โทร: ${cm.phone}</small></div>`;
  } else {
    preview.innerHTML = `<div class="muted">ไม่มีข้อมูลโรงพยาบาลในพื้นที่นี้</div>`;
  }
}

function renderAuthenticatedApp() {
  const caregiver = getCurrentCaregiver();
  document.body.classList.toggle("logged-in", !!caregiver);
  
  if (caregiver) {
    document.querySelector("#caregiverGreetingName").textContent = caregiver.fullName || caregiver.username;
    document.querySelector('[data-nav="home"]')?.click();
    renderPatientPanels();
    renderAssessmentPatientOptions();
    renderHomeNextAssessment();
  } else {
    document.querySelector('[data-nav="login"]')?.click();
  }
}

async function initUserApp() {
  await syncDataFromCloud();
  initNavigation();
  initAuthFlow();
  initRegisterForm();
  initAssessmentForm();
  renderAuthenticatedApp();
}

document.addEventListener("DOMContentLoaded", initUserApp);

// ป้องกัน HTML Injection ตอนแสดงผล
function escapeHtml(unsafe) {
  if (!unsafe) return "";
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
