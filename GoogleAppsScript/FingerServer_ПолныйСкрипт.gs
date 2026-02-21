/**
 * Google Apps Script для приёма данных от FingerServer.
 *
 * Листы: "Сотрудники", "Посещения", "Отпечатки"
 * Для платформы: GET .../exec?action=display
 *
 * Время: чтобы в журнале отображалось правильное местное время,
 * задайте часовой пояс проекта: Файл → Настройки проекта → Часовой пояс
 * (например Asia/Dushanbe или ваш город). Устройство должно передавать
 * eventTime в местном времени (строка "yyyy-MM-dd HH:mm:ss") или
 * timestamp в миллисекундах (UTC).
 */

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(15000);

  try {
    if (!e || !e.postData || !e.postData.contents) {
      return jsonResponse({ ok: false, error: "Empty body" });
    }

    var json = JSON.parse(e.postData.contents);
    var type = json.type;
    var data = json.data || {};

    switch (type) {
      case "employee":
        writeEmployee(data);
        break;
      case "event":
        writeEvent(data);
        break;
      case "enroll":
        writeEnroll(data);
        break;
      case "deleteEmployee":
        deleteEmployee(data);
        break;
      case "deleteEvent":
        deleteEvent(data);
        break;
      case "deleteEnroll":
        deleteEnroll(data);
        break;
      default:
        return jsonResponse({ ok: false, error: "Unknown type: " + type });
    }

    return jsonResponse({ ok: true });
  } catch (err) {
    return jsonResponse({ ok: false, error: String(err) });
  } finally {
    try { lock.releaseLock(); } catch (_) {}
  }
}

function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) ? String(e.parameter.action) : "";

  try {
    if (action === "display") {
      var result = getDataForDisplay();
      return jsonResponse(result);
    }

    if (action === "employees") {
      var ids = getEmployeeIdsFromSheet();
      return jsonResponse({ ok: true, employeeIds: ids });
    }

    return jsonResponse({ ok: true, message: "FingerServer Google Sheets sync is active." });
  } catch (err) {
    return jsonResponse({ ok: false, error: String(err) });
  }
}

// ---------- Helpers ----------

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function getOrCreateSheet(name, headers) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);

  // если лист пустой — создаём заголовки
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold");
  } else {
    // если заголовки короче нужного — дозапишем недостающие
    var lastCol = sheet.getLastColumn();
    if (lastCol < headers.length) {
      sheet.getRange(1, lastCol + 1, 1, headers.length - lastCol)
        .setValues([headers.slice(lastCol)])
        .setFontWeight("bold");
    }
  }
  return sheet;
}

function normalizeToIso(value) {
  // на входе может быть Date, число, строка, пусто
  if (!value) return "";
  if (Object.prototype.toString.call(value) === "[object Date]") return value.toISOString();

  // если число — считаем это timestamp ms
  if (typeof value === "number" && isFinite(value)) {
    return new Date(value).toISOString();
  }

  var s = String(value).trim();
  if (!s) return "";

  // пробуем распарсить
  var d = new Date(s);
  if (!isNaN(d.getTime())) return d.toISOString();

  return s; // как есть
}

function toTs(value) {
  if (!value) return 0;
  if (Object.prototype.toString.call(value) === "[object Date]") return value.getTime();
  if (typeof value === "number" && isFinite(value)) {
    // Unix timestamp в секундах (< 1e12) переводим в миллисекунды
    return value < 1e12 ? value * 1000 : value;
  }

  var s = String(value).trim();
  if (!s) return 0;
  var d = new Date(s);
  if (!isNaN(d.getTime())) return d.getTime();

  // если пришла строка формата "dd.MM.yyyy HH:mm" — вручную в локальной зоне скрипта
  var m = s.match(/^(\d{2})\.(\d{2})\.(\d{4})(?:\s+(\d{2}):(\d{2})(?::(\d{2}))?)?$/);
  if (m) {
    var dd = parseInt(m[1], 10);
    var mm = parseInt(m[2], 10) - 1;
    var yy = parseInt(m[3], 10);
    var hh = parseInt(m[4] || "0", 10);
    var mi = parseInt(m[5] || "0", 10);
    var ss = parseInt(m[6] || "0", 10);
    return new Date(yy, mm, dd, hh, mi, ss).getTime();
  }

  return 0;
}

