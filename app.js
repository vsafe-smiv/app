const VSAFE_GAS_URL = "https://script.google.com/macros/s/AKfycbxsT6r8zi70CW7q6s-FzehYxJInL-n5k1B5___BREp_BDOtT4QcIwFscXn0k5XVkR78oA/exec";
// =========================================================
// CUSTOM DIALOG UTILITY (ลบการใช้ window.alert, confirm ทิ้ง)
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

      // ไอคอน 3 สถานะ (สำเร็จ, แจ้งเตือน, ข้อมูล)
      const icons = {
        info: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4M12 8h.01"></path></svg>`,
        success: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`,
        warning: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>`
      };

      iconEl.innerHTML = icons[type] || icons.info;
      iconEl.className = `modern-dialog-icon ${type}`;

      // กรณีเป็น Confirm (ให้แสดงปุ่มยกเลิกด้วย)
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

const riskDomains = [
  {
    key: "psychotic",
    title: "อาการทางจิต",
    en: "Psychotic symptoms",
    description: "มีพฤติกรรมพูดคนเดียว หัวเราะคนเดียว หรือแสดงอาการว่ามีคนมาทำร้าย/วางแผนที่จะเอาชีวิตหรือไม่"
  },
  {
    key: "substance",
    title: "การใช้สารเสพติด",
    en: "Substance use",
    description: "มีการดื่มเหล้า ใช้สารเสพติด หรือดื่มน้ำกระท่อมบ่อยหรือไม่"
  },
  {
    key: "personality",
    title: "บุคลิกภาพ",
    en: "Personality and impulsivity",
    description: "มีความก้าวร้าว ชอบทำอะไรไม่คิดหน้าคิดหลัง อารมณ์แปรปรวนง่ายบ่อยหรือไม่"
  },
  {
    key: "medication",
    title: "การกินยา",
    en: "Medication adherence",
    description: "ปฏิเสธการกินยา หรือแอบหยุดยา ทิ้งยา บ่อยหรือไม่"
  },
  {
    key: "anger",
    title: "อารมณ์และความโกรธ",
    en: "Anger and emotional dysregulation",
    description: "หงุดหงิดง่ายขึ้น มีการทะเลาะ หรือควบคุมอารมณ์ไม่ได้แม้เรื่องเล็กน้อย บ่อยหรือไม่"
  },
  {
    key: "stressors",
    title: "สภาพแวดล้อม / ความเครียด",
    en: "Social stressors",
    description: "มีปัญหาทะเลาะกับเพื่อนบ้าน มีเรื่องเงินทอง หรือเสียใจจากการสูญเสียของรักใกล้ชิด บ่อยหรือไม่"
  },
  {
    key: "empathy",
    title: "ขาดการเห็นอกเห็นใจผู้อื่น",
    en: "Lack of empathy",
    description: "ไม่เห็นใจผู้อื่น จากปัญหาหรือเหตุการณ์ที่เข้ามากระทบบ่อยหรือไม่"
  },
  {
    key: "cognition",
    title: "การตัดสินใจ ความจำ",
    en: "Cognition and judgement",
    description: "พูดจาไม่รู้เรื่อง หลงลืมบ่อยมาก หรือตัดสินใจเรื่องง่ายในชีวิตประจำวันไม่ได้ บ่อยหรือไม่"
  },
  {
    key: "family",
    title: "สัมพันธภาพในครอบครัว",
    en: "Family relationship",
    description: "คนในบ้านรู้สึกกลัว หรือกังวลต่ออารมณ์และพฤติกรรมของผู้ป่วย บ่อยหรือไม่"
  },
  {
    key: "insight",
    title: "การรับรู้ความเจ็บป่วย",
    en: "Insight toward illness",
    description: "ความรุนแรงในการไม่ยอมรับว่าตัวเองป่วย หรือคิดว่าตัวเองปกติแล้วไม่ต้องรักษามากเท่าใด"
  }
];

const addressData = [
  ["นครสวรรค์", "เมืองนครสวรรค์", "ปากน้ำโพ", "60000"],
  ["นครสวรรค์", "เมืองนครสวรรค์", "นครสวรรค์ตก", "60000"],
  ["นครสวรรค์", "โกรกพระ", "โกรกพระ", "60170"],
  ["นครสวรรค์", "ชุมแสง", "เกยไชย", "60120"],
  ["นครสวรรค์", "หนองบัว", "หนองบัว", "60110"],
  ["นครสวรรค์", "บรรพตพิสัย", "ท่างิ้ว", "60180"],
  ["นครสวรรค์", "เก้าเลี้ยว", "เก้าเลี้ยว", "60230"],
  ["นครสวรรค์", "ตาคลี", "ตาคลี", "60140"],
  ["นครสวรรค์", "ท่าตะโก", "ท่าตะโก", "60160"],
  ["นครสวรรค์", "ไพศาลี", "ไพศาลี", "60220"],
  ["นครสวรรค์", "พยุหะคีรี", "พยุหะ", "60130"],
  ["นครสวรรค์", "ลาดยาว", "ลาดยาว", "60150"],
  ["นครสวรรค์", "ตากฟ้า", "ตากฟ้า", "60190"],
  ["นครสวรรค์", "แม่วงก์", "แม่วงก์", "60150"],
  ["นครสวรรค์", "แม่เปิน", "แม่เปิน", "60150"],
  ["นครสวรรค์", "ชุมตาบง", "ชุมตาบง", "60150"]
];

let registerDraftPatients = [];
let selectedPatientDetailCode = null;

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
    label: "Green Zone",
    title: "ความเสี่ยงต่ำ",
    description: "ผู้ป่วยอยู่ในระดับเฝ้าระวังทั่วไป อาการคงที่ ยังไม่พบสัญญาณเตือนที่เสี่ยงต่อพฤติกรรมรุนแรง",
    steps: [
      "ให้ผู้ป่วยกินยาต่อเนื่องตามแพทย์สั่ง",
      "สื่อสารเชิงบวก พูดคุยด้วยน้ำเสียงอ่อนโยน",
      "ส่งเสริมการนอนหลับและพักผ่อนให้เพียงพอ",
      "ทำกิจกรรมร่วมกันเพื่อสร้างสัมพันธ์ที่ดี",
      "ลดความเครียดในครอบครัว เลี่ยงการตำหนิ/โต้เถียง",
      "สังเกตอาการเปลี่ยนแปลงและประเมินซ้ำหากมีความกังวล"
    ]
  },
  YELLOW: {
    label: "Yellow Zone",
    title: "ความเสี่ยงปานกลาง",
    description: "เริ่มมีสัญญาณเตือน จำเป็นต้องเฝ้าระวังใกล้ชิด หากมีอาการผิดปกติให้ติดต่อโรงพยาบาลในพื้นที่โดยด่วน",
    steps: [
      "สื่อสารด้วยน้ำเสียงสงบ อ่อนโยน",
      "หลีกเลี่ยงการโต้แย้งหรือตำหนิ",
      "ลดสิ่งกระตุ้นความเครียด",
      "เฝ้าระวังอาการอย่างใกล้ชิด",
      "ส่งเสริมการกินยาอย่างต่อเนื่อง",
      "จัดสิ่งแวดล้อมให้ปลอดภัย",
      "ประเมินซ้ำภายใน 24-48 ชั่วโมง"
    ],
    observe: [
      "นอนไม่หลับ พูดคนเดียวมากขึ้น",
      "หงุดหงิดง่าย ฉุนเฉียวง่าย",
      "หวาดระแวงหรือคิดว่ามีคนมาทำร้าย",
      "ไม่กินยา หรือกินยาไม่ต่อเนื่อง",
      "ใช้สารเสพติด ดื่มสุรา",
      "มีปัญหาความเครียดในครอบครัว"
    ]
  },
  RED: {
    label: "Red Zone",
    title: "ความเสี่ยงสูง",
    description: "มีความเสี่ยงสูงต่อการเกิดพฤติกรรมรุนแรง เข้าสู่ Emergency Response Pathway",
    steps: [
      "แยกเด็ก ผู้สูงอายุออกจากพื้นที่",
      "หลีกเลี่ยงการเผชิญหน้าและโต้เถียง",
      "พูดสั้นๆ น้ำเสียงสงบ เว้นระยะห่าง",
      "เก็บอาวุธ ของมีคม และสิ่งอันตราย",
      "เปิดทางออกหรือหาทางหนีที่ปลอดภัย",
      "ห้ามอยู่กับผู้ป่วยตามลำพัง"
    ]
  }
};

