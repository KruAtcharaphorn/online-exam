const SHEET_ID = "1y-s60lcBqjDNIMW2TKoiVSlPeyaOSA20ON4LW5-_o3_RPmfe9PKnfNmntrga0Xd1-Hgs";

function doGet(e) {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sheet = ss.getSheets()[0];
    const data = sheet.getDataRange().getValues();
    
    const result = [];
    // เริ่มอ่านจากแถวที่ 2 (เว้น A1, B1)
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] && data[i][1]) {
        result.push({
          subject: String(data[i][0]).trim(),
          url: String(data[i][1]).trim()
        });
      }
    }
    
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify([]))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.openById(SHEET_ID);
    let logSheet = ss.getSheetByName("Log") || ss.insertSheet("Log");
    
    if (logSheet.getLastRow() === 0) {
      logSheet.appendRow(["Timestamp", "Email", "Subject"]);
    }
    
    logSheet.appendRow([data.timestamp, data.email, data.subject]);
    return ContentService.createTextOutput("Success");
  } catch (err) {
    return ContentService.createTextOutput("Error: " + err.toString());
  }
}
