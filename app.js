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

const AppLoading = {
  count: 0,
  init() {
    if (document.getElementById("appLoadingOverlay")) return;
    const html = `
      <div id="appLoadingOverlay" class="app-loading-overlay" role="status" aria-live="polite" aria-hidden="true">
        <div class="app-loading-box">
          <div class="app-loading-spinner" aria-hidden="true"></div>
          <p id="appLoadingMessage" class="app-loading-message">กำลังโหลดข้อมูล</p>
          <p class="app-loading-subtext">กรุณารอสักครู่</p>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML("beforeend", html);
  },
  show(message = "กำลังโหลดข้อมูล") {
    this.init();
    this.count += 1;
    const overlay = document.getElementById("appLoadingOverlay");
    const messageEl = document.getElementById("appLoadingMessage");
    if (messageEl) messageEl.textContent = message;
    overlay?.classList.add("active");
    overlay?.setAttribute("aria-hidden", "false");
  },
  hide() {
    if (this.count > 0) this.count -= 1;
    if (this.count > 0) return;
    const overlay = document.getElementById("appLoadingOverlay");
    overlay?.classList.remove("active");
    overlay?.setAttribute("aria-hidden", "true");
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
let userAppInitialized = false;
let assessmentSubmitting = false;

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

// TTL สำหรับ Sync — ข้ามการโหลดซ้ำถ้าข้อมูลยังใหม่อยู่ (3 นาที)
const SYNC_TTL_MS = 3 * 60 * 1000;
// Timeout สำหรับ Fetch — ป้องกัน GAS แขวนนานเกิน 12 วินาที
const SYNC_TIMEOUT_MS = 12000;

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
  },
  remove(key) {
    localStorage.removeItem(`vsafe:${key}`);
  }
};

function clearCloudDataCache() {
  ["patients", "caregivers", "caseManagers", "assessments", "alerts", "addressData", "knowledgeCategories", "knowledgeContent", "lastSync"].forEach((key) => storage.remove(key));
}

/** ตรวจสอบว่าข้อมูลใน Cache ยังสด (ภายใน TTL) หรือไม่ */
function isSyncFresh() {
  const lastSync = storage.get("lastSync", 0);
  return (Date.now() - lastSync) < SYNC_TTL_MS;
}

/** บันทึก timestamp ของ Sync ล่าสุด */
function markSyncTime() {
  storage.set("lastSync", Date.now());
}

/** ดึงข้อมูลทั้งหมดจาก Cloud พร้อม Timeout 12 วินาที */
async function fetchAllDataWithTimeout() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SYNC_TIMEOUT_MS);
  try {
    const response = await fetch(`${VSAFE_GAS_URL}?action=getAllData`, { signal: controller.signal });
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

/** บันทึกข้อมูลที่ได้จาก Cloud ลง localStorage */
function applyCloudData(data) {
  if (!data || !data.ok) return false;
  storage.set("patients", mergeLatestAssessmentsIntoPatients(data.patients || [], data.assessments || []));
  storage.set("caregivers", data.caregivers || []);
  storage.set("caseManagers", data.caseManagers || []);
  storage.set("assessments", data.assessments || []);
  storage.set("alerts", data.alerts || []);
  storage.set("addressData", data.addressData || []);
  storage.set("knowledgeCategories", data.knowledgeCategories || []);
  storage.set("knowledgeContent", data.knowledgeContent || []);
  markSyncTime();
  return true;
}

async function syncDataFromCloud(options = {}) {
  const { silent = false, force = false, message = "กำลังโหลดข้อมูล" } = options;

  // ข้ามถ้าข้อมูลยังใหม่อยู่ (ไม่ใช่ force sync)
  if (!force && isSyncFresh() && storage.get("patients", null) !== null) {
    return true;
  }

  if (!silent) AppLoading.show(message);
  try {
    const data = await fetchAllDataWithTimeout();
    const ok = applyCloudData(data);
    if (!ok) {
      // ล้าง lastSync เพื่อให้โหลดใหม่ครั้งหน้า
      storage.remove("lastSync");
      return false;
    }
    return true;
  } catch (error) {
    if (error.name === "AbortError") {
      console.warn("ซิงค์ข้อมูลหมดเวลา (Timeout)");
      // ถ้ายังมี Cache เก่า ใช้ได้เลยโดยไม่ล้าง
      if (storage.get("patients", null) !== null) return true;
    }
    console.error("ซิงค์ข้อมูลล้มเหลว:", error);
    return false;
  } finally {
    if (!silent) AppLoading.hide();
  }
}

/** POST ข้อมูลไปยัง Cloud แล้ว re-sync แบบ background (ไม่ block UI) */
async function apiPost(action, payload) {
  AppLoading.show("กำลังบันทึกข้อมูล");
  try {
    const body = new URLSearchParams({ action, payload: JSON.stringify(payload) });
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000); // 20s timeout สำหรับ write
    let result;
    try {
      const response = await fetch(VSAFE_GAS_URL, { method: "POST", body, signal: controller.signal });
      result = await response.json();
    } finally {
      clearTimeout(timer);
    }
    if (!result.ok) {
      throw new Error(result.error || result.message || "Cloud save failed");
    }
    // บังคับ re-sync เพื่อดึงข้อมูลที่ถูกต้องจาก Cloud (invalidate TTL)
    syncDataFromCloud({ silent: true, force: true }).catch(() => {});
    return result;
  } catch (error) {
    console.error("V-SAFE Cloud Save Failed:", error.message);
    return { ok: false, error: error.message };
  } finally {
    AppLoading.hide();
  }
}

async function saveToCloudOrAlert(action, payload, message = "ไม่สามารถบันทึกข้อมูลลงได้ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองใหม่") {
  const result = await apiPost(action, payload);
  if (!result.ok) {
    await AppDialog.alert(`${message}\n\nรายละเอียด: ${result.error || "ไม่ทราบสาเหตุ"}`, "บันทึกไม่สำเร็จ", "warning");
    return false;
  }
  return true;
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

async function setActivePatient(patientCode) {
  const caregiver = getCurrentCaregiver();
  if (!caregiver) return;
  if (caregiver.activePatientCode === patientCode) {
    renderPatientPanels();
    renderAssessmentPatientOptions();
    renderHomeNextAssessment();
    renderHelpContacts();
    return;
  }
  const updated = { ...caregiver, activePatientCode: patientCode, updatedAt: thaiTimestamp() };
  const saved = await saveToCloudOrAlert("saveCaregiver", updated, "ไม่สามารถบันทึกผู้ป่วยที่เลือกได้");
  if (!saved) return;
  storage.set("currentCaregiverId", updated.id);
  renderPatientPanels();
  renderAssessmentPatientOptions();
  renderHomeNextAssessment();
  renderHelpContacts();
}

function getLinkedAssessments() {
  const codes = new Set(getLinkedPatients().map((patient) => patient.patientCode));
  return storage.get("assessments", []).filter((assessment) => codes.has(assessment.patientCode));
}

function thaiTimestamp(date = new Date()) {
  const source = date instanceof Date ? date : new Date(date);
  const safeDate = Number.isNaN(source.getTime()) ? new Date() : source;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    hourCycle: "h23"
  }).formatToParts(safeDate).reduce((acc, part) => {
    if (part.type !== "literal") acc[part.type] = part.value;
    return acc;
  }, {});
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}+07:00`;
}

function timestampMs(value) {
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? ms : 0;
}

function getLatestAssessment(patientCode, assessments = storage.get("assessments", [])) {
  const normalizedCode = normalizePatientCode(patientCode);
  return assessments
    .filter((assessment) => normalizePatientCode(assessment.patientCode) === normalizedCode)
    .sort((a, b) => timestampMs(b.createdAt) - timestampMs(a.createdAt))[0] || null;
}

function riskStatusByZone(zone) {
  if (zone === "RED") return "รอการติดต่อ";
  if (zone === "YELLOW") return "เฝ้าระวัง";
  return "ติดตามต่อเนื่อง";
}

function getPatientRiskSummary(patient, assessments = storage.get("assessments", [])) {
  const latest = getLatestAssessment(patient?.patientCode, assessments);
  const score = Number(latest?.score ?? patient?.lastScore ?? patient?.baselineScore ?? 0);
  const zone = latest?.zone || patient?.lastZone || classifyRisk(score);
  return {
    score,
    zone,
    status: latest?.status || patient?.status || riskStatusByZone(zone),
    latest,
    updatedAt: latest?.createdAt || patient?.updatedAt || patient?.createdAt || thaiTimestamp()
  };
}

function mergeLatestAssessmentsIntoPatients(patients = [], assessments = []) {
  return patients.map((patient) => {
    const summary = getPatientRiskSummary(patient, assessments);
    return {
      ...patient,
      lastScore: summary.score,
      lastZone: summary.zone,
      status: summary.status,
      updatedAt: summary.updatedAt
    };
  });
}

function makeAssessment(patient, score, zone, createdAt = thaiTimestamp(), answers = {}) {
  return {
    id: `AS-${Date.now()}-${Math.random().toString(16).slice(2, 7)}`,
    patientCode: patient.patientCode,
    hn: patient.hn,
    dx: patient.dx,
    patientName: "",
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
  const s = Number(score || 0);
  if (s < 7) {
    return "GREEN";
  } else if (s >= 7 && s <= 13) {
    return "YELLOW";
  } else {
    return "RED";
  }
}

function zoneClass(zone) {
  if (!zone) return "green"; // หากไม่มีข้อมูล Zone ให้แสดงผลเป็นสีเขียว (Green) เป็นค่าเริ่มต้น
  return String(zone).toLowerCase(); // แปลงเป็น String ก่อนเสมอเพื่อป้องกัน Error
}
function toIsoDateString(value) {
  if (!value) return "";
  let str = String(value).trim();
  
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

function calculateAge(dob) {
  if (!dob) return "";
  const ceDob = toIsoDateString(dob);
  const birth = new Date(ceDob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age -= 1;
  return age;
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

function normalizeCredential(value = "") {
  return String(value ?? "").trim();
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
      if (view === "knowledge") renderKnowledge();
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
    <strong>รหัสผู้ป่วย: ${escapeHtml(patient.patientCode)}</strong><br>
    อายุ ${calculateAge(patient.dob)} ปี | Dx: ${escapeHtml(patient.dx)}
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
  form.elements.reviewDischargeDate.value = patient.dischargeDate ? toIsoDateString(patient.dischargeDate) : "";
  initDateInputHelpers(wrap);
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
    dischargeDate: toIsoDateString(form.elements.reviewDischargeDate.value) || basePatient.dischargeDate
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
    const username = normalizeCredential(payload.username);
    const password = normalizeCredential(payload.password);
    const caregiver = getCaregivers().find((item) => normalizeCredential(item.username) === username && normalizeCredential(item.password) === password);
    if (!caregiver) {
    AppDialog.alert("Username หรือ Password ไม่ถูกต้อง", "เข้าสู่ระบบล้มเหลว", "warning");
    return;
  }
    setCurrentCaregiver(caregiver);
  });

  document.querySelector("#registerAccountForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const payload = Object.fromEntries(new FormData(event.currentTarget).entries());
    if (normalizeCredential(payload.password) !== normalizeCredential(payload.confirmPassword)) {
    AppDialog.alert("Password และยืนยัน Password ไม่ตรงกัน", "ข้อมูลไม่ถูกต้อง", "warning");
    return;
  }
  const username = normalizeCredential(payload.username);
  const password = normalizeCredential(payload.password);
  if (getCaregivers().some((caregiver) => normalizeCredential(caregiver.username) === username)) {
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
      username,
      password,
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
      createdAt: thaiTimestamp()
    };
    const saved = await saveToCloudOrAlert("saveCaregiver", caregiver, "ไม่สามารถสร้างบัญชีผู้ดูแลได้");
    if (!saved) return;
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
  if (nextStep === 5) fillCaregiverServiceAreaFromPatient();
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
    if (normalizeCredential(payload.password) !== normalizeCredential(payload.confirmPassword)) {
      AppDialog.alert("Password และยืนยัน Password ไม่ตรงกัน", "ข้อมูลไม่ถูกต้อง", "warning");
      return false;
    }
    if (getCaregivers().some((caregiver) => normalizeCredential(caregiver.username) === normalizeCredential(payload.username))) {
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
  if (registerDraftPatients.some((item) => item.patientCode === reviewedPatient.patientCode)) {
    AppDialog.alert("ผู้ป่วยรายนี้ถูกเพิ่มแล้ว", "ข้อมูลซ้ำ", "info");
    return reviewedPatient;
  }
  registerDraftPatients.push(reviewedPatient);
  renderDraftPatients();
  fillCaregiverServiceAreaFromPatient();
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
      fillCaregiverServiceAreaFromPatient();
    });
  });
}

function fillCaregiverServiceAreaFromPatient() {
  const form = document.querySelector("#registerAccountForm");
  if (!form) return;
  const patient = registerDraftPatients[0];
  if (!patient) return;
  setUserAddressValues(form, {
    province: patient.province || "",
    district: patient.district || "",
    subdistrict: patient.subdistrict || "",
    zipcode: patient.zipcode || ""
  });
  renderAuthCaseManagerPreview();
}

function renderAuthCaseManagerPreview() {
  const preview = document.querySelector("#authCaseManagerPreview");
  const form = document.querySelector("#registerAccountForm");
  if (!preview || !form) return;
  const district = form.elements.district?.value || "";
  if (!district) {
    preview.textContent = "ระบบจะแสดงข้อมูลโรงพยาบาลในพื้นที่ หลังเลือกอำเภอ";
    return;
  }
  const cm = findCaseManager(district);
  preview.innerHTML = cm
    ? `<strong>ติดต่อโรงพยาบาลในพื้นที่:</strong><br>${escapeHtml(cm.workplace || "โรงพยาบาลประจำอำเภอ")}<br>${escapeHtml(`${cm.prefix || ""}${cm.fullName || ""}`)} | โทร ${escapeHtml(cm.phone || "-")}`
    : "ยังไม่พบข้อมูลโรงพยาบาลในพื้นที่สำหรับอำเภอนี้";
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
          const { score, zone } = getPatientRiskSummary(patient);
          const isActive = active?.patientCode === patient.patientCode;
          
          let statusColor = "#34c759";
          if (zone === "YELLOW") statusColor = "#f59e0b";
          if (zone === "RED") statusColor = "#ff3b30";

          return `
            <div data-active-patient="${escapeHtml(patient.patientCode)}" style="display: flex; justify-content: space-between; align-items: center; padding: 0.85rem 0; cursor: pointer; border-bottom: 1px solid rgba(255,255,255,0.1); ${isActive ? 'opacity: 1;' : 'opacity: 0.75;'} transition: opacity 0.2s;">
              
              <div style="display: flex; flex-direction: column; gap: 0.25rem;">
                <div style="font-size: 1.15rem; font-weight: 700; color: white; letter-spacing: 0.5px;">
                  รหัสผู้ป่วย: ${escapeHtml(patient.patientCode)}
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
          const { score, zone } = getPatientRiskSummary(patient);
          const isActive = active?.patientCode === patient.patientCode;
          return `
            <button class="patient-card ${isActive ? "active" : ""}" data-active-patient="${escapeHtml(patient.patientCode)}" type="button">
              <span class="patient-number">${index + 1}</span>
              <strong>รหัสผู้ป่วย: ${escapeHtml(patient.patientCode)}</strong>
              <small>${escapeHtml(patient.district)}, ${escapeHtml(patient.province)}</small>
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
  const { score, zone, latest } = getPatientRiskSummary(patient, getLinkedAssessments());
  const cm = findCaseManager(patient.district);
  panel.classList.remove("hidden");
  panel.innerHTML = `
    <article class="patient-detail-card ${zoneClass(zone)}">
      <div class="detail-head">
        <span class="detail-icon"><svg><use href="#i-shield"></use></svg></span>
        <div>
          <strong>รหัสผู้ป่วย: ${escapeHtml(patient.patientCode)}</strong>
          <small>Dx ${escapeHtml(patient.dx || "-")} | ${escapeHtml(patient.district || "-")}</small>
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
    ? linked.map((patient) => `<option value="${escapeHtml(patient.patientCode)}">รหัสผู้ป่วย: ${escapeHtml(patient.patientCode)}</option>`).join("")
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
    const updated = {
      ...caregiver,
      ...payload,
      patientCodes: [...patientCodes, patient.patientCode],
      activePatientCode: patient.patientCode
    };
    updated.updatedAt = thaiTimestamp();
    const saved = await saveToCloudOrAlert("saveCaregiver", updated, "ไม่สามารถเพิ่มผู้ป่วยเข้าบัญชีได้");
    if (!saved) return;
    storage.set("currentCaregiverId", updated.id);
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
  let score = 0;
  for (const item of riskDomains) {
    const checked = document.querySelector(`input[name="${item.key}"]:checked`);
    const val = Number(checked?.value ?? 0);
    score += isNaN(val) ? 0 : val;
  }
  score = Math.round(Number(score));
  if (isNaN(score) || score < 0) score = 0;

  const liveScore = document.querySelector("#liveScore");
  if (liveScore) {
    const zone = classifyRisk(score);
    // แสดงสีตาม Zone แบบ real-time
    liveScore.textContent = `${score} / 20`;
    liveScore.style.color = zone === "RED" ? "#ef4444" : zone === "YELLOW" ? "#f59e0b" : "#22c55e";
  }
}

// ==========================================
// ASSESSMENT LOGIC (แก้ไขไม่รวม Baseline)
// ==========================================
function initAssessmentForm() {
  document.querySelector("#assessmentPatientCode")?.addEventListener("change", (event) => {
    if (event.target.value) setActivePatient(event.target.value);
  });

  document.querySelector("#assessmentForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    
    // ป้องกันการกดยืนยันซ้ำซ้อนขณะที่ระบบกำลังส่งข้อมูล
    if (assessmentSubmitting) return;
    assessmentSubmitting = true;

    try {
      const form = event.currentTarget;
      const patientCode = new FormData(form).get("patientCode")?.toString().trim();
      
      // 1. ตรวจสอบข้อมูลผู้ป่วยและสิทธิ์
      const patient = storage.get("patients", []).find(p => p.patientCode === patientCode);
      if (!patient) {
        AppDialog.alert("ไม่พบรหัสผู้ป่วย กรุณาตรวจสอบการลงทะเบียน", "ข้อผิดพลาด", "warning");
        return;
      }
      if (!getLinkedPatients().some((item) => item.patientCode === patientCode)) {
        AppDialog.alert("ผู้ป่วยรายนี้ไม่ได้อยู่ในบัญชีของคุณ", "ข้อผิดพลาด", "warning");
        return;
      }

      // 2. คำนวณคะแนน (ใช้เฉพาะคะแนนประเมินปัจจุบันที่กดเลือกหน้าเว็บเท่านั้น ห้ามบวก Baseline)
      const answers = {};
      let finalScore = 0;
      for (const item of riskDomains) {
        const checked = form.querySelector(`input[name="${item.key}"]:checked`);
        const val = Number(checked?.value ?? 0);
        answers[item.key] = isNaN(val) ? 0 : val;
        finalScore += answers[item.key];
      }
      // รับรองเป็น integer เสมอ — ป้องกัน NaN / ทศนิยมผิดพลาด
      finalScore = Math.round(Number(finalScore));
      if (isNaN(finalScore) || finalScore < 0) finalScore = 0;

      // จัดระดับความเสี่ยงตามคะแนนที่ได้จริงในการประเมินครั้งนี้
      const zone = classifyRisk(finalScore);

      console.log(`[V-SAFE] ผลประเมิน: คะแนน = ${finalScore} | Zone = ${zone}`);
      console.log('[V-SAFE] คำตอบแต่ละข้อ:', answers);


      // 3. สร้างข้อมูลการประเมิน
      const assessment = makeAssessment(patient, finalScore, zone, new Date().toISOString(), answers);

      // 4. บันทึกข้อมูลลง Local Storage (อัปเดตประวัติการประเมิน)
      const assessments = storage.get("assessments", []);
      assessments.push(assessment);
      storage.set("assessments", assessments);

      // 5. อัปเดตข้อมูลคะแนนล่าสุดในโปรไฟล์ผู้ป่วย
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

      // 6. แจ้งเตือน SOS (เฉพาะ RED ZONE)
      if (zone === "RED") {
        // อัปเดต Local Storage ทันทีเพื่อ UI แสดงผลได้เบื้องต้น (Optimistic UI)
        const alerts = storage.get("alerts", []);
        const newAlert = {
          alertId: `ALT-${Date.now()}`,
          patientCode: assessment.patientCode,
          hn: assessment.hn,
          dx: assessment.dx,
          district: assessment.district,
          score: assessment.score,
          zone: assessment.zone,
          status: assessment.status,
          createdAt: assessment.createdAt,
          acknowledged: false
        };
        alerts.unshift(newAlert);
        storage.set("alerts", alerts);
        // หมายเหตุ: ไม่ต้องเรียก apiPost("saveAlert") แยกต่างหาก
        // Backend สร้าง Alert อัตโนมัติแล้วภายใน saveAssessment (Atomic)
      }

      // 7. บันทึกผลประเมินขึ้นคลาวด์และแสดงผล
      if (typeof apiPost === 'function') {
         await apiPost("saveAssessment", assessment);
      }
      
      setActivePatient(patientCode);
      
      // แสดง Popup สรุปผล
      if (typeof showResultDialog === 'function') showResultDialog(assessment);
      if (typeof renderHomeNextAssessment === 'function') renderHomeNextAssessment();
      
      // รีเซ็ตฟอร์มหลังจากสำเร็จ
      form.reset();
      if (typeof updateLiveScore === 'function') updateLiveScore();

    } catch (error) {
       console.error("เกิดข้อผิดพลาดในการประเมินผล:", error);
       AppDialog.alert("เกิดข้อผิดพลาดในระบบประเมิน กรุณาลองใหม่อีกครั้ง", "ข้อผิดพลาด", "warning");
    } finally {
      // ปลดล็อคการกดปุ่ม
      assessmentSubmitting = false; 
    }
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

// =========================================================
// KNOWLEDGE VIEW - User Frontend (App)
// =========================================================

/** Category icons mapping from local images */
const KM_CAT_ICONS = {
  "CAT-01": "./1.รู้โรค.png",
  "CAT-02": "./2.อารมณ์ดี.png",
  "CAT-03": "./3.คุยกัน.png",
  "CAT-04": "./4.กิจวัตร.png",
  "CAT-05": "./5.ปลอดยา.png",
  "CAT-06": "./6.ใจสบาย.png",
  "CAT-07": "./7.ตกลงกัน.png",
  "CAT-08": "./8.ปลอดภัย.png",
  "CAT-09": "./9.อยู่ร่วมกัน.png"
};

let kmUserActiveCat = "ALL";
let kmUserActiveZone = null; // null = no zone filter (show all published)

/** Build category tab bar and render initial content */
function renderKnowledge() {
  buildKmUserTabs();
  renderKmUserContent();
}

/** Open knowledge view for a specific category name from homepage */
function openUserKnowledgeCategory(categoryName) {
  // Clear risk zone filter when clicking category directly from homepage
  kmUserActiveZone = null;

  const cats = storage.get("knowledgeCategories", []);
  const matched = cats.find(c => c.name === categoryName);
  if (matched) {
    kmUserActiveCat = matched.categoryId;
  } else {
    kmUserActiveCat = "ALL";
  }

  // Find the hidden data-nav="knowledge" button and click it to trigger SPA routing
  const trigger = document.querySelector('[data-nav="knowledge"]');
  if (trigger) {
    trigger.click();
  } else {
    // Fallback manual view swap
    document.querySelectorAll(".view").forEach((item) => item.classList.remove("active"));
    document.querySelector(`#view-knowledge`)?.classList.add("active");
    document.querySelectorAll(".bottom-nav button").forEach((item) => item.classList.remove("active"));
    renderKnowledge();
  }
}