// ==========================================
// DATA LAYER (Local Cache & Cloud Sync)
// ==========================================
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
      
      // เพิ่มบรรทัดนี้ เพื่อบันทึกข้อมูลตารางที่อยู่จริงจาก Google Sheets ลง Cache ของเครื่อง
      storage.set("addressData", data.addressData || []); 
      
      console.log("ซิงค์ข้อมูลสำเร็จ!");
      return true;
    } else {
      console.error("ซิงค์ข้อมูลล้มเหลว:", data.message);
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
    console.info("V-SAFE Offline Mode: ข้อมูลถูกบันทึกลง Local ชั่วคราว", error.message);
    return { ok: true, offline: true };
  }
}

async function apiGet(action, params = {}) {
  try {
    const url = new URL(VSAFE_GAS_URL);
    url.searchParams.set("action", action);
    Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
    const response = await fetch(url.toString());
    return await response.json();
  } catch {
    return { ok: false };
  }
}

// ==========================================
// CAREGIVER & PATIENT LOGIC
// ==========================================
function getCaregivers() {
  return storage.get("caregivers", []);
}

function saveCaregivers(caregivers) {
  storage.set("caregivers", caregivers);
}

function getCurrentCaregiver() {
  const id = storage.get("currentCaregiverId", null);
  if (!id) return null;
  return getCaregivers().find((caregiver) => caregiver.id === id) || null;
}

function updateCurrentCaregiver(updates) {
  const current = getCurrentCaregiver();
  if (!current) return null;
  const caregivers = getCaregivers();
  const index = caregivers.findIndex((caregiver) => caregiver.id === current.id);
  if (index < 0) return null;
  caregivers[index] = { ...caregivers[index], ...updates, updatedAt: new Date().toISOString() };
  saveCaregivers(caregivers);
  return caregivers[index];
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
  return (caregiver.patientCodes || [])
    .map((code) => findPatient(code))
    .filter(Boolean);
}

function getActivePatient() {
  const caregiver = getCurrentCaregiver();
  const linked = getLinkedPatients();
  if (!caregiver || !linked.length) return null;
  return linked.find((patient) => patient.patientCode === caregiver.activePatientCode) || linked[0];
}

function setActivePatient(patientCode) {
  updateCurrentCaregiver({ activePatientCode: patientCode });
  renderPatientPanels();
  renderAssessmentPatientOptions();
  renderHomeNextAssessment();
  renderHelpContacts();
}

function getLinkedAssessments() {
  const codes = new Set(getLinkedPatients().map((patient) => patient.patientCode));
  return storage.get("assessments", []).filter((assessment) => codes.has(assessment.patientCode));
}

function makeAssessment(patient, score, zone, createdAt = new Date().toISOString(), answers = {}) {
  return {
    id: `AS-${Date.now()}-${Math.random().toString(16).slice(2, 7)}`,
    patientCode: patient.patientCode,
    hn: patient.hn,
    dx: patient.dx,
    patientName: patient.fullName,
    district: patient.district,
    province: patient.province,
    score,
    zone,
    status: zone === "RED" ? "รอการติดต่อ" : zone === "YELLOW" ? "เฝ้าระวัง" : "ติดตามต่อเนื่อง",
    createdAt,
    answers
  };
}

function classifyRisk(score) {
  if (score < 7) return "GREEN";
  if (score <= 13) return "YELLOW";
  return "RED";
}

function zoneClass(zone) {
  return zone.toLowerCase();
}

function formatThaiDateTime(value) {
  return new Intl.DateTimeFormat("th-TH-u-ca-buddhist", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function calculateAge(dob) {
  if (!dob) return "";
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age -= 1;
  return age;
}

function findPatient(patientCode) {
  const input = normalizePatientCode(patientCode);
  return storage.get("patients", []).find((patient) => {
    const canonical = normalizePatientCode(patient.patientCode);
    const hnSmiv = normalizePatientCode(`${patient.hn || ""}SMIV`);
    return canonical === input || hnSmiv === input;
  });
}

function normalizePatientCode(value = "") {
  return String(value).replace(/\s+/g, "").toUpperCase();
}

function upsertPatient(patient) {
  if (!patient?.patientCode) return;
  const patients = storage.get("patients", []);
  const index = patients.findIndex((item) => item.patientCode === patient.patientCode);
  if (index >= 0) patients[index] = { ...patients[index], ...patient };
  else patients.push(patient);
  storage.set("patients", patients);
}

function findCaseManager(district) {
  return storage.get("caseManagers", []).find((cm) => cm.district === district) || storage.get("caseManagers", [])[0];
}

// ==========================================
// UI & NAVIGATION INIT
// ==========================================
function initNavigation() {
  const navButtons = document.querySelectorAll("[data-nav]");
  navButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const view = button.dataset.nav;
      document.querySelectorAll(".view").forEach((item) => item.classList.remove("active"));
      document.querySelector(`#view-${view}`)?.classList.add("active");
      document.querySelectorAll(".bottom-nav button").forEach((item) => item.classList.toggle("active", item.dataset.nav === view));
      if (view === "history") renderHistory();
      if (view === "register") {
        selectedPatientDetailCode = null;
        document.querySelector("#caregiverForm")?.classList.add("hidden");
        renderPatientPanels();
      }
    });
  });
}

