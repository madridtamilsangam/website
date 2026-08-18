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
  COMMITTEE_SHEET_NAME: "Committee",
  FOOTER_SHEET_NAME: "Footer",
  HIGHLIGHTS_SHEET_NAME: "Highlights",
  YOUTUBE_SHEET_NAME: "YouTube",
  ABOUTUS_SHEET_NAME: "AboutUs",
  HOME_FOLDER_ID: "REPLACE_WITH_HOME_FOLDER_ID",
  GALLERY_ROOT_FOLDER_ID: "REPLACE_WITH_GALLERY_ROOT_FOLDER_ID",
  EVENTS_FOLDER_ID: "REPLACE_WITH_EVENTS_FOLDER_ID",
  COMMITTEE_FOLDER_ID: "REPLACE_WITH_COMMITTEE_FOLDER_ID",
  HIGHLIGHTS_FOLDER_ID: "REPLACE_WITH_HIGHLIGHTS_FOLDER_ID",
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
      case "committee":
        data = getCommitteeData();
        break;
      case "footer":
        data = withCache("footer", CONFIG.CACHE_TTL_SECONDS, function () {
          return getFooterData();
        });
        break;
      case "highlights":
        data = withCache("highlights", CONFIG.CACHE_TTL_SECONDS, function () {
          return getHighlightsData();
        });
        break;
      case "youtube":
        data = withCache("youtube", CONFIG.CACHE_TTL_SECONDS, function () {
          return getYouTubeData();
        });
        break;
      case "aboutus":
        data = withCache("aboutus", CONFIG.CACHE_TTL_SECONDS, function () {
          return getAboutUsData();
        });
        break;
      case "pdf-content":
        data = getPdfContent(requireParam(e, "id"));
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

// ---- Footer ----
function getFooterData() {
  return withCache("footer", CONFIG.CACHE_TTL_SECONDS, function () {
    // Return empty footer if sheet doesn't exist yet
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    const sheet = ss.getSheetByName(CONFIG.FOOTER_SHEET_NAME);
    if (!sheet) {
      return {
        about: "",
        contact: {},
        socials: {},
      };
    }

    const rows = sheet.getDataRange().getValues();

    const result = {
      about: "",
      contact: {},
      socials: {},
    };

    // Skip header row (row 1), process data rows (row 2+)
    for (let i = 1; i < rows.length; i++) {
      const section = String(rows[i][0] || "")
        .toLowerCase()
        .trim();
      const title = String(rows[i][1] || "").trim();
      const content = String(rows[i][2] || "").trim();

      if (!section) continue; // Skip empty rows

      if (section === "about") {
        result.about = content;
      } else if (section === "address") {
        result.contact.address = content;
      } else if (section === "phone") {
        result.contact.phone = content;
      } else if (section === "email") {
        result.contact.email = content;
      } else {
        // Treat as social media platform
        result.socials[section] = content;
      }
    }

    return result;
  });
}

// ---- Highlights ----
function getHighlightsData() {
  return withCache("highlights", CONFIG.CACHE_TTL_SECONDS, function () {
    // Return empty array if sheet doesn't exist yet
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    const sheet = ss.getSheetByName(CONFIG.HIGHLIGHTS_SHEET_NAME);
    if (!sheet) {
      return [];
    }

    const rows = sheet.getDataRange().getValues();
    const header = rows.shift().map(function (h) {
      return String(h).trim().toLowerCase();
    });

    const titleIdx = header.indexOf("title");
    const descriptionIdx = header.indexOf("description");
    const imageIdIdx = header.indexOf("image_id");
    const dateIdx = header.indexOf("date");
    const linkIdx = header.indexOf("link");

    return rows
      .filter(function (row) {
        return row[titleIdx];
      })
      .map(function (row) {
        const imageId =
          imageIdIdx >= 0 ? String(row[imageIdIdx] || "").trim() : "";
        const dateStr = dateIdx >= 0 ? String(row[dateIdx] || "").trim() : "";
        const linkStr = linkIdx >= 0 ? String(row[linkIdx] || "").trim() : "";
        return {
          title: String(row[titleIdx] || ""),
          description:
            descriptionIdx >= 0 ? String(row[descriptionIdx] || "") : "",
          imageUrl: imageId
            ? "https://drive.google.com/thumbnail?id=" + imageId + "&sz=w1000"
            : "",
          date: dateStr,
          link: linkStr || undefined,
        };
      });
  });
}