/** Build category tabs in the user knowledge view */
function buildKmUserTabs() {
  const tabBar = document.querySelector("#knowledgeViewTabs");
  if (!tabBar) return;

  const cats = storage.get("knowledgeCategories", []);
  if (cats.length === 0) {
    tabBar.innerHTML = "";
    return;
  }

  const sorted = [...cats].sort((a, b) => Number(a.order || 0) - Number(b.order || 0));

  tabBar.innerHTML = `
    <button class="knowledge-view-tab ${kmUserActiveCat === "ALL" ? "active" : ""}" data-kcat="ALL">
      📚<span>ทั้งหมด</span>
    </button>
  ` + sorted.map(c => {
    const icon = KM_CAT_ICONS[c.categoryId];
    const img = icon ? `<img src="${escapeHtml(icon)}" alt="${escapeHtml(c.name)}" />` : `📖`;
    return `<button class="knowledge-view-tab ${kmUserActiveCat === c.categoryId ? "active" : ""}" data-kcat="${c.categoryId}">
      ${img}<span>${escapeHtml(c.name)}</span>
    </button>`;
  }).join("");

  tabBar.querySelectorAll(".knowledge-view-tab").forEach(btn => {
    btn.addEventListener("click", () => {
      kmUserActiveCat = btn.dataset.kcat;
      tabBar.querySelectorAll(".knowledge-view-tab").forEach(t => t.classList.toggle("active", t === btn));
      renderKmUserContent();
    });
  });
}