function setupAddressSelects(scope = document) {
  const provinceSelects = scope.querySelectorAll("#provinceSelect, #authProvinceSelect, .adminProvince");
  provinceSelects.forEach((provinceSelect) => {
    const districtSelect = provinceSelect.closest("form")?.querySelector("#districtSelect, #authDistrictSelect, .adminDistrict");
    if (!districtSelect) return;
    const subdistrictSelect = provinceSelect.closest("form")?.querySelector("#subdistrictSelect, #authSubdistrictSelect, .adminSubdistrict");
    const zipcodeInput = provinceSelect.closest("form")?.querySelector("#zipcodeInput, #authZipcodeInput, .adminZipcode");

    provinceSelect.innerHTML = unique(addressData.map((row) => row[0])).map(optionHtml).join("");

    const refreshDistricts = () => {
      const districts = unique(addressData.filter((row) => row[0] === provinceSelect.value).map((row) => row[1]));
      districtSelect.innerHTML = districts.map(optionHtml).join("");
      refreshSubdistricts();
      updateCaseManagerPreview();
    };

    const refreshSubdistricts = () => {
      if (!subdistrictSelect) return;
      const subdistricts = addressData.filter((row) => row[0] === provinceSelect.value && row[1] === districtSelect.value);
      subdistrictSelect.innerHTML = subdistricts.map((row) => optionHtml(row[2])).join("");
      if (zipcodeInput) zipcodeInput.value = subdistricts[0]?.[3] || "";
    };

    const updateCaseManagerPreview = () => {
      const preview = provinceSelect.closest("form")?.querySelector("#caseManagerPreview, #authCaseManagerPreview");
      if (!preview || !districtSelect.value) return;
      const cm = findCaseManager(districtSelect.value);
      preview.innerHTML = cm
        ? `<strong>ติดต่อโรงพยาบาลในพื้นที่:</strong><br>${cm.workplace || "โรงพยาบาลประจำอำเภอ"}<br>${cm.prefix}${cm.fullName} | โทร ${cm.phone}`
        : "ยังไม่พบข้อมูลโรงพยาบาลในพื้นที่สำหรับอำเภอนี้";
    };

    provinceSelect.addEventListener("change", refreshDistricts);
    districtSelect.addEventListener("change", () => {
      refreshSubdistricts();
      updateCaseManagerPreview();
    });
    subdistrictSelect?.addEventListener("change", () => {
      const row = addressData.find((item) => item[0] === provinceSelect.value && item[1] === districtSelect.value && item[2] === subdistrictSelect.value);
      if (zipcodeInput) zipcodeInput.value = row?.[3] || "";
    });
    refreshDistricts();
  });
}

function unique(items) {
  return [...new Set(items)];
}

function optionHtml(value) {
  return `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`;
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function patientPreviewHtml(patient) {
  return `
    <strong>รหัส: ${escapeHtml(patient.patientCode)}</strong><br>
    HN ${escapeHtml(patient.hn)} | ${escapeHtml(patient.gender)} | อายุ ${calculateAge(patient.dob)} ปี<br>
    Dx: ${escapeHtml(patient.dx)} | จำหน่าย ${formatThaiDateTime(patient.dischargeDate)}
  `;
}

async function lookupPatientToPreview(inputSelector, previewSelector) {
  const code = document.querySelector(inputSelector)?.value.trim();
  const preview = document.querySelector(previewSelector);
  if (!preview || !code) return null;
  let patient = findPatient(code);
  const remote = await apiGet("getPatient", { patientCode: code });
  if (remote.ok && remote.patient) {
    patient = remote.patient;
    upsertPatient(patient);
  }
  if (!patient) {
    AppDialog.alert("ไม่พบรหัสผู้ป่วย กรุณาตรวจสอบการลงทะเบียน", "ข้อผิดพลาด", "warning");
    return;
  }
  preview.innerHTML = patientPreviewHtml(patient);
  if (inputSelector === "#authPatientCodeLookup") populatePatientEdit(patient);
  return patient;
}

function populatePatientEdit(patient) {
  const wrap = document.querySelector("#authPatientEdit");
  const form = document.querySelector("#registerAccountForm");
  if (!wrap || !form) return;
  wrap.classList.remove("hidden");
  form.elements.reviewHn.value = patient.hn || "";
  form.elements.reviewPrefix.value = patient.prefix || "";
  form.elements.reviewFullName.value = patient.fullName || "";
  form.elements.reviewGender.value = patient.gender || "ชาย";
  form.elements.reviewDx.value = patient.dx || "";
  form.elements.reviewDischargeDate.value = patient.dischargeDate ? new Date(patient.dischargeDate).toISOString().slice(0, 10) : "";
}

function patientFromEdit(basePatient) {
  const form = document.querySelector("#registerAccountForm");
  if (!form) return basePatient;
  return {
    ...basePatient,
    hn: form.elements.reviewHn.value || basePatient.hn,
    prefix: form.elements.reviewPrefix.value || basePatient.prefix,
    fullName: form.elements.reviewFullName.value || basePatient.fullName,
    gender: form.elements.reviewGender.value || basePatient.gender,
    dx: form.elements.reviewDx.value || basePatient.dx,
    dischargeDate: form.elements.reviewDischargeDate.value || basePatient.dischargeDate
  };
}

// ==========================================
// AUTHENTICATION & REGISTRATION
// ==========================================
function initAuthFlow() {
  document.querySelectorAll("[data-auth-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      const mode = button.dataset.authMode;
      showAuthForm(mode);
    });
  });

  document.querySelectorAll("[data-auth-back]").forEach((button) => {
    button.addEventListener("click", showAuthCover);
  });

  const remembered = storage.get("rememberedUsername", "");
  const rememberedText = document.querySelector("#rememberedUserText");
  const loginUsername = document.querySelector('#loginFormUser input[name="username"]');
  if (remembered && loginUsername) {
    loginUsername.value = remembered;
    if (rememberedText) rememberedText.textContent = `จำชื่อผู้ใช้ล่าสุด: ${remembered}`;
  }

  document.querySelector("#authLookupPatient")?.addEventListener("click", () => {
    lookupPatientToPreview("#authPatientCodeLookup", "#authPatientPreview");
  });

  document.querySelector("#authAddPatient")?.addEventListener("click", addDraftPatientFromInput);
  document.querySelectorAll("[data-social-provider]").forEach((button) => {
    button.addEventListener("click", () => applySocialSignup(button.dataset.socialProvider));
  });
  document.querySelectorAll("[data-register-next]").forEach((button) => {
    button.addEventListener("click", async () => {
      const step = Number(document.querySelector(".register-step.active")?.dataset.registerStep || 1);
      if (await validateRegisterStep(step)) setRegisterStep(step + 1);
    });
  });
  document.querySelectorAll("[data-register-prev]").forEach((button) => {
    button.addEventListener("click", () => {
      const step = Number(document.querySelector(".register-step.active")?.dataset.registerStep || 1);
      setRegisterStep(step - 1);
    });
  });

  document.querySelector("#loginFormUser")?.addEventListener("submit", (event) => {
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
    AppDialog.alert("Password และยืนยัน Password ไม่ตรงกัน", "ข้อมูลไม่ถูกต้อง", "warning");
    return;
  }
  if (getCaregivers().some((caregiver) => caregiver.username === payload.username)) {
    AppDialog.alert("Username นี้ถูกใช้แล้ว กรุณาเลือกชื่อผู้ใช้อื่น", "ชื่อผู้ใช้ซ้ำ", "warning");
    return;
  }
  if (!registerDraftPatients.length) await addDraftPatientFromInput();
  if (!registerDraftPatients.length) {
    AppDialog.alert("กรุณาเพิ่มผู้ป่วยอย่างน้อย 1 คนก่อนลงทะเบียน", "ข้อมูลไม่ครบ", "warning");
    return;
  }

    const caregiver = {
      id: `CG-${Date.now()}`,
      username: payload.username,
      password: payload.password,
      prefix: payload.prefix,
      fullName: payload.fullName,
      gender: payload.gender,
      relationship: payload.relationship,
      phone: payload.phone,
      province: payload.province,
      district: payload.district,
      subdistrict: payload.subdistrict,
      zipcode: payload.zipcode,
      addressLine: payload.addressLine,
      patientCodes: registerDraftPatients.map((patient) => patient.patientCode),
      activePatientCode: registerDraftPatients[0].patientCode,
      createdAt: new Date().toISOString()
    };
    const caregivers = getCaregivers();
    caregivers.push(caregiver);
    saveCaregivers(caregivers);
    apiPost("saveCaregiver", caregiver);
    registerDraftPatients = [];
    renderDraftPatients();
    setCurrentCaregiver(caregiver);
  });

  document.querySelector("#logoutBtn")?.addEventListener("click", logoutCaregiver);
}

