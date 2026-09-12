const CONFIG = {
    TEACHER_PIN: "999999",
    SCHOOL_DOMAIN: "@blm.ac.th", // ตรวจสอบอีเมล @blm.ac.th เท่านั้น
    GOOGLE_SCRIPT_URL: "https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec", // วาง URL Google Apps Script ของคุณที่นี่
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
    if (localStorage.getItem("exam_submitted") === "true") {
        showSection("submitted-section");
    }
    const form = document.getElementById("student-info-form");
    if (form) form.addEventListener("submit", startExam);
    document.addEventListener("visibilitychange", handleVisibilityChange);
});

function startExam(e) {
    e.preventDefault();
    const email = document.getElementById("student-email").value.trim().toLowerCase();
    const examSelect = document.getElementById("exam-select");

    // ตรวจสอบอีเมลโรงเรียน @blm.ac.th
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

    // หน่วงเวลา 5 วินาทีก่อนส่งข้อมูลลง Google Sheet
    setTimeout(() => {
        sendDataToGoogleSheet(state.currentEmail, state.currentSubject, finishTimestamp);
        
        const submittedEmails = JSON.parse(localStorage.getItem("submitted_emails") || "[]");
        submittedEmails.push(state.currentEmail);
        localStorage.setItem("submitted_emails", JSON.stringify(submittedEmails));
        localStorage.setItem("exam_submitted", "true");

        showSection("submitted-section");
    }, CONFIG.SUBMIT_DELAY_MS);
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