// ---------- Endpoints helpers ----------

function getEmployeeIdsFromSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Сотрудники");
  if (!sheet || sheet.getLastRow() < 2) return [];

  var values = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues();
  var ids = [];

  for (var i = 0; i < values.length; i++) {
    var v = values[i][0];
    if (v === "" || v === null) continue;
    var id = parseInt(v, 10);
    if (!isNaN(id)) ids.push(id);
  }
  return ids;
}

// ---------- Write operations ----------

function writeEmployee(d) {
  var sheet = getOrCreateSheet("Сотрудники", [
    "ID", "ФИО", "Подразделение", "Должность", "Комментарий", "Дата создания", "ФотоURL"
  ]);

  var id = d.employeeId;
  if (id === undefined || id === null || String(id).trim() === "") {
    throw new Error("employeeId is required");
  }

  var rows = sheet.getDataRange().getValues();
  var rowIndex = -1;

  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][0]).trim() === String(id).trim()) {
      rowIndex = i + 1; // 1-based
      break;
    }
  }

  var photoUrl = d.photoUrl || d.PhotoUrl || "";
  photoUrl = photoUrl ? String(photoUrl).trim() : "";

  var rowData = [
    id,
    d.name || "",
    d.department || "",
    d.position || "",
    d.comment || "",
    normalizeToIso(d.createdAt || d.CreatedAt || new Date()),
    photoUrl
  ];

  if (rowIndex > 0) {
    sheet.getRange(rowIndex, 1, 1, rowData.length).setValues([rowData]);
  } else {
    sheet.appendRow(rowData);
  }
}

function writeEvent(d) {
  var sheet = getOrCreateSheet("Посещения", [
    "ID события", "ID сотрудника", "ФИО", "Действие", "Время", "Timestamp", "Устройство"
  ]);

  var actionRu = (d.action === "IN") ? "Приход"
              : (d.action === "OUT") ? "Уход"
              : (d.action ? String(d.action) : "Доп. отметка");

  // Время: лучше передавать с устройства ISO с Z (UTC) или timestamp в мс — тогда отображение будет верным в любом поясе
  var rawTime = d.eventTime || d.time || new Date();
  var iso = normalizeToIso(rawTime);
  var ts = toTs(rawTime);

  sheet.appendRow([
    d.eventId || "",
    d.employeeId || "",
    d.employeeName || d.name || "",
    actionRu,
    iso,
    ts,
    d.deviceId || d.device || ""
  ]);
}

function writeEnroll(d) {
  var sheet = getOrCreateSheet("Отпечатки", [
    "ID шаблона", "ID сотрудника", "ФИО", "Base64 шаблон", "Устройство", "Дата"
  ]);

  sheet.appendRow([
    d.templateId || "",
    d.employeeId || "",
    d.employeeName || d.name || "",
    d.templateBase64 || "",
    d.deviceId || d.device || "",
    normalizeToIso(d.createdAt || new Date())
  ]);
}

// ---------- Delete operations ----------

function deleteEmployee(d) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Сотрудники");
  if (!sheet || sheet.getLastRow() < 2) return;

  var id = String(d.employeeId || "").trim();
  if (!id) return;

  var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues();
  for (var i = 0; i < data.length; i++) {
    if (String(data[i][0]).trim() === id) {
      sheet.deleteRow(i + 2);
      return;
    }
  }
}

function deleteEvent(d) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Посещения");
  if (!sheet || sheet.getLastRow() < 2) return;

  var id = String(d.eventId || "").trim();
  if (!id) return;

  var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues();
  for (var i = 0; i < data.length; i++) {
    if (String(data[i][0]).trim() === id) {
      sheet.deleteRow(i + 2);
      return;
    }
  }
}