/** Render knowledge content items */
function renderKmUserContent() {
  const container = document.querySelector("#knowledgeList");
  if (!container) return;

  const cats = storage.get("knowledgeCategories", []);
  if (cats.length === 0) {
    container.innerHTML = `
      <div class="km-user-empty" style="color: #b91c1c;">
        ❌ ไม่สามารถโหลดเนื้อหาได้ กรุณาลองใหม่อีกครั้ง
        <br>
        <button onclick="syncDataFromCloud().then(renderKnowledge)" class="secondary-btn" style="margin-top: 0.75rem; font-family: inherit; font-size: 0.85rem; padding: 0.4rem 0.8rem; border-radius: 0.5rem; cursor: pointer;">
          🔄 โหลดใหม่
        </button>
      </div>`;
    return;
  }

  let contents = storage.get("knowledgeContent", []);

  // Only show published items
  contents = contents.filter(c => (c.status || "published") === "published");

  // Filter by category
  if (kmUserActiveCat !== "ALL") {
    contents = contents.filter(c => c.categoryId === kmUserActiveCat);
  }

  // Filter by active zone (set from assessment result modal)
  if (kmUserActiveZone) {
    contents = contents.filter(c => {
      const z = c.zoneTarget || "ALL";
      return z === "ALL" || z === kmUserActiveZone || z.split(",").map(v => v.trim()).includes(kmUserActiveZone);
    });
  }

  // Sort by order
  contents.sort((a, b) => Number(a.order || 99) - Number(b.order || 99));

  if (contents.length === 0) {
    const msg = kmUserActiveZone
      ? `ไม่พบเนื้อหาสำหรับกลุ่มเสี่ยง ${kmUserActiveZone} ในหมวดนี้`
      : "ยังไม่มีเนื้อหาในหมวดนี้";
    container.innerHTML = `<div class="km-user-empty">📚 ${msg}</div>`;
    return;
  }

  container.innerHTML = contents.map(c => renderKmUserPreviewItem(c)).join("");
}

