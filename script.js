const CONFIG = {
    TEACHER_PIN: "999999",
    SCHOOL_DOMAIN: "@blm.ac.th",
    GOOGLE_SCRIPT_URL: "https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec",
    EXAM_SHEET_CSV_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQaqnLe2JB1y-s60lcBqjDNIMW2TKoiVS1PeyaOSA20ON4LW5-_o3_RPmfe9PKnfNmntrga0Xd1-Hgs/pub?output=csv", 
    EXAM_SHEET_CSV_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQaqnLe2JB1y-s60lcBqjDNIMW2TKoiVS1PeyaOSA20ON4LW5-_o3_RPmfe9PKnfNmntrga0Xd1-Hgs/pub?output=csv", 
    MAX_WARNINGS: 3,
    SUBMIT_DELAY_MS: 5000
};

let state = {
    warningCount: 0,
    examStarted: false,
    currentEmail: "",
    currentSubject: ""
};

document.addEventListener("DOMContentLoaded", () => {
    // โหลดรายชื่อวิชาจาก Google Sheet
    loadExamsFromSheet();

    const form = document.getElementById("student-info-form");
@@ -26,18 +25,27 @@
// ฟังก์ชั่นดึงข้อมูลวิชาอัตโนมัติจาก Google Sheet CSV
async function loadExamsFromSheet() {
    const examSelect = document.getElementById("exam-select");
    if (!examSelect) return;

    try {
        const response = await fetch(CONFIG.EXAM_SHEET_CSV_URL);
        const cleanUrl = CONFIG.EXAM_SHEET_CSV_URL.trim();
        const response = await fetch(cleanUrl);
        
        if (!response.ok) {
            throw new Error(`HTTP Error Status: ${response.status}`);
        }

        const data = await response.text();
        const rows = data.split(/\r?\n/).map(row => row.trim()).filter(row => row.length > 0);

        const rows = data.split("\n").map(row => row.trim()).filter(row => row.length > 0);
        examSelect.innerHTML = '<option value="" disabled selected>-- กรุณาเลือกรายวิชา --</option>';

        // วนลูปอ่านข้อมูลเริ่มจากแถวที่ 2 (เว้นแถวหัวข้อ A1, B1)
        for (let i = 1; i < rows.length; i++) {
            const cols = parseCSVRow(rows[i]);
            if (cols.length >= 2) {
                const subject = cols[0].replace(/^"|"$/g, '');
                const url = cols[1].replace(/^"|"$/g, '');
                const subject = cols[0].replace(/^"|"$/g, '').trim();
                const url = cols[1].replace(/^"|"$/g, '').trim();

                if (subject && url) {
                    const option = document.createElement("option");
@@ -49,7 +57,7 @@
        }
    } catch (error) {
        console.error("Error loading exam list:", error);
        examSelect.innerHTML = '<option value="" disabled selected>❌ ไม่สามารถโหลดรายวิชาได้</option>';
        examSelect.innerHTML = '<option value="" disabled selected>❌ ไม่สามารถโหลดรายวิชาได้ (เช็คสิทธิ์การแชร์ Sheet)</option>';
    }
}

@@ -76,9 +84,14 @@
    e.preventDefault();
    const email = document.getElementById("student-email").value.trim().toLowerCase();
    const examSelect = document.getElementById("exam-select");
    
    if (!examSelect.value) {
        alert("กรุณาเลือกรายวิชาสอบก่อนครับ");
        return;
    }

    const selectedSubject = examSelect.options[examSelect.selectedIndex].text;

    // ตรวจสอบอีเมลโรงเรียน @blm.ac.th
    if (!email.endsWith(CONFIG.SCHOOL_DOMAIN)) {
        alert(`กรุณาใช้อีเมลของโรงเรียนเท่านั้น (${CONFIG.SCHOOL_DOMAIN})`);
        return;
@@ -107,78 +120,76 @@
    setTimeout(() => {
        sendDataToGoogleSheet(state.currentEmail, state.currentSubject, finishTimestamp);

        // คืนค่าปุ่มยืนยันส่งข้อสอบและซ่อนสถานะกำลังโหลด
        document.getElementById("finish-btn").style.display = "block";
        document.getElementById("loading-overlay").style.display = "none";

        showSection("submitted-section");
    }, CONFIG.SUBMIT_DELAY_MS);
}

// ฟังก์ชั่นสำหรับกดกลับไปทำข้อสอบวิชาอื่นหรือส่วนอื่นต่อ
function resetToChooseExam() {
    state.examStarted = false;
    state.warningCount = 0;
    showSection("student-form-section");
}

function handleVisibilityChange() {
    if (document.hidden && state.examStarted) {
        state.warningCount++;
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
}

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

function sendDataToGoogleSheet(email, subject, timestamp) {
    if (CONFIG.GOOGLE_SCRIPT_URL.includes("YOUR_SCRIPT_ID")) return;
    fetch(CONFIG.GOOGLE_SCRIPT_URL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, subject, timestamp })
    }).catch(err => console.error("Error sending data:", err));
}

function showSection(sectionId) {
    ["student-form-section", "exam-section", "submitted-section"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = (id === sectionId) ? "block" : "none";
    });
}
