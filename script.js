const CONFIG = {
    TEACHER_PIN: "999999",
    SCHOOL_DOMAIN: "@blm.ac.th",
    GOOGLE_SCRIPT_URL: "https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec",
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
    loadExamsFromSheet();

    const form = document.getElementById("student-info-form");
    if (form) form.addEventListener("submit", startExam);
    document.addEventListener("visibilitychange", handleVisibilityChange);
});

// ฟังก์ชั่นดึงข้อมูลวิชาอัตโนมัติ
async function loadExamsFromSheet() {
    const examSelect = document.getElementById("exam-select");
    if (!examSelect) return;

    try {
        const cacheBuster = "&_t=" + new Date().getTime();
        const rawUrl = CONFIG.EXAM_SHEET_CSV_URL.trim() + cacheBuster;
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(rawUrl)}`;
        
        let response = await fetch(proxyUrl);
        if (!response.ok) throw new Error("Network response was not ok");

        const data = await response.text();
        const rows = data.split(/\r?\n/).map(row => row.trim()).filter(row => row.length > 0);
        
        examSelect.innerHTML = '<option value="" disabled selected>-- กรุณาเลือกรายวิชา --</option>';

        let loadedCount = 0;
        for (let i = 1; i < rows.length; i++) {
            const cols = parseCSVRow(rows[i]);
            if (cols.length >= 2) {
                const subject = cols[0].replace(/^"|"$/g, '').trim();
                const url = cols[1].replace(/^"|"$/g, '').trim();

                if (subject && url && (url.includes("docs.google.com") || url.startsWith("http"))) {
                    const option = document.createElement("option");
                    option.value = url;
                    option.textContent = subject;
                    examSelect.appendChild(option);
                    loadedCount++;
                }
            }
        }

        if (loadedCount === 0) {
            examSelect.innerHTML = '<option value="" disabled selected>❌ ไม่พบข้อมูลรายวิชา</option>';
        }

    } catch (error) {
        console.error("Error loading exam list:", error);
        examSelect.innerHTML = '<option value="" disabled selected>❌ ไม่สามารถโหลดรายวิชาได้</option>';
    }
}

function parseCSVRow(row) {
    const result = [];
    let insideQuote = false;
    let entry = '';
    
    for (let char of row) {
        if (char === '"') {
            insideQuote = !insideQuote;
        } else if (char === ',' && !insideQuote) {
            result.push(entry);
            entry = '';
        } else {
            entry += char;
        }
    }
    result.push(entry);
    return result;
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

// ฟังก์ชั่นส่งข้อสอบ (รองรับการสั่งส่งอัตโนมัติเมื่อละเมิดกฎ)
function finishExam(isAutoSubmit = false) {
    if (!isAutoSubmit && !confirm("ยืนยันที่จะส่งข้อสอบหรือไม่?")) return;

    state.examStarted = false;
    const finishTimestamp = new Date().toLocaleString("th-TH");

    // ซ่อน Lock Screen (ถ้าเปิดอยู่)
    document.getElementById("lock-screen").style.display = "none";

    showSection("exam-section");
    document.getElementById("finish-btn").style.display = "none";
    document.getElementById("loading-overlay").style.display = "block";

    setTimeout(() => {
        sendDataToGoogleSheet(state.currentEmail, state.currentSubject, finishTimestamp);
        
        document.getElementById("finish-btn").style.display = "block";
        document.getElementById("loading-overlay").style.display = "none";

        if (isAutoSubmit) {
            const submitTitle = document.querySelector("#submitted-section h2");
            const submitDesc = document.querySelector("#submitted-section p");
            if (submitTitle) submitTitle.innerText = "🚨 ระบบทำการส่งข้อสอบอัตโนมัติ!";
            if (submitDesc) submitDesc.innerHTML = "เนื่องจากคุณออกจากหน้าจอทำข้อสอบเกิน 3 ครั้ง <br>ระบบได้ทำการบันทึกและส่งข้อสอบของคุณเรียบร้อยแล้ว";
        }

        showSection("submitted-section");
    }, CONFIG.SUBMIT_DELAY_MS);
}

// ฟังก์ชั่นตรวจจับการสลับแท็บ/ออกจากหน้าจอ
function handleVisibilityChange() {
    if (document.hidden && state.examStarted) {
        state.warningCount++;

        if (state.warningCount >= CONFIG.MAX_WARNINGS) {
            // ละเมิดครบ 3 ครั้ง -> ส่งข้อสอบทันที
            alert("⚠️ คุณออกจากหน้าจอทำข้อสอบครบ 3 ครั้ง ระบบกำลังส่งข้อสอบของคุณอัตโนมัติ!");
            finishExam(true);
        } else {
            // เตือนครั้งที่ 1 หรือ 2
            const lockScreen = document.getElementById("lock-screen");
            const badgeText = document.getElementById("warning-badge-text");
            const titleText = document.getElementById("lock-title-text");
            const descText = document.getElementById("lock-desc-text");

            lockScreen.style.display = "block";
            badgeText.innerText = `เตือนครั้งที่ ${state.warningCount} / ${CONFIG.MAX_WARNINGS}`;
            titleText.innerText = "แจ้งเตือนการออกจากหน้าสอบ";
            descText.innerHTML = `คุณได้ทำการสลับแท็บหรือออกจากหน้าจอทำข้อสอบ<br>หากออกจากหน้าสอบครบ <b>${CONFIG.MAX_WARNINGS} ครั้ง</b> ระบบจะทำการส่งข้อสอบทันที!`;
        }
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
