/**
 * Tamil Sangam website backend — Google Apps Script Web App.
 *
 * Deploy as: Execute as "Me" (the admin account that owns this script),
 * Access: "Anyone". This script is intentionally READ-ONLY (doGet only) —
 * there is no doPost and no mutation endpoint. All real edits to content
 * happen directly in Google Drive / Sheets / Forms, never through this API.
 *
 * See SETUP.md at the repo root for full setup instructions.
 */

// ---- Configuration: fill these in with your own Drive/Sheet IDs ----
const CONFIG = {
  SPREADSHEET_ID: "REPLACE_WITH_SPREADSHEET_ID",
  HOME_SHEET_NAME: "Home",
  CONTACT_SHEET_NAME: "ContactUs",
  HOME_FOLDER_ID: "REPLACE_WITH_HOME_FOLDER_ID",
  GALLERY_ROOT_FOLDER_ID: "REPLACE_WITH_GALLERY_ROOT_FOLDER_ID",
  EVENTS_FOLDER_ID: "REPLACE_WITH_EVENTS_FOLDER_ID",
  CACHE_TTL_SECONDS: 21600, // 6 hours
};

function doGet(e) {
  try {
    const action = ((e.parameter && e.parameter.action) || "").toLowerCase();
    let data;
    switch (action) {
      case "home":
        data = getHomeData();
        break;
      case "gallery":
        data = getGalleryFolders();
        break;
      case "gallery-photos":
        data = getGalleryPhotos(requireParam(e, "id"));
        break;
      case "events":
        data = getEventForms();
        break;
      case "contact":
        data = getContactData();
        break;
      case "prefill-url":
        data = getPrefillUrl(
          requireParam(e, "formId"),
          e.parameter.name || "",
          e.parameter.email || "",
        );
        break;
      default:
        return jsonOutput({ ok: false, error: "Unknown action: " + action });
    }
    return jsonOutput({ ok: true, data: data });
  } catch (err) {
    return jsonOutput({
      ok: false,
      error: err && err.message ? err.message : String(err),
    });
  }
}

function requireParam(e, name) {
  const value = e.parameter[name];
  if (!value) throw new Error("Missing required parameter: " + name);
  return value;
}

function jsonOutput(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(
    ContentService.MimeType.JSON,
  );
}

function withCache(key, ttlSeconds, compute) {
  const cache = CacheService.getScriptCache();
  const cached = cache.get(key);
  if (cached) return JSON.parse(cached);
  const result = compute();
  try {
    cache.put(key, JSON.stringify(result), ttlSeconds);
  } catch (err) {
    // Cache put fails silently if the payload is too large (>100KB); serve uncached.
  }
  return result;
}

// ---- Home ----
function getHomeData() {
  return withCache("home", CONFIG.CACHE_TTL_SECONDS, function () {
    const sheet = getSheet(CONFIG.HOME_SHEET_NAME);
    const rows = sheet.getDataRange().getValues();
    const header = rows.shift().map(function (h) {
      return String(h).trim().toLowerCase();
    });
    const nameIdx = header.indexOf("name");
    const detailsIdx = header.indexOf("details");
    const imageIdx = header.indexOf("imagefilename");
    const folder = DriveApp.getFolderById(CONFIG.HOME_FOLDER_ID);

    return rows
      .filter(function (row) {
        return row[nameIdx];
      })
      .map(function (row) {
        const imageFileName =
          imageIdx >= 0 ? String(row[imageIdx] || "").trim() : "";
        return {
          name: String(row[nameIdx] || ""),
          details: detailsIdx >= 0 ? String(row[detailsIdx] || "") : "",
          imageUrl: imageFileName
            ? findImageUrlByName(folder, imageFileName)
            : "",
        };
      });
  });
}

function findImageUrlByName(folder, fileName) {
  const files = folder.getFilesByName(fileName);
  if (files.hasNext()) {
    const file = files.next();
    return (
      "https://drive.google.com/thumbnail?id=" + file.getId() + "&sz=w1000"
    );
  }
  return "";
}