// ---- YouTube ----
function getYouTubeData() {
  return withCache("youtube", CONFIG.CACHE_TTL_SECONDS, function () {
    // Return empty array if sheet doesn't exist yet
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    const sheet = ss.getSheetByName(CONFIG.YOUTUBE_SHEET_NAME);
    if (!sheet) {
      return [];
    }

    const rows = sheet.getDataRange().getValues();
    const header = rows.shift().map(function (h) {
      return String(h).trim().toLowerCase();
    });

    const videoIdIdx = header.indexOf("videoid");
    const titleIdx = header.indexOf("title");

    return rows
      .filter(function (row) {
        return row[videoIdIdx];
      })
      .map(function (row) {
        return {
          videoId: String(row[videoIdIdx] || "").trim(),
          title: titleIdx >= 0 ? String(row[titleIdx] || "") : "",
        };
      });
  });
}

// ---- About Us ----
function getAboutUsData() {
  return withCache("aboutus", CONFIG.CACHE_TTL_SECONDS, function () {
    // Return empty structure if sheet doesn't exist yet
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    const sheet = ss.getSheetByName(CONFIG.ABOUTUS_SHEET_NAME);
    if (!sheet) {
      return {
        sections: [],
        pdfFileId: "",
      };
    }

    const rows = sheet.getDataRange().getValues();
    const header = rows.shift().map(function (h) {
      return String(h).trim().toLowerCase();
    });

    const typeIdx = header.indexOf("type");
    const orderIdx = header.indexOf("order");
    const enTitleIdx = header.indexOf("en_title");
    const taTitleIdx = header.indexOf("ta_title");
    const enContentIdx = header.indexOf("en_content");
    const taContentIdx = header.indexOf("ta_content");
    const imageIdIdx = header.indexOf("image_id");
    const valueIdx = header.indexOf("value");

    let pdfFileId = "";
    let pdfTitleEn = "";
    let pdfTitleTa = "";
    const sections = [];

    rows.forEach(function (row) {
      const type = String(row[typeIdx] || "")
        .trim()
        .toLowerCase();

      if (type === "section") {
        const order = orderIdx >= 0 ? Number(row[orderIdx] || 0) : 0;
        sections.push({
          order: order,
          en_title: enTitleIdx >= 0 ? String(row[enTitleIdx] || "") : "",
          ta_title: taTitleIdx >= 0 ? String(row[taTitleIdx] || "") : "",
          en_content: enContentIdx >= 0 ? String(row[enContentIdx] || "") : "",
          ta_content: taContentIdx >= 0 ? String(row[taContentIdx] || "") : "",
          image_id: imageIdIdx >= 0 ? String(row[imageIdIdx] || "").trim() : "",
        });
      } else if (type === "pdf") {
        const value = valueIdx >= 0 ? String(row[valueIdx] || "").trim() : "";
        // Extract file ID from full Google Drive URL or use as-is if it's just an ID
        pdfFileId = extractFileIdFromDriveUrl(value);
        pdfTitleEn = enTitleIdx >= 0 ? String(row[enTitleIdx] || "") : "";
        pdfTitleTa = taTitleIdx >= 0 ? String(row[taTitleIdx] || "") : "";
      }
    });

    // Sort sections by order
    sections.sort(function (a, b) {
      return a.order - b.order;
    });

    return {
      sections: sections,
      pdfFileId: pdfFileId,
      pdfTitle_en: pdfTitleEn,
      pdfTitle_ta: pdfTitleTa,
    };
  });
}