function showAuthForm(mode) {
  document.querySelector("#authGate")?.classList.add("form-open");
  document.querySelectorAll("[data-auth-mode]").forEach((item) => item.classList.toggle("active", item.dataset.authMode === mode));
  document.querySelector("#loginFormUser")?.classList.toggle("active", mode === "login");
  document.querySelector("#registerAccountForm")?.classList.toggle("active", mode === "register");
  if (mode === "register") setRegisterStep(1);
}

function showAuthCover() {
  document.querySelector("#authGate")?.classList.remove("form-open");
  document.querySelector("#loginFormUser")?.classList.remove("active");
  document.querySelector("#registerAccountForm")?.classList.remove("active");
}

function applySocialSignup(provider) {
  const form = document.querySelector("#registerAccountForm");
  if (!form) return;
  const providerLabel = { facebook: "Facebook", line: "Line", google: "Google", apple: "Apple" }[provider] || provider;
  const suffix = Date.now().toString(36).slice(-5);
  form.elements.authProvider.value = provider;
  form.elements.username.value = `${provider}_${suffix}`;
  form.elements.password.value = `${providerLabel}@${suffix}`;
  form.elements.confirmPassword.value = `${providerLabel}@${suffix}`;
  document.querySelectorAll("[data-social-provider]").forEach((button) => {
    button.classList.toggle("selected", button.dataset.socialProvider === provider);
  });
  const note = document.querySelector("#socialSignupNote");
  if (note) note.textContent = `เลือกสร้างบัญชีด้วย ${providerLabel} แล้ว ระบบตัวอย่างจะสร้าง Username ให้อัตโนมัติ`;
}

function setRegisterStep(step) {
  const nextStep = Math.min(5, Math.max(1, step));
  document.querySelectorAll(".register-step").forEach((panel) => {
    panel.classList.toggle("active", Number(panel.dataset.registerStep) === nextStep);
  });
  document.querySelectorAll("[data-step-dot]").forEach((dot) => {
    const dotStep = Number(dot.dataset.stepDot);
    dot.classList.toggle("active", dotStep === nextStep);
    dot.classList.toggle("done", dotStep < nextStep);
  });
}

