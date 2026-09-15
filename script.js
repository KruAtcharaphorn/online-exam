const CONFIG = {
    TEACHER_PIN: "999999",
    SCHOOL_DOMAIN: "@blm.ac.th",
    // ⚠️ นำ URL เว็บแอปจาก Apps Script มาวางตรงนี้
    GOOGLE_SCRIPT_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQaqnLe2JB1y-s60lcBqjDNIMW2TKoiVSlPeyaOSA20ON4LW5-_o3_RPmfe9PKnfNmntrga0Xd1-Hgs/pub?output=csv", 
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
    loadExamsFromSheet();

    const form = document.getElementById("student-info-form");
    if (form) form.addEventListener("submit", startExam);
    document.addEventListener("visibilitychange", handleVisibilityChange);
});

// ฟังก์ชั่นดึงข้อมูลรายวิชาแบบ Direct API
async function loadExamsFromSheet() {
    const examSelect = document.getElementById("exam-select");
    if (!examSelect) return;

    try {
        if (CONFIG.GOOGLE_SCRIPT_URL.includes("ใส่_ID_ตรงนี้") || !CONFIG.GOOGLE_SCRIPT_URL) {
            examSelect.innerHTML = '<option value="" disabled selected>❌ ยังไม่ได้ใส่ GOOGLE_SCRIPT_URL ใน script.js</option>';
            return;
        }

        const response = await fetch(CONFIG.GOOGLE_SCRIPT_URL);
        
        if (!response.ok) {
            throw new Error(`HTTP Error Status: ${response.status}`);
        }

        const data = await response.json();
        
        examSelect.innerHTML = '<option value="" disabled selected>-- กรุณาเลือกรายวิชา --</option>';

        if (Array.isArray(data) && data.length > 0) {
            let loadedCount = 0;
            data.forEach(item => {
                if (item.subject && item.url) {
                    const option = document.createElement("option");
                    option.value = item.url;
                    option.textContent = item.subject;
                    examSelect.appendChild(option);
                    loadedCount++;
                }
            });

            if (loadedCount === 0) {
                examSelect.innerHTML = '<option value="" disabled selected>❌ ไม่พบข้อมูลรายวิชาใน Sheet</option>';
            }
        } else {
            examSelect.innerHTML = '<option value="" disabled selected>❌ ไม่พบข้อมูลรายวิชาใน Sheet</option>';
        }

    } catch (error) {
        console.error("Error loading exam list:", error);
        examSelect.innerHTML = '<option value="" disabled selected>❌ ไม่สามารถโหลดรายวิชาได้</option>';
    }
}

function startExam(e) {
    e.preventDefault();
    const email = document.getElementById("student-email").value.trim().toLowerCase();
    const examSelect = document.getElementById("exam-select");
    
    if (!examSelect.value) {
        alert("กรุณาเลือกรายวิชาสอบก่อนครับ");
        return;
    }

    const selectedSubject = examSelect.options[examSelect.selectedIndex].text;

    if (!email.endsWith(CONFIG.SCHOOL_DOMAIN)) {
        alert(`กรุณาใช้อีเมลของโรงเรียนเท่านั้น (${CONFIG.SCHOOL_DOMAIN})`);
        return;
    }

    state.currentEmail = email;
    state.currentSubject = selectedSubject;

    document.getElementById("display-email").innerText = state.currentEmail;
    document.getElementById("display-subject").innerText = state.currentSubject;
    document.getElementById("exam-iframe").src = examSelect.value;

    showSection("exam-section");
    state.examStarted = true;
}

function finishExam() {
    if (!confirm("ยืนยันที่จะส่งข้อสอบหรือไม่?")) return;

    state.examStarted = false;
    const finishTimestamp = new Date().toLocaleString("th-TH");

    document.getElementById("finish-btn").style.display = "none";
    document.getElementById("loading-overlay").style.display = "block";

    setTimeout(() => {
        sendDataToGoogleSheet(state.currentEmail, state.currentSubject, finishTimestamp);
        
        document.getElementById("finish-btn").style.display = "block";
        document.getElementById("loading-overlay").style.display = "none";

        showSection("submitted-section");
    }, CONFIG.SUBMIT_DELAY_MS);
}

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
    if (CONFIG.GOOGLE_SCRIPT_URL.includes("ใส่_ID_ตรงนี้")) return;
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