/** Build HTML for simplified knowledge content preview card (user view) */
function renderKmUserPreviewItem(c) {
  let mediaThumb = "";
  if (c.contentType === "image" && c.imageUrl) {
    mediaThumb = `<div class="km-item-thumb"><img src="${escapeHtml(c.imageUrl)}" alt="" loading="lazy" /></div>`;
  } else if ((c.contentType === "video_link" || c.contentType === "video_file") && c.videoUrl) {
    mediaThumb = `<div class="km-item-thumb video-placeholder"><span class="play-icon">▶</span></div>`;
  } else {
    mediaThumb = `<div class="km-item-thumb default-placeholder">📚</div>`;
  }

  const descHtml = c.description
    ? `<p class="km-item-short-desc">${escapeHtml(c.description.length > 80 ? c.description.substring(0, 80) + "..." : c.description)}</p>`
    : "";

  return `
    <article class="km-content-item-preview" onclick="openKmUserDetail('${escapeHtml(c.contentId)}')">
      ${mediaThumb}
      <div class="km-item-preview-body">
        <h4 class="km-item-preview-title">${escapeHtml(c.title || "-")}</h4>
        ${descHtml}
        <span class="km-read-more">อ่านต่อ →</span>
      </div>
    </article>`;
}

/** Open details of a single knowledge content item in a dialog modal */
function openKmUserDetail(contentId) {
  const contents = storage.get("knowledgeContent", []);
  const item = contents.find(c => c.contentId === contentId);
  if (!item) return;

  const detailContentEl = document.querySelector("#knowledgeDetailContent");
  const dialog = document.querySelector("#knowledgeDetailDialog");
  if (!detailContentEl || !dialog) return;

  // Media section
  let mediaHtml = "";
  if (item.contentType === "image" && item.imageUrl) {
    mediaHtml = `
      <div class="km-content-item-media" style="margin: -1.25rem -1.25rem 1.25rem -1.25rem; cursor: zoom-in;" onclick="showFullscreenImage('${escapeHtml(item.imageUrl)}')">
        <img src="${escapeHtml(item.imageUrl)}" alt="${escapeHtml(item.title)}" style="width:100%; max-height: 280px; object-fit: cover; display: block;" loading="lazy" />
      </div>`;
  } else if (item.contentType === "video_link" && item.videoUrl) {
    const embedUrl = getKmEmbedUrl(item.videoUrl);
    if (embedUrl) {
      mediaHtml = `
        <div class="km-content-item-media km-video-container" style="margin: -1.25rem -1.25rem 1.25rem -1.25rem; position: relative; aspect-ratio: 16/9; background: #000;">
          <div class="km-media-status" style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; color: white; font-family: 'Prompt', sans-serif; font-size: 0.9rem; z-index: 2; pointer-events: none;">
            <span class="km-media-msg">กำลังโหลดสื่อ…</span>
          </div>
          <iframe src="${embedUrl}" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen style="width:100%; height:100%; aspect-ratio: 16/9; border: 0; display: block; position: relative; z-index: 1;" loading="lazy"
            onload="this.parentElement.querySelector('.km-media-status').style.display = 'none';">
          </iframe>
        </div>`;
    } else {
      // Fallback: check if it's direct video link format
      const isDirectUrl = item.videoUrl.match(/\.(mp4|webm|ogg)/i);
      if (isDirectUrl) {
        mediaHtml = `
          <div class="km-content-item-media km-video-container" style="margin: -1.25rem -1.25rem 1.25rem -1.25rem; position: relative; aspect-ratio: 16/9; background: #000;">
            <div class="km-media-status" style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; color: white; font-family: 'Prompt', sans-serif; font-size: 0.9rem; z-index: 2; pointer-events: none;">
              <span class="km-media-msg">กำลังโหลดสื่อ…</span>
            </div>
            <video src="${escapeHtml(item.videoUrl)}" controls style="width:100%; height:100%; aspect-ratio: 16/9; display: block; position: relative; z-index: 1;" loading="lazy"
              onloadstart="this.parentElement.querySelector('.km-media-msg').textContent = 'กำลังโหลดสื่อ...';"
              oncanplay="this.parentElement.querySelector('.km-media-status').style.display = 'none';"
              onwaiting="this.parentElement.querySelector('.km-media-status').style.display = 'flex'; this.parentElement.querySelector('.km-media-msg').textContent = 'กำลังโหลดสื่อ...';"
              onplaying="this.parentElement.querySelector('.km-media-status').style.display = 'none';"
              onerror="this.parentElement.querySelector('.km-media-status').style.display = 'flex'; this.parentElement.querySelector('.km-media-msg').textContent = '❌ ไม่สามารถโหลดสื่อได้';">
            </video>
          </div>`;
      } else {
        mediaHtml = `
          <div class="km-content-item-media" style="margin: -1.25rem -1.25rem 1.25rem -1.25rem; padding: 2rem 1rem; text-align: center; background: #f1f5f9;">
            <p style="margin: 0 0 1rem; color: #475569; font-family: 'Prompt', sans-serif; font-size: 0.9rem;">พบลิงก์วิดีโอภายนอก</p>
            <a href="${escapeHtml(item.videoUrl)}" target="_blank" rel="noopener noreferrer" class="primary-btn" style="display: inline-flex; align-items: center; gap: 0.5rem; text-decoration: none; padding: 0.5rem 1.2rem; border-radius: 999px;">
              ▶ เปิดดูวิดีโอภายนอก
            </a>
          </div>`;
      }
    }
  } else if (item.contentType === "video_file" && item.videoUrl) {
    mediaHtml = `
      <div class="km-content-item-media km-video-container" style="margin: -1.25rem -1.25rem 1.25rem -1.25rem; position: relative; aspect-ratio: 16/9; background: #000;">
        <div class="km-media-status" style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; color: white; font-family: 'Prompt', sans-serif; font-size: 0.9rem; z-index: 2; pointer-events: none;">
          <span class="km-media-msg">กำลังโหลดสื่อ…</span>
        </div>
        <video src="${escapeHtml(item.videoUrl)}" controls style="width:100%; height:100%; aspect-ratio: 16/9; display: block; position: relative; z-index: 1;" loading="lazy"
          onloadstart="this.parentElement.querySelector('.km-media-msg').textContent = 'กำลังโหลดสื่อ...';"
          oncanplay="this.parentElement.querySelector('.km-media-status').style.display = 'none';"
          onwaiting="this.parentElement.querySelector('.km-media-status').style.display = 'flex'; this.parentElement.querySelector('.km-media-msg').textContent = 'กำลังโหลดสื่อ...';"
          onplaying="this.parentElement.querySelector('.km-media-status').style.display = 'none';"
          onerror="this.parentElement.querySelector('.km-media-status').style.display = 'flex'; this.parentElement.querySelector('.km-media-msg').textContent = '❌ ไม่สามารถโหลดสื่อได้';">
        </video>
      </div>`;
  }

  const descHtml = item.description
    ? `<p class="km-content-item-desc" style="font-size: 0.9rem; color: #475569; line-height: 1.6; margin-bottom: 1rem; white-space: pre-line;">${escapeHtml(item.description)}</p>`
    : "";

  const richHtml = item.richTextContent
    ? `<div class="km-content-item-rich" style="font-size: 0.9rem; color: #1e293b; line-height: 1.7; border-top: 1px solid #e2e8f0; padding-top: 1rem; margin-top: 1rem;">${item.richTextContent}</div>`
    : "";

  detailContentEl.innerHTML = `
    ${mediaHtml}
    <div style="padding-top: 0.5rem;">
      <h3 style="font-size: 1.25rem; font-weight: 700; color: #0f766e; margin: 0 0 0.75rem; line-height: 1.4;">${escapeHtml(item.title || "-")}</h3>
      ${descHtml}
      ${richHtml}
    </div>
  `;

  // Bind close button handler
  const closeBtn = document.querySelector("#btnCloseKmDetail");
  if (closeBtn) {
    closeBtn.onclick = () => {
      detailContentEl.innerHTML = ""; // Stop audio/video playing on close
      dialog.close();
    };
  }

  dialog.showModal();
}

