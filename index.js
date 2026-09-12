// ==========================================
// 1. กำหนดค่าเริ่มต้นของระบบ (Configuration)
// ==========================================
const CONFIG = {
    TEACHER_PIN: "999999",
    SCHOOL_DOMAIN: "@school.ac.th",
    GOOGLE_SCRIPT_URL: "https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec",
    MAX_WARNINGS: 3,
    SUBMIT_DELAY_MS: 5000 // หน่วงเวลาส่งข้อมูล 5 วินาที
};

// ==========================================
// 2. ตัวแปรจัดการสถานะ (State Management)
// ==========================================
let state = {
    warningCount: 0,
    examStarted: false,
    currentEmail: "",
    currentSubject: ""
};

// ==========================================
// 3. เริ่มทำงานเมื่อโหลดหน้าเว็บ
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    checkPreviousSubmission();
    setupEventListeners();
});

function checkPreviousSubmission() {
    if (localStorage.getItem("exam_submitted") === "true") {
        showSection("submitted-section");
    }
}

function setupEventListeners() {
    // การส่งฟอร์มเข้าสอบ
    const form = document.getElementById("student-info-form");
    if (form) form.addEventListener("submit", startExam);

    // ตรวจจับการสลับแท็บ/ย่อหน้าจอ
    document.addEventListener("visibilitychange", handleVisibilityChange);
}

// ==========================================
// 4. ฟังก์ชันหลักในการทำงาน (Core Functions)
// ==========================================

// เริ่มทำข้อสอบ
function startExam(e) {
    e.preventDefault();

    const emailInput = document.getElementById("student-email");
    const examSelect = document.getElementById("exam-select");
    const email = emailInput.value.trim().toLowerCase();

    // ตรวจสอบโดเมนอีเมลโรงเรียน
    if (!email.endsWith(CONFIG.SCHOOL_DOMAIN)) {
        alert(`กรุณาใช้อีเมลของโรงเรียนเท่านั้น (${CONFIG.SCHOOL_DOMAIN})`);
        return;
    }

    // ตรวจสอบการสอบซ้ำ (1 คนสอบได้ 1 ครั้ง)
    const submittedEmails = JSON.parse(localStorage.getItem("submitted_emails") || "[]");
    if (submittedEmails.includes(email)) {
        alert("อีเมลนี้ได้ทำการเข้าสอบไปแล้ว ไม่สามารถสอบซ้ำได้");
        return;
    }

    state.currentEmail = email;
    state.currentSubject = examSelect.options[examSelect.selectedIndex].text;

    // อัปเดต UI หน้าข้อสอบ
    document.getElementById("display-email").innerText = state.currentEmail;
    document.getElementById("display-subject").innerText = state.currentSubject;
    document.getElementById("exam-iframe").src = examSelect.value;

    showSection("exam-section");
    state.examStarted = true;
}

// ยืนยันการส่งข้อสอบ (พร้อมหน่วงเวลา 5 วินาที)
function finishExam() {
    if (!confirm("ยืนยันที่จะส่งข้อสอบหรือไม่?")) return;

    state.examStarted = false;
    const finishTimestamp = new Date().toLocaleString("th-TH");

    // ซ่อนปุ่มส่งและแสดงข้อความกำลังโหลด
    const finishBtn = document.getElementById("finish-btn");
    const loadingOverlay = document.getElementById("loading-overlay");
    if (finishBtn) finishBtn.style.display = "none";
    if (loadingOverlay) loadingOverlay.style.display = "block";

    // หน่วงเวลา 5 วินาทีก่อนส่งลง Google Sheet
    setTimeout(() => {
        sendDataToGoogleSheet(state.currentEmail, state.currentSubject, finishTimestamp);
        saveSubmissionState(state.currentEmail);
        showSection("submitted-section");
    }, CONFIG.SUBMIT_DELAY_MS);
}

// ==========================================
// 5. ระบบตรวจจับและล็อคหน้าจอ (Anti-Cheating)
// ==========================================

function handleVisibilityChange() {
    if (document.hidden && state.examStarted) {
        state.warningCount++;
        updateLockScreenUI();
    }
}

function updateLockScreenUI() {
    const lockScreen = document.getElementById("lock-screen");
    const badgeText = document.getElementById("warning-badge-text");
    const titleText = document.getElementById("lock-title-text");
    const descText = document.getElementById("lock-desc-text");
    const pinSection = document.getElementById("pin-section");
    const ackSection = document.getElementById("acknowledge-section");

    lockScreen.style.display = "block";

    if (state.warningCount < CONFIG.MAX_WARNINGS) {
        badgeText.innerText = `เตือนครั้งที่ ${state.warningCount} / ${CONFIG.MAX_WARNINGS}`;
        titleText.innerText = "แจ้งเตือนการออกจากหน้าสอบ";
        descText.innerHTML = `คุณได้ทำการสลับแท็บหรือออกจากหน้าจอทำข้อสอบ<br>หากออกจากหน้าสอบครบ <b>${CONFIG.MAX_WARNINGS} ครั้ง</b> ระบบจะทำการล็อคหน้าจอทันที`;
        
        pinSection.style.display = "none";
        ackSection.style.display = "block";
    } else {
        badgeText.innerText = "🔒 ระบบถูกล็อคแล้ว";
        titleText.innerText = "หน้าจอถูกล็อคสมบูรณ์!";
        descText.innerHTML = "คุณออกจากหน้าสอบเกิน 3 ครั้ง <br><span style='color: #fca5a5;'>กรุณาแจ้งครูผู้สอนเพื่อใส่รหัสปลดล็อค</span>";
        
        pinSection.style.display = "block";
        ackSection.style.display = "none";
    }
}

// ปลดล็อคโดยครูผู้สอน
function unlockExam() {
    const pinInput = document.getElementById("teacher-pin");
    if (pinInput.value === CONFIG.TEACHER_PIN) {
        state.warningCount = 0;
        document.getElementById("lock-screen").style.display = "none";
        pinInput.value = "";
        alert("ปลดล็อคเรียบร้อยแล้ว นักเรียนสามารถทำข้อสอบต่อได้");
    } else {
        alert("รหัสผ่านไม่ถูกต้อง");
    }
}

function dismissWarning() {
    document.getElementById("lock-screen").style.display = "none";
}

// ==========================================
// 6. การส่งข้อมูล และการบันทึกข้อมูล (API & Storage)
// ==========================================

function sendDataToGoogleSheet(email, subject, timestamp) {
    if (CONFIG.GOOGLE_SCRIPT_URL.includes("YOUR_SCRIPT_ID")) return;

    fetch(CONFIG.GOOGLE_SCRIPT_URL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, subject, timestamp })
    }).catch(err => console.error("Error sending data:", err));
}

function saveSubmissionState(email) {
    const submittedEmails = JSON.parse(localStorage.getItem("submitted_emails") || "[]");
    submittedEmails.push(email);
    localStorage.setItem("submitted_emails", JSON.stringify(submittedEmails));
    localStorage.setItem("exam_submitted", "true");
}

function showSection(sectionId) {
    ["student-form-section", "exam-section", "submitted-section"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = (id === sectionId) ? "block" : "none";
    });
}