function deleteEnroll(d) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Отпечатки");
  if (!sheet || sheet.getLastRow() < 2) return;

  var id = String(d.templateId || "").trim();
  if (!id) return;

  var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues();
  for (var i = 0; i < data.length; i++) {
    if (String(data[i][0]).trim() === id) {
      sheet.deleteRow(i + 2);
      return;
    }
  }
}

// ---------- Display for frontend ----------

function getDataForDisplay() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var employeesSheet = ss.getSheetByName("Сотрудники");
  var visitsSheet = ss.getSheetByName("Посещения");

  if (!employeesSheet || !visitsSheet) {
    return {
      ok: false,
      error: "Не найдены листы 'Сотрудники' или 'Посещения'",
      employees: [],
      visits: [],
      updated: new Date().toISOString()
    };
  }

  var employees = readEmployeesForDisplay(employeesSheet);
  var visits = readVisitsForDisplay(visitsSheet);

  return {
    ok: true,
    updated: new Date().toISOString(),
    employees: employees,
    visits: visits
  };
}

function readEmployeesForDisplay(sheet) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  var lastCol = Math.max(sheet.getLastColumn(), 7);
  var data = sheet.getRange(1, 1, lastRow, lastCol).getValues();

  var list = [];
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (!row[0] && !row[1]) continue;

    list.push({
      id: row[0] != null ? String(row[0]).trim() : "",
      name: row[1] != null ? String(row[1]).trim() : "",
      department: row[2] != null ? String(row[2]).trim() : "",
      position: row[3] != null ? String(row[3]).trim() : "",
      comment: row[4] != null ? String(row[4]).trim() : "",
      createdAt: row[5] != null ? String(row[5]).trim() : "",
      // важно: здесь отдаём именно URL, не формулу IMAGE()
      photoUrl: row[6] != null ? String(row[6]).trim() : ""
    });
  }
  return list;
}

function formatTimeForDisplay(value) {
  if (value == null || value === "") return "";
  if (Object.prototype.toString.call(value) === "[object Date]") {
    var d = value;
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, "0");
    var day = String(d.getDate()).padStart(2, "0");
    var h = String(d.getHours()).padStart(2, "0");
    var min = String(d.getMinutes()).padStart(2, "0");
    var s = String(d.getSeconds()).padStart(2, "0");
    return y + "-" + m + "-" + day + " " + h + ":" + min + ":" + s;
  }
  return String(value).trim();
}

function readVisitsForDisplay(sheet) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  // A=ID события, B=ID сотрудника, C=ФИО, D=Действие, E=Время, F=Timestamp (или пусто), G=Устройство
  var lastCol = Math.max(sheet.getLastColumn(), 7);
  var data = sheet.getRange(1, 1, lastRow, lastCol).getValues();

  var list = [];
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (!row[1] && !row[2]) continue;

    var timeStr = formatTimeForDisplay(row[4]);
    var rawTs = row[5];
    var ts = 0;
    if (rawTs != null && typeof rawTs === "number" && isFinite(rawTs)) {
      if (rawTs > 0 && rawTs < 1e12) ts = rawTs * 1000;
      else if (rawTs >= 1e12) ts = rawTs;
    }
    if (ts === 0 && timeStr) ts = toTs(timeStr);

    list.push({
      eventId: row[0] != null ? String(row[0]).trim() : "",
      employeeId: row[1] != null ? String(row[1]).trim() : "",
      name: row[2] != null ? String(row[2]).trim() : "",
      action: row[3] != null ? String(row[3]).trim() : "",
      time: timeStr,
      ts: ts,
      device: row[6] != null ? String(row[6]).trim() : ""
    });
  }

  // сортировка по времени: новые сверху
  list.sort(function (a, b) { return (b.ts || 0) - (a.ts || 0); });

  // чтобы не тянуть гигантский лист — можно ограничить, например, последними 500
  // return list.slice(0, 500);
  return list;
}
