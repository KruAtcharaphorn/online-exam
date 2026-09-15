// ฟังก์ชั่นดึงข้อมูลวิชาแบบเรียลไทม์ (ป้องกันปัญหากระดาษว่าง/แคชไม่อัปเดต)
async function loadExamsFromSheet() {
    const examSelect = document.getElementById("exam-select");
    if (!examSelect) return;

    try {
        // เติม timestamp เพื่อบังคับให้ Google ส่งข้อมูลล่าสุดกลับมาเสมอ
        const cacheBuster = "&_t=" + new Date().getTime();
        const rawUrl = CONFIG.EXAM_SHEET_CSV_URL.trim() + cacheBuster;
        
        // ใช้ Proxy สำหรับดึงข้อมูลข้ามโดเมน
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(rawUrl)}`;
        
        const response = await fetch(proxyUrl);
        if (!response.ok) throw new Error("Network response was not ok");

        const data = await response.text();
        
        // แยกบรรทัดข้อมูล
        const rows = data.split(/\r?\n/).map(row => row.trim()).filter(row => row.length > 0);
        
        examSelect.innerHTML = '<option value="" disabled selected>-- กรุณาเลือกรายวิชา --</option>';

        let loadedCount = 0;

        // วนลูปอ่านข้อมูล (ข้ามแถวแรกที่เป็น subject, url)
        for (let i = 1; i < rows.length; i++) {
            const cols = parseCSVRow(rows[i]);
            if (cols.length >= 2) {
                const subject = cols[0].replace(/^"|"$/g, '').trim();
                const url = cols[1].replace(/^"|"$/g, '').trim();

                // ตรวจสอบว่ามีชื่อวิชาและลิงก์ Google Form หรือไม่
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
            examSelect.innerHTML = '<option value="" disabled selected>❌ ไม่พบข้อมูลรายวิชา (เช็คข้อมูลใน Sheet)</option>';
        }

    } catch (error) {
        console.error("Error loading exam list:", error);
        examSelect.innerHTML = '<option value="" disabled selected>❌ ไม่สามารถโหลดรายวิชาได้</option>';
    }
}