/** Dynamic platform detection for YouTube & Vimeo embed links */
function getKmEmbedUrl(url) {
  if (!url) return null;
  
  // YouTube detection
  const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (ytMatch) {
    return `https://www.youtube.com/embed/${ytMatch[1]}`;
  }
  
  // Vimeo detection
  const vimeoMatch = url.match(/(?:vimeo\.com\/|player\.vimeo\.com\/video\/)([0-9]+)/);
  if (vimeoMatch) {
    return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  }
  
  return null;
}

// Lightbox state variables
let lightboxZoom = 1;
let isDragging = false;
let startX = 0, startY = 0;
let translateX = 0, translateY = 0;
let lastTranslateX = 0, lastTranslateY = 0;

/** Show fullscreen image lightbox overlay */
function showFullscreenImage(src) {
  const lightbox = document.getElementById("kmImageLightbox");
  const img = document.getElementById("kmLightboxImage");
  if (!lightbox || !img) return;

  img.src = src;
  lightbox.classList.remove("hidden");
  // Force browser reflow to trigger CSS opacity transitions
  lightbox.offsetHeight;
  lightbox.classList.add("active");
  document.body.style.overflow = "hidden"; // lock page background scrolling
}

/** Initialize touch/drag and zoom action handlers for PWA fullscreen image viewer */
function initLightboxHandlers() {
  const lightbox = document.getElementById("kmImageLightbox");
  const img = document.getElementById("kmLightboxImage");
  const closeBtn = document.getElementById("btnLightboxClose");
  const zoomInBtn = document.getElementById("btnLightboxZoomIn");
  const zoomOutBtn = document.getElementById("btnLightboxZoomOut");
  const container = lightbox?.querySelector(".km-lightbox-content");

  if (!lightbox || !img || !closeBtn || !zoomInBtn || !zoomOutBtn || !container) return;

  const updateTransform = () => {
    img.style.transform = `translate(${translateX}px, ${translateY}px) scale(${lightboxZoom})`;
  };

  const resetPosition = () => {
    lightboxZoom = 1;
    translateX = 0;
    translateY = 0;
    lastTranslateX = 0;
    lastTranslateY = 0;
    updateTransform();
  };

  closeBtn.addEventListener("click", () => {
    lightbox.classList.remove("active");
    setTimeout(() => {
      lightbox.classList.add("hidden");
      document.body.style.overflow = ""; // restore page scrolling
      resetPosition();
    }, 200);
  });

  zoomInBtn.addEventListener("click", () => {
    if (lightboxZoom < 3) {
      lightboxZoom += 0.25;
      updateTransform();
    }
  });

  zoomOutBtn.addEventListener("click", () => {
    if (lightboxZoom > 0.5) {
      lightboxZoom -= 0.25;
      updateTransform();
    }
  });

  // Drag and swipe behaviors
  const dragStart = (e) => {
    isDragging = true;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    startX = clientX - lastTranslateX;
    startY = clientY - lastTranslateY;
  };

  const dragMove = (e) => {
    if (!isDragging) return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    translateX = clientX - startX;
    translateY = clientY - startY;
    updateTransform();
  };

  const dragEnd = (e) => {
    if (!isDragging) return;
    isDragging = false;
    
    // Swipe down to close gesture (only when at standard zoom scale)
    if (lightboxZoom === 1 && translateY > 100) {
      closeBtn.click();
      return;
    }

    lastTranslateX = translateX;
    lastTranslateY = translateY;
  };

  container.addEventListener("mousedown", dragStart);
  window.addEventListener("mousemove", dragMove);
  window.addEventListener("mouseup", dragEnd);

  container.addEventListener("touchstart", dragStart, { passive: true });
  container.addEventListener("touchmove", dragMove, { passive: true });
  container.addEventListener("touchend", dragEnd);
}