// ---- Gallery ----
function getGalleryFolders() {
  return withCache("gallery-folders", CONFIG.CACHE_TTL_SECONDS, function () {
    const root = DriveApp.getFolderById(CONFIG.GALLERY_ROOT_FOLDER_ID);
    const folders = root.getFolders();
    const result = [];
    while (folders.hasNext()) {
      const folder = folders.next();
      result.push({ id: folder.getId(), name: folder.getName() });
    }
    return result;
  });
}

function getGalleryPhotos(folderId) {
  return withCache(
    "gallery-photos-" + folderId,
    CONFIG.CACHE_TTL_SECONDS,
    function () {
      const folder = DriveApp.getFolderById(folderId);
      return collectImageFiles(folder).map(function (file) {
        return {
          id: file.getId(),
          name: file.getName(),
          url:
            "https://drive.google.com/thumbnail?id=" +
            file.getId() +
            "&sz=w1600",
        };
      });
    },
  );
}

function collectImageFiles(folder) {
  const allowedMime = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  const files = folder.getFiles();
  const result = [];
  while (files.hasNext()) {
    const file = files.next();
    if (allowedMime.indexOf(file.getMimeType()) !== -1) {
      result.push(file);
    }
  }
  return result;
}

// ---- Events (Google Forms) ----
function getEventForms() {
  return withCache("events", CONFIG.CACHE_TTL_SECONDS, function () {
    const folder = DriveApp.getFolderById(CONFIG.EVENTS_FOLDER_ID);
    const files = folder.getFilesByType(MimeType.GOOGLE_FORMS);
    const result = [];
    while (files.hasNext()) {
      const file = files.next();
      const form = FormApp.openById(file.getId());
      result.push({
        id: file.getId(),
        title: form.getTitle(),
        formUrl: form.getPublishedUrl(),
      });
    }
    return result;
  });
}

// Builds a prefilled Google Form URL for the given visitor, matching form
// fields titled "Name" / "Email" (case-insensitive). Not cached — depends on
// the individual visitor's name/email, and forms are small/cheap to open.
function getPrefillUrl(formId, name, email) {
  const form = FormApp.openById(formId);
  const response = form.createResponse();
  form.getItems().forEach(function (item) {
    if (item.getType() !== FormApp.ItemType.TEXT) return;
    const title = item.getTitle().toLowerCase();
    const textItem = item.asTextItem();
    if (email && title.indexOf("email") !== -1) {
      response.withItemResponse(textItem.createResponse(email));
    } else if (name && title.indexOf("name") !== -1) {
      response.withItemResponse(textItem.createResponse(name));
    }
  });
  return { url: response.toPrefilledUrl() };
}

// ---- Contact Us ----
function getContactData() {
  return withCache("contact", CONFIG.CACHE_TTL_SECONDS, function () {
    const sheet = getSheet(CONFIG.CONTACT_SHEET_NAME);
    const rows = sheet.getDataRange().getValues();
    const header = rows.shift().map(function (h) {
      return String(h).trim().toLowerCase();
    });
    const nameIdx = header.indexOf("name");
    const phoneIdx = header.indexOf("phone");
    const emailIdx = header.indexOf("email");
    const roleIdx = header.indexOf("role");

    return rows
      .filter(function (row) {
        return row[nameIdx];
      })
      .map(function (row) {
        return {
          name: String(row[nameIdx] || ""),
          phone: phoneIdx >= 0 ? String(row[phoneIdx] || "") : "",
          email: emailIdx >= 0 ? String(row[emailIdx] || "") : "",
          role: roleIdx >= 0 ? String(row[roleIdx] || "") : "",
        };
      });
  });
}

// ---- Shared helpers ----
function getSheet(sheetName) {
  const spreadsheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) throw new Error("Sheet not found: " + sheetName);
  return sheet;
}