// ---- Committee ----
function getCommitteeData() {
  return withCache("committee", CONFIG.CACHE_TTL_SECONDS, function () {
    const sheet = getSheet(CONFIG.COMMITTEE_SHEET_NAME);
    const rows = sheet.getDataRange().getValues();
    const header = rows.shift().map(function (h) {
      return String(h).trim().toLowerCase();
    });

    // Standard columns
    const nameIdx = header.indexOf("name");
    const roleIdx = header.indexOf("role");
    const yearIdx = header.indexOf("year");
    const phoneIdx = header.indexOf("phone");
    const emailIdx = header.indexOf("email");
    const imageIdx = header.indexOf("imagefilename");

    // Identify social media columns (any column not in the standard set)
    const standardCols = [
      "name",
      "role",
      "year",
      "phone",
      "email",
      "imagefilename",
    ];
    const socialCols = header.filter(function (col) {
      return standardCols.indexOf(col) === -1 && col.trim();
    });

    const folder = DriveApp.getFolderById(CONFIG.COMMITTEE_FOLDER_ID);

    // Build members array with social links
    const members = rows
      .filter(function (row) {
        return row[nameIdx];
      })
      .map(function (row) {
        const imageFileName =
          imageIdx >= 0 ? String(row[imageIdx] || "").trim() : "";
        const socialLinks = {};
        socialCols.forEach(function (socialCol, idx) {
          const url = String(row[header.indexOf(socialCol)] || "").trim();
          if (url) {
            socialLinks[socialCol] = url;
          }
        });

        return {
          name: String(row[nameIdx] || ""),
          role: roleIdx >= 0 ? String(row[roleIdx] || "") : "",
          year: yearIdx >= 0 ? String(row[yearIdx] || "") : "",
          phone: phoneIdx >= 0 ? String(row[phoneIdx] || "") : "",
          email: emailIdx >= 0 ? String(row[emailIdx] || "") : "",
          imageUrl: imageFileName
            ? findImageUrlByName(folder, imageFileName)
            : "",
          socialLinks: socialLinks,
        };
      });

    // Group by year and sort
    const yearGroups = {};
    members.forEach(function (member) {
      const year = member.year || "Unknown";
      if (!yearGroups[year]) {
        yearGroups[year] = [];
      }
      yearGroups[year].push(member);
    });

    // Sort members within each year by role priority, then by name
    const rolePriority = {
      founder: 0,
      president: 1,
      secretary: 2,
      treasurer: 3,
    };
    Object.keys(yearGroups).forEach(function (year) {
      yearGroups[year].sort(function (a, b) {
        const aPriority =
          rolePriority[String(a.role || "").toLowerCase()] !== undefined
            ? rolePriority[String(a.role || "").toLowerCase()]
            : 999;
        const bPriority =
          rolePriority[String(b.role || "").toLowerCase()] !== undefined
            ? rolePriority[String(b.role || "").toLowerCase()]
            : 999;
        if (aPriority !== bPriority) return aPriority - bPriority;
        return String(a.name).localeCompare(String(b.name));
      });
    });

    // Sort years in descending order (newest first)
    const sortedYears = Object.keys(yearGroups).sort().reverse();
    const result = sortedYears.map(function (year) {
      return {
        year: year,
        members: yearGroups[year],
      };
    });

    return { years: result };
  });
}

// ---- PDF content proxy ----
// Google Drive's download URLs don't send CORS headers, so the browser can't
// fetch them directly. Instead we read the file server-side here and hand the
// browser base64 bytes over our own (CORS-friendly) JSON endpoint.
function getPdfContent(fileId) {
  const file = DriveApp.getFileById(fileId);
  const blob = file.getBlob();
  return {
    base64: Utilities.base64Encode(blob.getBytes()),
    mimeType: blob.getContentType(),
  };
}

// ---- Shared helpers ----
// Extract file ID from Google Drive URL or return as-is if already just an ID
function extractFileIdFromDriveUrl(input) {
  if (!input) return "";

  // Match pattern: /d/{fileId}/ in URLs like:
  // https://drive.google.com/file/d/FILE_ID/view?usp=drive_link
  // https://drive.google.com/open?id=FILE_ID
  const fileIdMatch = input.match(/\/d\/([a-zA-Z0-9_-]+)\//);
  if (fileIdMatch) {
    return fileIdMatch[1];
  }

  // If no URL pattern found, assume it's already just a file ID
  return input;
}

function getSheet(sheetName) {
  const spreadsheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) throw new Error("Sheet not found: " + sheetName);
  return sheet;
}