async function validateRegisterStep(step) {
  const form = document.querySelector("#registerAccountForm");
  const panel = document.querySelector(`[data-register-step="${step}"]`);
  if (!form || !panel) return false;
  const fields = [...panel.querySelectorAll("input, select, textarea")].filter((field) => !field.disabled);
  for (const field of fields) {
    if (!field.checkValidity()) {
      field.reportValidity();
      return false;
    }
  }
  if (step === 2) {
    const payload = Object.fromEntries(new FormData(form).entries());
    if (payload.password !== payload.confirmPassword) {
      AppDialog.alert("Password และยืนยัน Password ไม่ตรงกัน", "ข้อมูลไม่ถูกต้อง", "warning");
      return false;
    }
    if (getCaregivers().some((caregiver) => caregiver.username === payload.username)) {
      AppDialog.alert("Username นี้ถูกใช้แล้ว กรุณาเลือกชื่อผู้ใช้อื่น", "ข้อมูลไม่ถูกต้อง", "warning");
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
  const patient = await lookupPatientToPreview("#authPatientCodeLookup", "#authPatientPreview");
  if (!patient) return null;
  const reviewedPatient = patientFromEdit(patient);
  upsertPatient(reviewedPatient);
  if (registerDraftPatients.some((item) => item.patientCode === reviewedPatient.patientCode)) {
    AppDialog.alert("ผู้ป่วยรายนี้ถูกเพิ่มแล้ว", "ข้อมูลซ้ำ", "info");
    return reviewedPatient;
  }
  registerDraftPatients.push(reviewedPatient);
  renderDraftPatients();
  document.querySelector("#authPatientCodeLookup").value = "";
  document.querySelector("#authPatientEdit")?.classList.add("hidden");
  return patient;
}

function renderDraftPatients() {
  const container = document.querySelector("#authPatientChips");
  if (!container) return;
  container.innerHTML = registerDraftPatients.length
    ? registerDraftPatients
        .map(
          (patient, index) => `
            <div class="patient-mini">
              <span>${index + 1}</span>
              <strong>HN ${escapeHtml(patient.hn)} | รหัส ${escapeHtml(patient.patientCode)}</strong>
              <button type="button" data-remove-draft-patient="${escapeHtml(patient.patientCode)}">ลบ</button>
            </div>
          `
        )
        .join("")
    : "";
  container.querySelectorAll("[data-remove-draft-patient]").forEach((button) => {
    button.addEventListener("click", () => {
      registerDraftPatients = registerDraftPatients.filter((patient) => patient.patientCode !== button.dataset.removeDraftPatient);
      renderDraftPatients();
    });
  });
}

function renderAuthenticatedApp() {
  const caregiver = getCurrentCaregiver();
  document.querySelector("#authGate")?.classList.toggle("hidden", Boolean(caregiver));
  document.querySelector("#appMain")?.classList.toggle("hidden", !caregiver);
  document.querySelector(".bottom-nav")?.classList.toggle("hidden", !caregiver);
  document.querySelector("#logoutBtn")?.classList.toggle("hidden", !caregiver);
  const chip = document.querySelector("#sessionUserChip");
  if (chip) {
    chip.classList.toggle("hidden", !caregiver);
    chip.textContent = caregiver ? caregiver.username : "";
  }
  if (!caregiver) {
    showAuthCover();
    return;
  }
  prefillCaregiverForm(caregiver);
  renderPatientPanels();
  renderAssessmentPatientOptions();
  renderHomeNextAssessment();
  renderHistory();
  renderHelpContacts();
}

// ==========================================
// RENDERERS (Patient, Assessment, UI)
// ==========================================
function prefillCaregiverForm(caregiver) {
  const form = document.querySelector("#caregiverForm");
  if (!form) return;
  ["prefix", "fullName", "gender", "relationship", "phone", "addressLine"].forEach((name) => {
    const field = form.elements[name];
    if (field && caregiver[name]) field.value = caregiver[name];
  });
}

function renderPatientPanels() {
  const linked = getLinkedPatients();
  const active = getActivePatient();
  if (!linked.some((patient) => patient.patientCode === selectedPatientDetailCode)) {
    selectedPatientDetailCode = null;
  }

  const homeHtml = linked.length
    ? linked
        .map((patient, index) => {
          const score = Number(patient.lastScore ?? patient.baselineScore ?? 0);
          const zone = patient.lastZone || classifyRisk(score);
          const isActive = active?.patientCode === patient.patientCode;
          
          let statusColor = "#34c759";
          if (zone === "YELLOW") statusColor = "#f59e0b";
          if (zone === "RED") statusColor = "#ff3b30";

          return `
            <div data-active-patient="${escapeHtml(patient.patientCode)}" style="display: flex; justify-content: space-between; align-items: center; padding: 0.85rem 0; cursor: pointer; border-bottom: 1px solid rgba(255,255,255,0.1); ${isActive ? 'opacity: 1;' : 'opacity: 0.75;'} transition: opacity 0.2s;">
              
              <div style="display: flex; flex-direction: column; gap: 0.25rem;">
                <div style="font-size: 1.15rem; font-weight: 700; color: white; letter-spacing: 0.5px;">
                  รหัส: ${escapeHtml(patient.patientCode)}
                </div>
                <div style="font-size: 0.85rem; color: rgba(255, 255, 255, 0.85);">
                  HN ${escapeHtml(patient.hn)}
                </div>
                <div style="font-size: 0.8rem; color: rgba(255, 255, 255, 0.7); display: flex; align-items: center; gap: 0.3rem; margin-top: 0.1rem;">
                  <svg style="width: 0.9rem; height: 0.9rem; opacity: 0.8;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                  ${escapeHtml(patient.district)}, ${escapeHtml(patient.province)}
                </div>
              </div>
              
              <div style="background: ${statusColor}; padding: 0.5rem 0.75rem; border-radius: 0.75rem; text-align: center; box-shadow: 0 4px 10px rgba(0,0,0,0.15); min-width: 4.8rem;">
                <div style="font-size: 1rem; font-weight: 800; color: white; line-height: 1; text-transform: uppercase;">
                  ${zone}
                </div>
                <div style="font-size: 0.65rem; font-weight: 500; color: rgba(255,255,255,0.95); margin-top: 0.25rem;">
                  ${score} คะแนน
                </div>
              </div>

            </div>
          `;
        })
        .join("")
    : `<div style="color: rgba(255,255,255,0.7); text-align: center; padding: 1rem;">ยังไม่มีผู้ป่วยในบัญชีนี้</div>`;

  const linkedHtml = linked.length
    ? linked
        .map((patient, index) => {
          const score = Number(patient.lastScore ?? patient.baselineScore ?? 0);
          const zone = patient.lastZone || classifyRisk(score);
          const isActive = active?.patientCode === patient.patientCode;
          return `
            <button class="patient-card ${isActive ? "active" : ""}" data-active-patient="${escapeHtml(patient.patientCode)}" type="button">
              <span class="patient-number">${index + 1}</span>
              <strong>รหัส: ${escapeHtml(patient.patientCode)}</strong>
              <small>HN ${escapeHtml(patient.hn)} | ${escapeHtml(patient.district)}</small>
              <em class="${zoneClass(zone)}">${zone} ${score} คะแนน</em>
            </button>
          `;
        })
        .join("")
    : `<div class="muted-box">ยังไม่มีผู้ป่วยในบัญชีนี้</div>`;

  const homeContainer = document.querySelector("#homePatientList");
  if (homeContainer) {
    homeContainer.innerHTML = homeHtml;
    const lastItem = homeContainer.lastElementChild;
    if(lastItem && lastItem.tagName === "DIV") lastItem.style.borderBottom = "none";
    
    homeContainer.querySelectorAll("[data-active-patient]").forEach((button) => {
      button.addEventListener("click", () => setActivePatient(button.dataset.activePatient));
    });
  }

  const linkedContainer = document.querySelector("#linkedPatientList");
  if (linkedContainer) {
    linkedContainer.innerHTML = linkedHtml;
    linkedContainer.querySelectorAll("[data-active-patient]").forEach((button) => {
      button.addEventListener("click", () => {
        selectedPatientDetailCode = button.dataset.activePatient;
        setActivePatient(button.dataset.activePatient);
        document.querySelector("#caregiverForm")?.classList.add("hidden");
        renderPatientDetailPanel();
      });
    });
  }

  const form = document.querySelector("#caregiverForm");
  const addButton = document.querySelector("#showAddPatientForm");
  if (form) {
    const limitReached = linked.length >= 3;
    form.classList.toggle("hidden", limitReached || form.classList.contains("hidden"));
    addButton?.classList.toggle("hidden", limitReached);
    if (limitReached && document.querySelector("#linkedPatientList")) {
      document.querySelector("#linkedPatientList").insertAdjacentHTML("beforeend", `<div class="muted-box">เพิ่มผู้ป่วยครบ 3 คนแล้ว หากต้องการแก้ไขข้อมูลกรุณาติดต่อโรงพยาบาลในพื้นที่</div>`);
    }
  }
  renderPatientDetailPanel();
}

function renderPatientDetailPanel() {
  const panel = document.querySelector("#patientDetailPanel");
  if (!panel) return;
  const patient = selectedPatientDetailCode ? findPatient(selectedPatientDetailCode) : null;
  if (!patient) {
    panel.classList.add("hidden");
    panel.innerHTML = "";
    return;
  }
  const score = Number(patient.lastScore ?? patient.baselineScore ?? 0);
  const zone = patient.lastZone || classifyRisk(score);
  const latest = getLinkedAssessments()
    .filter((assessment) => assessment.patientCode === patient.patientCode)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
  const cm = findCaseManager(patient.district);
  panel.classList.remove("hidden");
  panel.innerHTML = `
    <article class="patient-detail-card ${zoneClass(zone)}">
      <div class="detail-head">
        <span class="detail-icon"><svg><use href="#i-shield"></use></svg></span>
        <div>
          <strong>รหัส: ${escapeHtml(patient.patientCode)}</strong>
          <small>HN ${escapeHtml(patient.hn)} | Dx ${escapeHtml(patient.dx || "-")}</small>
        </div>
        <em>${zone}</em>
      </div>
      <div class="detail-grid">
        <span>คะแนนล่าสุด <b>${score}</b></span>
        <span>พื้นที่ <b>${escapeHtml(patient.district || "-")}</b></span>
        <span>จำหน่าย <b>${patient.dischargeDate ? formatThaiDateTime(patient.dischargeDate) : "-"}</b></span>
        <span>ประเมินล่าสุด <b>${latest ? formatThaiDateTime(latest.createdAt) : "ยังไม่มี"}</b></span>
      </div>
      <div class="detail-manager">
        <svg><use href="#i-nurse"></use></svg>
        <span>${cm ? `${cm.workplace || "โรงพยาบาลในพื้นที่"} | โทร ${cm.phone}` : "ยังไม่พบข้อมูลโรงพยาบาลในพื้นที่"}</span>
      </div>
    </article>
  `;
}

function renderAssessmentPatientOptions() {
  const select = document.querySelector("#assessmentPatientCode");
  if (!select) return;
  const linked = getLinkedPatients();
  const active = getActivePatient();
  select.innerHTML = linked.length
    ? linked.map((patient) => `<option value="${escapeHtml(patient.patientCode)}">HN ${escapeHtml(patient.hn)} - รหัส ${escapeHtml(patient.patientCode)}</option>`).join("")
    : `<option value="">ยังไม่มีผู้ป่วยในบัญชีนี้</option>`;
  if (active) select.value = active.patientCode;
}

function initRegisterForm() {
  const relationship = document.querySelector("#relationship");
  relationship?.addEventListener("change", () => {
    document.querySelector("#otherRelationWrap")?.classList.toggle("hidden", relationship.value !== "อื่นๆ");
  });

  document.querySelector("#lookupPatient")?.addEventListener("click", async () => {
    await lookupPatientToPreview("#patientCodeLookup", "#patientPreview");
  });

  document.querySelector("#showAddPatientForm")?.addEventListener("click", () => {
    const form = document.querySelector("#caregiverForm");
    document.querySelector("#patientDetailPanel")?.classList.add("hidden");
    form?.classList.toggle("hidden");
    if (form && !form.classList.contains("hidden")) form.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  document.querySelector("#caregiverForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const caregiver = getCurrentCaregiver();
    if (!caregiver) {
    AppDialog.alert("กรุณาเข้าสู่ระบบก่อนเพิ่มผู้ป่วย", "คำเตือน", "warning");
    return;
  }
    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(form.entries());
    const patient = findPatient(payload.patientCode);
    if (!patient) {
    AppDialog.alert("ยังไม่พบรหัสผู้ป่วย กรุณากดตรวจสอบข้อมูลก่อน", "ข้อผิดพลาด", "warning");
    return;
  }
    const patientCodes = caregiver.patientCodes || [];
    if (patientCodes.includes(patient.patientCode)) {
    AppDialog.alert("ผู้ป่วยรายนี้อยู่ในบัญชีของคุณแล้ว", "ข้อมูลซ้ำ", "info");
    return;
  }
  if (patientCodes.length >= 3) {
    AppDialog.alert("เพิ่มผู้ป่วยได้สูงสุด 3 คนต่อบัญชี", "จำกัดจำนวน", "warning");
    return;
  }
    const updated = updateCurrentCaregiver({
      ...payload,
      patientCodes: [...patientCodes, patient.patientCode],
      activePatientCode: patient.patientCode
    });
    apiPost("saveCaregiver", updated);
    event.currentTarget.reset();
    prefillCaregiverForm(updated);
    renderPatientPanels();
    renderAssessmentPatientOptions();
    document.querySelector('[data-nav="assessment"]')?.click();
  });
}

function renderAssessmentItems() {
  const container = document.querySelector("#assessmentItems");
  if (!container) return;
  container.innerHTML = riskDomains
    .map(
      (item, index) => `
        <article class="assessment-item">
          <h3>${index + 1}. ${item.title}</h3>
          <p>${item.description}</p>
          <div class="score-options">
            <label class="score-option score-0"><input type="radio" name="${item.key}" value="0" checked><span>0</span>ไม่มีเลย</label>
            <label class="score-option score-1"><input type="radio" name="${item.key}" value="1"><span>1</span>บางวัน</label>
            <label class="score-option score-2"><input type="radio" name="${item.key}" value="2"><span>2</span>เป็นบ่อย</label>
          </div>
        </article>
      `
    )
    .join("");

  container.addEventListener("change", updateLiveScore);
}

function updateLiveScore() {
  const score = riskDomains.reduce((sum, item) => {
    const checked = document.querySelector(`input[name="${item.key}"]:checked`);
    return sum + Number(checked?.value || 0);
  }, 0);
  const liveScore = document.querySelector("#liveScore");
  if (liveScore) liveScore.textContent = `${score} / 20`;
}

function initAssessmentForm() {
  document.querySelector("#assessmentPatientCode")?.addEventListener("change", (event) => {
    if (event.target.value) setActivePatient(event.target.value);
  });

  document.querySelector("#assessmentForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const patientCode = new FormData(form).get("patientCode")?.toString().trim();
    
    // 1. ตรวจสอบข้อมูลผู้ป่วยและสิทธิ์
    const patient = storage.get("patients", []).find(p => p.patientCode === patientCode);
    if (!patient) {
      return AppDialog.alert("ไม่พบรหัสผู้ป่วย กรุณาตรวจสอบการลงทะเบียน", "ข้อผิดพลาด", "warning");
    }
    if (!getLinkedPatients().some((item) => item.patientCode === patientCode)) {
      return AppDialog.alert("ผู้ป่วยรายนี้ไม่ได้อยู่ในบัญชีของคุณ", "ข้อผิดพลาด", "warning");
    }

    // 2. คำนวณคะแนน (Raw Score + Baseline Score)
    const answers = {};
    const rawScore = riskDomains.reduce((sum, item) => {
    const value = Number(form.querySelector(`input[name="${item.key}"]:checked`)?.value || 0);
    answers[item.key] = value;
    return sum + value;
  }, 0);

    const finalScore = rawScore + baselineScore; // รวมคะแนนฐานเดิม
    const zone = classifyRisk(finalScore);
    
    console.log(`ประเมินสำเร็จ: Raw ${rawScore} + Baseline ${baselineScore} = Total ${finalScore} (${zone})`);

    // 3. สร้างข้อมูลการประเมิน
    const assessment = makeAssessment(patient, finalScore, zone, new Date().toISOString(), answers);

    // 4. บันทึกข้อมูลลง Local Storage
    const assessments = storage.get("assessments", []);
    assessments.push(assessment);
    storage.set("assessments", assessments);

    const patients = storage.get("patients", []);
    const index = patients.findIndex((item) => item.patientCode === patientCode);
    if (index >= 0) {
      patients[index] = { 
        ...patients[index], 
        lastScore: finalScore, 
        lastZone: zone, 
        status: assessment.status, 
        updatedAt: assessment.createdAt 
      };
      storage.set("patients", patients);
    }

    // 5. แจ้งเตือน SOS (เฉพาะ RED ZONE เท่านั้น)
    if (zone === "RED") {
      const alerts = storage.get("alerts", []);
      alerts.unshift({ 
        ...assessment, 
        alertId: `ALT-${Date.now()}`, 
        acknowledged: false 
      });
      storage.set("alerts", alerts);
      // ส่งข้อมูลเข้าเซิร์ฟเวอร์หลังบ้าน (ถ้าต้องการให้แอดมินเห็น)
      await apiPost("saveAlert", assessment);
    }

    // 6. จบการทำงาน
    await apiPost("saveAssessment", assessment);
    setActivePatient(patientCode);
    showResultDialog(assessment);
    renderHomeNextAssessment();
  });
}

function showResultDialog(assessment) {
  const dialog = document.querySelector("#resultDialog");
  const content = document.querySelector("#resultContent");
  const advice = zoneAdvice[assessment.zone];
  const cm = findCaseManager(assessment.district);
  
  if (!dialog || !content) return;

  const extra = assessment.zone === "YELLOW"
    ? `<h3>สิ่งที่ผู้ดูแลควรสังเกตเพิ่มเติม</h3><ul class="advice-list">${advice.observe.map((item) => `<li>${item}</li>`).join("")}</ul>`
    : "";

  let riskLevelName = "ต่ำ";
  if (assessment.zone === "YELLOW") riskLevelName = "ปานกลาง";
  if (assessment.zone === "RED") riskLevelName = "สูง";

  const knowledgeBlockHtml = `
    <div onclick="if(typeof filterKnowledgeByZone === 'function') filterKnowledgeByZone('${assessment.zone}'); document.querySelector('[data-nav=\\'knowledge\\']')?.click(); document.querySelector('#resultDialog')?.close();" 
         style="background: #f0fdfa; border: 1px solid #0f766e; border-radius: 1rem; padding: 1rem; margin-bottom: 1.25rem; display: flex; align-items: center; gap: 0.75rem; cursor: pointer; box-shadow: 0 4px 12px rgba(15, 118, 110, 0.05); text-align: left; transition: transform 0.2s;">
      <div style="background: #0f766e; color: white; width: 2.2rem; height: 2.2rem; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
        <svg style="width: 1.2rem; height: 1.2rem;" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>
      </div>
      <div style="flex: 1;">
        <span style="font-weight: 700; color: #0f766e; font-size: 0.95rem; display: block;">คลังความรู้สำหรับผู้ป่วยกลุ่มเสี่ยง${riskLevelName}</span>
        <span style="font-size: 0.8rem; color: #64748b;">แนะนำวิธีการดูแลเฉพาะกลุ่มเสี่ยงนี้</span>
      </div>
      <svg style="width: 1.1rem; height: 1.1rem; color: #0f766e;" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"></path></svg>
    </div>
  `;

  const emergency = assessment.zone === "RED"
    ? `<a class="danger-btn wide" href="tel:${cm?.phone || "1669"}">SOS โทรโรงพยาบาลในพื้นที่ ทันที</a>`
    : ``; 

  content.innerHTML = `
    <div class="result-header ${zoneClass(assessment.zone)}">
      <p>${advice.label} | คะแนน ${assessment.score}</p>
      <h2>${advice.title}</h2>
      <span>${advice.description}</span>
    </div>
    
    <h3>คำแนะนำสำหรับผู้ดูแล</h3>
    <ul class="advice-list">${advice.steps.map((item) => `<li>${item}</li>`).join("")}</ul>
    ${extra}
    
    ${knowledgeBlockHtml}
    
    <div class="contact-list">
      ${contactItems(cm).map(contactHtml).join("")}
    </div>
    
    <div class="dialog-actions single">
      ${emergency}
      <button class="primary-btn wide" data-close-dialog>รับทราบ</button>
    </div>
  `;

  content.querySelector("[data-close-dialog]")?.addEventListener("click", () => dialog.close());
  dialog.showModal();
}

function filterKnowledgeByZone(zone) {
  const knowledgeGrids = document.querySelectorAll(".knowledge-grid");
  if (!knowledgeGrids.length) return;

  knowledgeGrids.forEach((grid) => {
    const items = grid.querySelectorAll(".knowledge-icon-btn");
    items.forEach((item) => {
      const text = item.querySelector("span")?.textContent?.trim() || "";
      let itemZone = "GREEN"; 

      if (["รู้โรค", "อารมณ์ดี", "คุยกัน"].includes(text)) {
        itemZone = "GREEN";   
      } else if (["กิจวัตร", "ปลอดยา", "ใจสบาย"].includes(text)) {
        itemZone = "YELLOW";  
      } else if (["ตกลงกัน", "ปลอดภัย", "อยู่ร่วมกัน"].includes(text)) {
        itemZone = "RED";     
      }

      if (!zone || itemZone === zone) {
        item.style.setProperty("display", "flex", "important");
      } else {
        item.style.setProperty("display", "none", "important");
      }
    });
  });
}

function renderHomeNextAssessment() {
  const dateTarget = document.querySelector("#nextAssessmentDateText");
  const statusTarget = document.querySelector("#nextAssessmentStatus");
  const countdownTarget = document.querySelector("#nextAssessmentCountdown");
  
  if (!dateTarget) return;

  const active = getActivePatient();
  if (!active) {
    dateTarget.textContent = "ไม่มีข้อมูล";
    if (statusTarget) statusTarget.textContent = "กรุณาเพิ่มผู้ป่วย";
    if (countdownTarget) countdownTarget.textContent = "";
    return;
  }

  const assessments = getLinkedAssessments()
    .filter((assessment) => assessment.patientCode === active.patientCode)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  if (!assessments.length) {
    dateTarget.textContent = "ประเมินทันที";
    dateTarget.style.color = "#ef4444"; 
    if (statusTarget) statusTarget.textContent = "ยังไม่มีประวัติในระบบ";
    if (countdownTarget) {
      countdownTarget.textContent = "รอการประเมินครั้งแรก";
      countdownTarget.style.color = "#ef4444";
    }
    return;
  }

  let consecutiveGreenCount = 0;
  
  for (const assessment of assessments) {
    if (assessment.zone === "GREEN") {
      consecutiveGreenCount++;
    } else {
      break; 
    }
  }

  const latest = assessments[0]; 
  let intervalDays = 7;
  let statusText = "";

  if (latest.zone === "RED") {
    intervalDays = 1;
    statusText = "สถานะสีแดง: ประเมินซ้ำทุก 1 วัน";
  } else if (latest.zone === "YELLOW") {
    intervalDays = 2;
    statusText = "สถานะสีเหลือง: ประเมินซ้ำทุก 2 วัน";
  } else if (latest.zone === "GREEN") {
    if (consecutiveGreenCount <= 4) {
      intervalDays = 7;
      statusText = `สถานะสีเขียว (ระดับ 1): ประเมินทุก 7 วัน`;
    } else if (consecutiveGreenCount <= 6) {
      intervalDays = 14;
      statusText = `สถานะสีเขียว (ระดับ 2): ประเมินทุก 14 วัน`;
    } else {
      intervalDays = 30;
      statusText = `สถานะสีเขียว (ระดับ 3): ประเมินทุก 30 วัน`;
    }
  }

  const lastDate = new Date(latest.createdAt);
  const nextDate = new Date(lastDate.getTime() + intervalDays * 86400000);
  
  const options = { day: 'numeric', month: 'short', year: 'numeric' };
  dateTarget.textContent = nextDate.toLocaleDateString('th-TH', options);

  if (statusTarget) statusTarget.textContent = statusText;

  if (countdownTarget) {
    const today = new Date();
    today.setHours(0, 0, 0, 0); 
    
    const nextDateOnly = new Date(nextDate);
    nextDateOnly.setHours(0, 0, 0, 0); 
    
    const diffTime = nextDateOnly - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays > 0) {
      countdownTarget.textContent = `อีก ${diffDays} วัน`;
      countdownTarget.style.color = "#64748b"; 
      dateTarget.style.color = "#0f766e"; 
    } else {
      if (diffDays === 0) {
        countdownTarget.textContent = "ครบกำหนดวันนี้!";
        countdownTarget.style.color = "#f59e0b"; 
        dateTarget.style.color = "#f59e0b";
      } else {
        countdownTarget.textContent = `เกินกำหนด ${Math.abs(diffDays)} วัน!`;
        countdownTarget.style.color = "#ef4444"; 
        dateTarget.style.color = "#ef4444";
      }
      
      if (typeof checkAndShowDuePopup === "function") {
        checkAndShowDuePopup(active);
      }
    }
  }
}

function checkAndShowDuePopup(activePatient) {
  const dialog = document.querySelector("#dueAssessmentDialog");
  if (!dialog) return;

  const nameLabel = document.querySelector("#duePatientName");
  if(nameLabel) nameLabel.textContent = `รหัส ${activePatient.patientCode}`;

  if (!dialog.open) {
    dialog.showModal();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  document.querySelector("#btnStartDueAssessment")?.addEventListener("click", () => {
    document.querySelector("#dueAssessmentDialog")?.close();
    document.querySelector('[data-nav="assessment"]')?.click();
  });
  
  document.querySelector("#btnCloseDueDialog")?.addEventListener("click", () => {
    document.querySelector("#dueAssessmentDialog")?.close();
  });
});

function renderHistory() {
  const container = document.querySelector("#historyList");
  if (!container) return;
  const assessments = getLinkedAssessments().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  container.innerHTML = assessments.length
    ? assessments
        .map(
          (item) => `
            <button class="timeline-item ${zoneClass(item.zone)}" data-assessment-detail="${escapeHtml(item.id)}" type="button">
              <span class="timeline-icon"><svg><use href="#i-${item.zone === "GREEN" ? "shield" : item.zone === "YELLOW" ? "eye" : "phone"}"></use></svg></span>
              <strong>${zoneAdvice[item.zone].label} | ${item.score} คะแนน</strong>
              <p>HN ${item.hn} | ${item.dx} | ${item.district}</p>
              <small>${formatThaiDateTime(item.createdAt)}</small>
            </button>
          `
        )
        .join("")
    : `<div class="muted-box">ยังไม่มีประวัติการประเมิน</div>`;
  container.querySelectorAll("[data-assessment-detail]").forEach((button) => {
    button.addEventListener("click", () => showAssessmentDetail(button.dataset.assessmentDetail));
  });
}

function showAssessmentDetail(assessmentId) {
  const assessment = storage.get("assessments", []).find((item) => item.id === assessmentId);
  const dialog = document.querySelector("#resultDialog");
  const content = document.querySelector("#resultContent");
  if (!assessment || !dialog || !content) return;
  const advice = zoneAdvice[assessment.zone];
  const answerRows = riskDomains
    .map((domain) => `<li><span>${domain.title}</span><b>${assessment.answers?.[domain.key] ?? "-"}</b></li>`)
    .join("");
  content.innerHTML = `
    <div class="result-header ${zoneClass(assessment.zone)}">
      <p>${formatThaiDateTime(assessment.createdAt)}</p>
      <h2>${advice.label} | ${assessment.score} คะแนน</h2>
      <span>HN ${escapeHtml(assessment.hn)} | Dx ${escapeHtml(assessment.dx)} | ${escapeHtml(assessment.district)}</span>
    </div>
    <h3>รายละเอียดคำตอบ</h3>
    <ul class="readonly-answer-list">${answerRows}</ul>
    <div class="dialog-actions single">
      <button class="primary-btn" data-close-dialog>ปิด</button>
    </div>
  `;
  content.querySelector("[data-close-dialog]")?.addEventListener("click", () => dialog.close());
  dialog.showModal();
}

function renderKnowledge() {
  const container = document.querySelector("#knowledgeList");
  if (!container) return;
  container.innerHTML = knowledgeItems
    .map(([title, detail]) => `<article class="knowledge-item"><strong>${title}</strong><p>${detail}</p></article>`)
    .join("");
}

function contactItems(cm) {
  return [
    { type: "nurse", name: cm ? cm.workplace || "โรงพยาบาลในพื้นที่" : "โรงพยาบาลในพื้นที่", phone: cm?.phone || "056990888", image: "./nurse.png" },
    { type: "ambulance", name: "ฉุกเฉิน 1669", phone: "1669", image: "./EMS.png" },
    { type: "police", name: "ตำรวจ 191", phone: "191", image: "./Police.png" },
    { type: "hospital", name: "รพ.จิตเวชนครสวรรค์ราชนครินทร์", phone: "056219444", image: "./nph%20logo.png" },
    { type: "mental", name: "สายด่วนสุขภาพจิต 1323", phone: "1323", image: "./กรมสุขภาพจิต.png" }
  ];
}

function contactHtml(contact) {
  return `
    <article class="contact-item ${contact.type}">
      <span class="contact-icon">
        ${contact.image ? `<img src="${contact.image}" alt="" />` : `<svg><use href="#${contact.icon}"></use></svg>`}
      </span>
      <div><strong>${contact.name}</strong><br><small>${contact.phone}</small></div>
      <a href="tel:${contact.phone}">โทร</a>
    </article>
  `;
}

function renderHelpContacts() {
  const container = document.querySelector("#helpContacts");
  if (!container) return;
  const activePatient = getActivePatient();
  const cm = findCaseManager(activePatient?.district);
  container.innerHTML = contactItems(cm).map(contactHtml).join("");
}

function initSosButtons() {
  document.querySelector("#homeSos")?.addEventListener("click", async () => {
    const latestPatient = getActivePatient();
    if (!latestPatient) {
    AppDialog.alert("กรุณาเพิ่มผู้ป่วยก่อนใช้ฟังก์ชัน SOS", "ไม่สามารถดำเนินการได้", "warning");
    return;
  }
    const cm = findCaseManager(latestPatient?.district);
    const alerts = storage.get("alerts", []);
    alerts.unshift({
      alertId: `SOS-${Date.now()}`,
      patientCode: latestPatient?.patientCode || "",
      hn: latestPatient?.hn || "",
      dx: latestPatient?.dx || "",
      district: latestPatient?.district || "",
      score: latestPatient?.lastScore || latestPatient?.baselineScore || 0,
      zone: "RED",
      status: "รอการช่วยเหลือ",
      createdAt: new Date().toISOString(),
      acknowledged: false
    });
    storage.set("alerts", alerts);
    await apiPost("saveAlert", alerts[0]);
    window.location.href = `tel:${cm?.phone || "1669"}`;
  });
}

function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./service-worker.js").catch(() => undefined);
  }
}