/** Called from assessment result modal: filters knowledge by zone and navigates there */
function filterKnowledgeByZone(zone) {
  // Set the zone filter for user view
  kmUserActiveZone = zone || null;
  kmUserActiveCat = "ALL";

  // Re-render category tabs and content
  buildKmUserTabs();
  renderKmUserContent();

  // Also highlight category tabs that match the zone for legacy compatibility
  const knowledgeGrids = document.querySelectorAll(".knowledge-grid");
  knowledgeGrids.forEach((grid) => {
    const items = grid.querySelectorAll(".knowledge-icon-btn");
    items.forEach((item) => {
      const text = item.querySelector("span")?.textContent?.trim() || "";
      let itemZone = "GREEN";
      if (["รู้โรค", "อารมณ์ดี", "คุยกัน"].includes(text)) itemZone = "GREEN";
      else if (["กิจวัตร", "ปลอดยา", "ใจสบาย"].includes(text)) itemZone = "YELLOW";
      else if (["ตกลงกัน", "ปลอดภัย", "อยู่ร่วมกัน"].includes(text)) itemZone = "RED";
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
    .sort((a, b) => timestampMs(b.createdAt) - timestampMs(a.createdAt));

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
  const assessments = getLinkedAssessments().sort((a, b) => timestampMs(b.createdAt) - timestampMs(a.createdAt));
  container.innerHTML = assessments.length
    ? assessments
        .map(
          (item) => `
            <button class="timeline-item ${zoneClass(item.zone)}" data-assessment-detail="${escapeHtml(item.id)}" type="button">
              <span class="timeline-icon"><svg><use href="#i-${item.zone === "GREEN" ? "shield" : item.zone === "YELLOW" ? "eye" : "phone"}"></use></svg></span>
              <strong>${zoneAdvice[item.zone].label} | ${item.score} คะแนน</strong>
              <p>รหัสผู้ป่วย: ${escapeHtml(item.patientCode)} | ${escapeHtml(item.dx)} | ${escapeHtml(item.district)}</p>
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
      <span>รหัสผู้ป่วย: ${escapeHtml(assessment.patientCode)} | Dx ${escapeHtml(assessment.dx)} | ${escapeHtml(assessment.district)}</span>
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
    const alertRecord = {
      alertId: `SOS-${Date.now()}`,
      patientCode: latestPatient?.patientCode || "",
      hn: latestPatient?.hn || "",
      dx: latestPatient?.dx || "",
      district: latestPatient?.district || "",
      score: getPatientRiskSummary(latestPatient).score,
      zone: "RED",
      status: "รอการช่วยเหลือ",
      createdAt: thaiTimestamp(),
      acknowledged: false
    };
    const saved = await saveToCloudOrAlert("saveAlert", alertRecord, "ไม่สามารถบันทึก SOS ได้");
    if (!saved) return;
    window.location.href = `tel:${cm?.phone || "1669"}`;
  });
}

function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./service-worker.js?v=21").catch(() => undefined);
  }
}

// ==========================================
// MAIN INITIALIZATION (Async/Await Cloud Sync)
// ==========================================
async function initUserApp() {
  // 1. ตรวจสอบก่อนว่าใช่หน้า User หรือไม่
  if (!document.body.classList.contains("user-app")) return;
  if (userAppInitialized) return;
  userAppInitialized = true;
  
  try {
    // 2. สั่งซิงค์ข้อมูลจาก Cloud ก่อนเสมอ (สำคัญมาก: ห้ามข้ามขั้นตอนนี้)
    const synced = await syncDataFromCloud();
    if (!synced) {
      console.warn("ไม่สามารถเชื่อมต่อฐานข้อมูลได้");
    }

    // 3. เริ่มต้นระบบ UI และ Navigation
    initNavigation();
    initAuthFlow();
    
    // 4. สั่งโหลดฟอร์มและข้อมูลที่อยู่จากฐานข้อมูลจริง
    // ต้องเรียก setupUserAddressSelects หลังจาก sync ข้อมูลสำเร็จแล้วเท่านั้น
    const regForm = document.querySelector("#registerAccountForm");
    if (regForm) setupUserAddressSelects(regForm);
    
    // 5. โหลดส่วนประกอบของหน้าจอ
    initRegisterForm();
    renderAssessmentItems();
    initAssessmentForm();
    renderKnowledge();
    initSosButtons();
    initLightboxHandlers(); // 6. เริ่มต้น Lightbox สำหรับดูรูปภาพแบบเต็มจอ
    
    // 6. แสดงผลหน้า Authenticated
    renderAuthenticatedApp();

  } catch (error) {
    console.error("เกิดข้อผิดพลาดในการเริ่มต้นแอป:", error);
  }
}

// ผูกฟังก์ชันเข้ากับหน้าเว็บ
document.addEventListener("DOMContentLoaded", registerServiceWorker);
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
// =========================================================
// เพิ่มเติม: ฟังก์ชันจัดการดรอปดาวน์ที่อยู่ (สำหรับหน้า Index / ผู้ใช้)
// =========================================================
function setupUserAddressSelects(formScope = document) {
  const provinceSelect = formScope.querySelector('select[name="province"]');
  const districtSelect = formScope.querySelector('select[name="district"]');
  const subdistrictSelect = formScope.querySelector('select[name="subdistrict"]');
  const zipcodeInput = formScope.querySelector('input[name="zipcode"]');

  if (!provinceSelect) return;
  
  // ดึงข้อมูลจาก storage ที่ซิงค์ไว้
  const addressList = storage.get("addressData", []);
  if (addressList.length === 0) {
    console.warn("ไม่พบข้อมูล AddressData ใน Storage");
    return;
  }

  // 1. โหลดจังหวัด
  const uniqueProvinces = [...new Set(addressList.map(item => item.province))].filter(Boolean).sort();
  provinceSelect.innerHTML = '<option value="">-- เลือกจังหวัด --</option>' + 
    uniqueProvinces.map(p => `<option value="${p}">${p}</option>`).join("");

  // 2. ฟังก์ชันอัปเดตอำเภอ
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
    
    if (subdistrictSelect) subdistrictSelect.innerHTML = '<option value="">-- เลือกตำบล --</option>';
    if (zipcodeInput) zipcodeInput.value = '';
  };

  // 3. ฟังก์ชันอัปเดตตำบล
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
  };

  provinceSelect.addEventListener("change", refreshDistricts);
  districtSelect?.addEventListener("change", () => {
    refreshSubdistricts();
    renderAuthCaseManagerPreview();
  });
  
  subdistrictSelect?.addEventListener("change", () => {
    const match = addressList.find(item => 
      item.province === provinceSelect.value && 
      item.amphoe === districtSelect.value && 
      item.tambon === subdistrictSelect.value
    );
    if (zipcodeInput && match) zipcodeInput.value = match.zipcode || "";
    renderAuthCaseManagerPreview();
  });
}

function setUserAddressValues(formScope = document, values = {}) {
  const provinceSelect = formScope.querySelector('select[name="province"]');
  const districtSelect = formScope.querySelector('select[name="district"]');
  const subdistrictSelect = formScope.querySelector('select[name="subdistrict"]');
  const zipcodeInput = formScope.querySelector('input[name="zipcode"]');
  const addressList = storage.get("addressData", []);
  if (!provinceSelect || !districtSelect || !subdistrictSelect || !addressList.length) return;

  const provinces = [...new Set(addressList.map(item => item.province))].filter(Boolean).sort();
  provinceSelect.innerHTML = '<option value="">-- เลือกจังหวัด --</option>' +
    provinces.map(p => `<option value="${escapeHtml(p)}">${escapeHtml(p)}</option>`).join("");
  provinceSelect.value = values.province || "";

  const districts = addressList
    .filter(item => item.province === provinceSelect.value)
    .map(item => item.amphoe);
  districtSelect.innerHTML = '<option value="">-- เลือกอำเภอ --</option>' +
    [...new Set(districts)].filter(Boolean).sort().map(d => `<option value="${escapeHtml(d)}">${escapeHtml(d)}</option>`).join("");
  districtSelect.value = values.district || "";

  const subdistricts = addressList
    .filter(item => item.province === provinceSelect.value && item.amphoe === districtSelect.value)
    .map(item => item.tambon);
  subdistrictSelect.innerHTML = '<option value="">-- เลือกตำบล --</option>' +
    [...new Set(subdistricts)].filter(Boolean).sort().map(s => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join("");
  subdistrictSelect.value = values.subdistrict || "";

  const match = addressList.find(item =>
    item.province === provinceSelect.value &&
    item.amphoe === districtSelect.value &&
    item.tambon === subdistrictSelect.value
  );
  if (zipcodeInput) zipcodeInput.value = values.zipcode || match?.zipcode || "";
}