// ==========================================
// MAIN INITIALIZATION (Async/Await Cloud Sync)
// ==========================================
async function initUserApp() {
  if (!document.body.classList.contains("user-app")) return;
  
  // ซิงค์ข้อมูลลงมาให้พร้อมก่อนเปิดแอป
  await syncDataFromCloud();
  
  initNavigation();
  setupAddressSelects();
  initAuthFlow();
  initRegisterForm();
  renderAssessmentItems();
  ();
  renderKnowledge();
  initSosButtons();
  renderAuthenticatedApp();
  registerServiceWorker();
}

document.addEventListener("DOMContentLoaded", initUserApp);

// ==========================================
// ระบบตรวจสอบเงื่อนไขความยินยอม (Consent Logic)
// ==========================================
function initConsentLogic() {
  const check1 = document.getElementById('consentCheck1');
  const check2 = document.getElementById('consentCheck2');
  const radioAgree = document.getElementById('consentRadioAgree');
  const radioDisagree = document.getElementById('consentRadioDisagree');
  const nextBtn = document.getElementById('step1NextBtn'); 

  if (!check1 || !check2 || !radioAgree || !radioDisagree || !nextBtn) return;

  const evaluateConsent = () => {
    const isFullyConsented = check1.checked && check2.checked && radioAgree.checked;
    nextBtn.disabled = !isFullyConsented;
  };

  const consentInputs = document.querySelectorAll('.consent-input');
  consentInputs.forEach(input => {
    input.addEventListener('change', evaluateConsent);
  });

  evaluateConsent();
}

document.addEventListener("DOMContentLoaded", () => {
  initConsentLogic(); 
});

document.addEventListener("DOMContentLoaded", () => {
  const knowledgeTabBtn = document.querySelector('[data-nav="knowledge"]');
  if (knowledgeTabBtn) {
    knowledgeTabBtn.addEventListener("click", () => {
      if (typeof filterKnowledgeByZone === "function") {
        filterKnowledgeByZone(null);
      }
    });
  }
});
