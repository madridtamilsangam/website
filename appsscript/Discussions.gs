/**
 * Discussions / Queries backend (separate spreadsheet).
 *
 * Tabs in DISCUSSIONS_SPREADSHEET_ID (run setupDiscussionsSpreadsheet() once):
 *   Threads, Replies, Topics, Reports, Banned
 *
 * Reads are public (doGet). Every write goes through doPost, which verifies the
 * caller's Google ID token server-side first. Author emails are stored but are
 * never returned to the browser.
 */

const DISC = {
  THREADS: "Threads",
  REPLIES: "Replies",
  TOPICS: "Topics",
  REPORTS: "Reports",
  BANNED: "Banned",
  MAX_TITLE: 150,
  MAX_BODY: 5000,
  MAX_REASON: 300,
  EDIT_WINDOW_MS: 24 * 60 * 60 * 1000,
  RATE_LIMIT_MAX: 8, // writes per window per user
  RATE_LIMIT_WINDOW_S: 600,
  DEFAULT_SITE_URL: "https://madridtamilsangam.github.io/website/",
};

const THREAD_HEADERS = [
  "ThreadId",
  "CreatedAt",
  "LastActivityAt",
  "Topic",
  "Title",
  "Body",
  "AuthorName",
  "AuthorEmail",
  "AuthorPicture",
  "Status",
  "Visibility",
  "Pinned",
  "ReplyCount",
  "NotifyAuthor",
];
const REPLY_HEADERS = [
  "ReplyId",
  "ThreadId",
  "CreatedAt",
  "EditedAt",
  "Body",
  "AuthorName",
  "AuthorEmail",
  "AuthorPicture",
  "Visibility",
  "IsAccepted",
];
const REPORT_HEADERS = [
  "ReportId",
  "CreatedAt",
  "TargetType",
  "TargetId",
  "ReporterEmail",
  "Reason",
  "Resolved",
];
const TOPIC_HEADERS = ["Key", "Label_en", "Label_ta", "Order"];
const BANNED_HEADERS = ["Email", "Reason"];

const DEFAULT_TOPICS = [
  ["general", "General", "பொது", 1],
  ["events", "Events", "நிகழ்வுகள்", 2],
  ["membership", "Membership", "உறுப்பினர்", 3],
  ["living-in-spain", "Living in Spain", "ஸ்பெயினில் வாழ்க்கை", 4],
  ["tamil-learning", "Tamil Learning", "தமிழ் கற்றல்", 5],
  ["jobs", "Jobs & Business", "வேலை & வணிகம்", 6],
];

// ---------------------------------------------------------------------------
// Setup (run once from the Apps Script editor)
// ---------------------------------------------------------------------------
function setupDiscussionsSpreadsheet() {
  const ss = SpreadsheetApp.openById(CONFIG.DISCUSSIONS_SPREADSHEET_ID);
  const defs = [
    [DISC.THREADS, THREAD_HEADERS],
    [DISC.REPLIES, REPLY_HEADERS],
    [DISC.TOPICS, TOPIC_HEADERS],
    [DISC.REPORTS, REPORT_HEADERS],
    [DISC.BANNED, BANNED_HEADERS],
  ];
  defs.forEach(function (def) {
    let sheet = ss.getSheetByName(def[0]);
    if (!sheet) sheet = ss.insertSheet(def[0]);
    if (sheet.getLastRow() === 0) {
      sheet
        .getRange(1, 1, 1, def[1].length)
        .setValues([def[1]])
        .setFontWeight("bold");
      sheet.setFrozenRows(1);
    }
    // Plain-text columns: keeps ISO dates as text and stops "=..." being run as formulas.
    sheet.getRange(2, 1, Math.max(sheet.getMaxRows() - 1, 1), def[1].length).setNumberFormat("@");
  });
  const topics = ss.getSheetByName(DISC.TOPICS);
  if (topics.getLastRow() === 1) {
    topics.getRange(2, 1, DEFAULT_TOPICS.length, 4).setValues(DEFAULT_TOPICS);
  }
  const first = ss.getSheetByName("Sheet1");
  if (first && ss.getSheets().length > 1 && first.getLastRow() === 0) {
    ss.deleteSheet(first);
  }
}

// ---------------------------------------------------------------------------
// Sheet helpers
// ---------------------------------------------------------------------------
function discSheet(name) {
  const ss = SpreadsheetApp.openById(CONFIG.DISCUSSIONS_SPREADSHEET_ID);
  const sheet = ss.getSheetByName(name);
  if (!sheet) {
    throw new Error(
      'Discussions tab "' + name + '" not found. Run setupDiscussionsSpreadsheet().',
    );
  }
  return sheet;
}

// Reads a tab into objects keyed by lower-case header; `_row` is the 1-based sheet row.
function readTable(name) {
  const sheet = discSheet(name);
  const values = sheet.getDataRange().getValues();
  const header = values.shift().map(function (h) {
    return String(h).trim().toLowerCase();
  });
  const items = [];
  values.forEach(function (row, i) {
    if (!row[0]) return;
    const obj = { _row: i + 2 };
    header.forEach(function (h, idx) {
      obj[h] = row[idx];
    });
    items.push(obj);
  });
  return { sheet: sheet, header: header, items: items };
}

function appendObject(sheet, headers, obj) {
  const row = sheet.getLastRow() + 1;
  const range = sheet.getRange(row, 1, 1, headers.length);
  range.setNumberFormat("@"); // text only — never interpret user input as a formula/date
  range.setValues([
    headers.map(function (h) {
      const v = obj[h];
      return v === undefined || v === null ? "" : String(v);
    }),
  ]);
  return row;
}

function setCell(sheet, header, row, field, value) {
  const col = header.indexOf(field.toLowerCase()) + 1;
  if (col < 1) throw new Error("Unknown column: " + field);
  const range = sheet.getRange(row, col);
  range.setNumberFormat("@");
  range.setValue(value === undefined || value === null ? "" : String(value));
}

function asIso(v) {
  if (v instanceof Date) return v.toISOString();
  return String(v || "");
}

function asBool(v) {
  return String(v).trim().toLowerCase() === "true";
}

function nowIso() {
  return new Date().toISOString();
}

function newId() {
  return Utilities.getUuid().replace(/-/g, "").slice(0, 12);
}

// Trims, normalizes newlines and strips control characters (keeps \n and \t).
function cleanText(value, max, label) {
  const text = String(value === undefined || value === null ? "" : value)
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim();
  if (!text) throw new Error(label + " is required.");
  if (text.length > max) {
    throw new Error(label + " must be at most " + max + " characters.");
  }
  return text;
}

function discCacheKeys(threadId) {
  const keys = ["disc-all", "disc-topics"];
  if (threadId) keys.push("disc-thread-" + threadId);
  return keys;
}

function invalidateDiscussionCache(threadId) {
  CacheService.getScriptCache().removeAll(discCacheKeys(threadId));
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------
function scriptProp(name) {
  return PropertiesService.getScriptProperties().getProperty(name) || "";
}

function adminEmails() {
  return scriptProp("ADMIN_EMAILS")
    .split(",")
    .map(function (e) {
      return e.trim().toLowerCase();
    })
    .filter(Boolean);
}

// Verifies a Google ID token with Google and checks audience/issuer/expiry.
function verifyIdToken(idToken) {
  if (!idToken) throw new Error("Please sign in to continue.");
  const clientId = scriptProp("GOOGLE_CLIENT_ID");
  if (!clientId) throw new Error("Server is missing the GOOGLE_CLIENT_ID property.");

  const digest = Utilities.base64EncodeWebSafe(
    Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, idToken),
  );
  const cache = CacheService.getScriptCache();
  const cacheKey = "tok-" + digest;
  const cached = cache.get(cacheKey);
  if (cached) {
    const hit = JSON.parse(cached);
    if (hit.exp > Date.now() / 1000) return hit.user;
  }

  const res = UrlFetchApp.fetch(
    "https://oauth2.googleapis.com/tokeninfo?id_token=" + encodeURIComponent(idToken),
    { muteHttpExceptions: true },
  );
  if (res.getResponseCode() !== 200) {
    throw new Error("Your sign-in has expired. Please sign in again.");
  }
  const claims = JSON.parse(res.getContentText());
  const issuerOk =
    claims.iss === "accounts.google.com" || claims.iss === "https://accounts.google.com";
  const exp = Number(claims.exp || 0);
  if (claims.aud !== clientId || !issuerOk || exp <= Date.now() / 1000) {
    throw new Error("Your sign-in is not valid. Please sign in again.");
  }
  if (String(claims.email_verified) !== "true" || !claims.email) {
    throw new Error("Your Google email address is not verified.");
  }

  const email = String(claims.email).toLowerCase();
  const user = {
    email: email,
    name: String(claims.name || email.split("@")[0]).slice(0, 80),
    picture: claims.picture ? String(claims.picture) : "",
    isAdmin: adminEmails().indexOf(email) !== -1,
  };
  const ttl = Math.max(1, Math.min(300, Math.floor(exp - Date.now() / 1000)));
  cache.put(cacheKey, JSON.stringify({ exp: exp, user: user }), ttl);
  return user;
}

function assertNotBanned(user) {
  if (user.isAdmin) return;
  const banned = readTable(DISC.BANNED).items;
  for (let i = 0; i < banned.length; i++) {
    if (String(banned[i].email || "").trim().toLowerCase() === user.email) {
      throw new Error("Your account is not allowed to post.");
    }
  }
}

// Call inside the script lock.
function enforceRateLimit(user) {
  if (user.isAdmin) return;
  const cache = CacheService.getScriptCache();
  const key = "rl-" + user.email;
  const count = Number(cache.get(key) || 0);
  if (count >= DISC.RATE_LIMIT_MAX) {
    throw new Error("You are posting too quickly. Please wait a few minutes.");
  }
  cache.put(key, String(count + 1), DISC.RATE_LIMIT_WINDOW_S);
}

// ---------------------------------------------------------------------------
// Public (read) side
// ---------------------------------------------------------------------------
function getDiscussionTopics() {
  return withCache("disc-topics", CONFIG.DISCUSSIONS_CACHE_TTL_SECONDS, function () {
    let items;
    try {
      items = readTable(DISC.TOPICS).items;
    } catch (err) {
      items = [];
    }
    if (items.length === 0) {
      return DEFAULT_TOPICS.map(function (t) {
        return { key: t[0], label_en: t[1], label_ta: t[2] };
      });
    }
    return items
      .sort(function (a, b) {
        return Number(a.order || 999) - Number(b.order || 999);
      })
      .map(function (t) {
        return {
          key: String(t.key).trim(),
          label_en: String(t.label_en || t.key),
          label_ta: String(t.label_ta || t.label_en || t.key),
        };
      });
  });
}

function threadToPublic(t, viewer) {
  const email = String(t.authoremail || "").toLowerCase();
  const isOwner = !!viewer && viewer.email === email;
  const canManage = !!viewer && (viewer.isAdmin || isOwner);
  const visibility = String(t.visibility || "visible").toLowerCase();
  return {
    id: String(t.threadid),
    topic: String(t.topic || ""),
    title: String(t.title || ""),
    body: String(t.body || ""),
    authorName: String(t.authorname || ""),
    authorPicture: String(t.authorpicture || "") || undefined,
    createdAt: asIso(t.createdat),
    lastActivityAt: asIso(t.lastactivityat || t.createdat),
    status: String(t.status || "open").toLowerCase(),
    pinned: asBool(t.pinned),
    replyCount: Number(t.replycount || 0),
    hidden: visibility !== "visible" || undefined,
    canEdit: canManage || undefined,
    notifyAuthor: canManage ? asBool(t.notifyauthor) : undefined,
  };
}

function replyToPublic(r, viewer) {
  const email = String(r.authoremail || "").toLowerCase();
  const canManage = !!viewer && (viewer.isAdmin || viewer.email === email);
  const visibility = String(r.visibility || "visible").toLowerCase();
  return {
    id: String(r.replyid),
    threadId: String(r.threadid),
    body: String(r.body || ""),
    authorName: String(r.authorname || ""),
    authorPicture: String(r.authorpicture || "") || undefined,
    createdAt: asIso(r.createdat),
    editedAt: asIso(r.editedat) || undefined,
    isAccepted: asBool(r.isaccepted),
    hidden: visibility !== "visible" || undefined,
    canEdit: canManage || undefined,
  };
}

// All publicly visible threads (cached briefly, invalidated on every write).
function getAllVisibleThreads() {
  return withCache("disc-all", CONFIG.DISCUSSIONS_CACHE_TTL_SECONDS, function () {
    return readTable(DISC.THREADS)
      .items.filter(function (t) {
        return String(t.visibility || "visible").toLowerCase() === "visible";
      })
      .map(function (t) {
        const pub = threadToPublic(t, null);
        // Listings never need the full body
        pub.body = pub.body.length > 240 ? pub.body.slice(0, 240) + "…" : pub.body;
        return pub;
      });
  });
}

function listDiscussions(opts) {
  let threads = getAllVisibleThreads();
  const topic = String(opts.topic || "").trim();
  const q = String(opts.q || "").trim().toLowerCase();
  if (topic) threads = threads.filter(function (t) { return t.topic === topic; });
  if (q) {
    threads = threads.filter(function (t) {
      return (t.title + " " + t.body).toLowerCase().indexOf(q) !== -1;
    });
  }
  const sort = String(opts.sort || "activity");
  if (sort === "unanswered") {
    threads = threads.filter(function (t) {
      return t.replyCount === 0 && t.status === "open";
    });
  }
  const dateKey = sort === "newest" ? "createdAt" : "lastActivityAt";
  threads = threads.slice().sort(function (a, b) {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return a[dateKey] < b[dateKey] ? 1 : a[dateKey] > b[dateKey] ? -1 : 0;
  });

  const pageSize = Math.max(1, Math.min(Number(opts.pageSize) || 10, 50));
  const total = threads.length;
  const maxPage = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.max(1, Math.min(Number(opts.page) || 1, maxPage));
  return {
    threads: threads.slice((page - 1) * pageSize, page * pageSize),
    total: total,
    page: page,
    pageSize: pageSize,
  };
}

// viewer == null → public view (cached, visible items only).
function getDiscussionDetail(threadId, viewer) {
  if (!viewer) {
    return withCache("disc-thread-" + threadId, CONFIG.DISCUSSIONS_CACHE_TTL_SECONDS, function () {
      return buildDiscussionDetail(threadId, null);
    });
  }
  return buildDiscussionDetail(threadId, viewer);
}

function buildDiscussionDetail(threadId, viewer) {
  const thread = findThread(threadId);
  const isAdmin = !!viewer && viewer.isAdmin;
  const threadVisible = String(thread.visibility || "visible").toLowerCase() === "visible";
  if (!threadVisible && !isAdmin) throw new Error("Discussion not found.");

  const replies = readTable(DISC.REPLIES)
    .items.filter(function (r) {
      if (String(r.threadid) !== String(threadId)) return false;
      const visible = String(r.visibility || "visible").toLowerCase() === "visible";
      return visible || isAdmin;
    })
    .sort(function (a, b) {
      return asIso(a.createdat) < asIso(b.createdat) ? -1 : 1;
    })
    .map(function (r) {
      return replyToPublic(r, viewer);
    });

  return {
    thread: threadToPublic(thread, viewer),
    replies: replies,
    viewerIsAdmin: isAdmin || undefined,
  };
}

function findThread(threadId) {
  const items = readTable(DISC.THREADS).items;
  for (let i = 0; i < items.length; i++) {
    if (String(items[i].threadid) === String(threadId)) return items[i];
  }
  throw new Error("Discussion not found.");
}

// ---------------------------------------------------------------------------
// Write side (doPost)
// ---------------------------------------------------------------------------
const WRITE_ACTIONS = [
  "create-thread",
  "reply",
  "edit-thread",
  "edit-reply",
  "delete-thread",
  "delete-reply",
  "set-status",
  "accept-reply",
  "pin",
  "set-visibility",
  "report",
];

function handleDiscussionAction(action, body, user) {
  if (action === "get-thread") {
    return getDiscussionDetail(String(body.threadId || ""), user);
  }
  if (WRITE_ACTIONS.indexOf(action) === -1) {
    throw new Error("Unknown action: " + action);
  }

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) throw new Error("Server is busy. Please try again.");
  try {
    assertNotBanned(user);
    switch (action) {
      case "create-thread":
        enforceRateLimit(user);
        return createThread(body, user);
      case "reply":
        enforceRateLimit(user);
        return createReply(body, user);
      case "edit-thread":
        return editThread(body, user);
      case "edit-reply":
        return editReply(body, user);
      case "delete-thread":
        return setThreadVisibility(body.threadId, "deleted", user, true);
      case "delete-reply":
        return setReplyVisibility(body.replyId, "deleted", user, true);
      case "set-status":
        return setThreadStatus(body, user);
      case "accept-reply":
        return acceptReply(body, user);
      case "pin":
        requireAdmin(user);
        return updateThreadField(body.threadId, "Pinned", body.pinned ? "TRUE" : "FALSE");
      case "set-visibility":
        requireAdmin(user);
        return setVisibility(body, user);
      case "report":
        enforceRateLimit(user);
        return createReport(body, user);
    }
  } finally {
    lock.releaseLock();
  }
}

function requireAdmin(user) {
  if (!user.isAdmin) throw new Error("Only moderators can do this.");
}

function assertCanManage(authorEmail, user) {
  if (user.isAdmin) return;
  if (String(authorEmail || "").toLowerCase() !== user.email) {
    throw new Error("You can only change your own posts.");
  }
}

function assertWithinEditWindow(createdAt, user) {
  if (user.isAdmin) return;
  const created = new Date(asIso(createdAt)).getTime();
  if (isNaN(created) || Date.now() - created > DISC.EDIT_WINDOW_MS) {
    throw new Error("Posts can only be edited within 24 hours.");
  }
}

function validTopic(topic) {
  const key = String(topic || "").trim();
  const found = getDiscussionTopics().some(function (t) {
    return t.key === key;
  });
  if (!found) throw new Error("Please choose a valid topic.");
  return key;
}

function createThread(body, user) {
  const title = cleanText(body.title, DISC.MAX_TITLE, "Title").replace(/\s*\n\s*/g, " ");
  const text = cleanText(body.body, DISC.MAX_BODY, "Details");
  const topic = validTopic(body.topic);
  const id = newId();
  const now = nowIso();
  const sheet = discSheet(DISC.THREADS);
  appendObject(sheet, THREAD_HEADERS, {
    ThreadId: id,
    CreatedAt: now,
    LastActivityAt: now,
    Topic: topic,
    Title: title,
    Body: text,
    AuthorName: user.name,
    AuthorEmail: user.email,
    AuthorPicture: user.picture,
    Status: "open",
    Visibility: "visible",
    Pinned: "FALSE",
    ReplyCount: 0,
    NotifyAuthor: body.notifyAuthor === false ? "FALSE" : "TRUE",
  });
  invalidateDiscussionCache(id);
  return { id: id };
}

function recountReplies(threadId) {
  const count = readTable(DISC.REPLIES).items.filter(function (r) {
    return (
      String(r.threadid) === String(threadId) &&
      String(r.visibility || "visible").toLowerCase() === "visible"
    );
  }).length;
  updateThreadField(threadId, "ReplyCount", count);
}

function updateThreadField(threadId, field, value) {
  const t = readTable(DISC.THREADS);
  const thread = t.items.filter(function (x) {
    return String(x.threadid) === String(threadId);
  })[0];
  if (!thread) throw new Error("Discussion not found.");
  setCell(t.sheet, t.header, thread._row, field, value);
  invalidateDiscussionCache(threadId);
  return { ok: true };
}

function createReply(body, user) {
  const threadId = String(body.threadId || "");
  const thread = findThread(threadId);
  if (String(thread.visibility || "visible").toLowerCase() !== "visible") {
    throw new Error("Discussion not found.");
  }
  if (String(thread.status).toLowerCase() === "closed" && !user.isAdmin) {
    throw new Error("This discussion is closed.");
  }
  const text = cleanText(body.body, DISC.MAX_BODY, "Reply");
  const id = newId();
  const now = nowIso();
  const sheet = discSheet(DISC.REPLIES);
  appendObject(sheet, REPLY_HEADERS, {
    ReplyId: id,
    ThreadId: threadId,
    CreatedAt: now,
    EditedAt: "",
    Body: text,
    AuthorName: user.name,
    AuthorEmail: user.email,
    AuthorPicture: user.picture,
    Visibility: "visible",
    IsAccepted: "FALSE",
  });
  recountReplies(threadId);
  updateThreadField(threadId, "LastActivityAt", now);
  notifyThreadAuthor(thread, user, text);
  return { id: id };
}

function editThread(body, user) {
  const thread = findThread(body.threadId);
  assertCanManage(thread.authoremail, user);
  if (body.title !== undefined || body.body !== undefined || body.topic !== undefined) {
    assertWithinEditWindow(thread.createdat, user);
  }
  if (body.title !== undefined) {
    updateThreadField(
      thread.threadid,
      "Title",
      cleanText(body.title, DISC.MAX_TITLE, "Title").replace(/\s*\n\s*/g, " "),
    );
  }
  if (body.body !== undefined) {
    updateThreadField(thread.threadid, "Body", cleanText(body.body, DISC.MAX_BODY, "Details"));
  }
  if (body.topic !== undefined) {
    updateThreadField(thread.threadid, "Topic", validTopic(body.topic));
  }
  if (body.notifyAuthor !== undefined) {
    updateThreadField(thread.threadid, "NotifyAuthor", body.notifyAuthor ? "TRUE" : "FALSE");
  }
  return { ok: true };
}

function findReply(replyId) {
  const r = readTable(DISC.REPLIES);
  const reply = r.items.filter(function (x) {
    return String(x.replyid) === String(replyId);
  })[0];
  if (!reply) throw new Error("Reply not found.");
  return { table: r, reply: reply };
}

function editReply(body, user) {
  const found = findReply(body.replyId);
  assertCanManage(found.reply.authoremail, user);
  assertWithinEditWindow(found.reply.createdat, user);
  const text = cleanText(body.body, DISC.MAX_BODY, "Reply");
  setCell(found.table.sheet, found.table.header, found.reply._row, "Body", text);
  setCell(found.table.sheet, found.table.header, found.reply._row, "EditedAt", nowIso());
  invalidateDiscussionCache(found.reply.threadid);
  return { ok: true };
}

function setThreadVisibility(threadId, visibility, user, authorAllowed) {
  const thread = findThread(threadId);
  if (authorAllowed) assertCanManage(thread.authoremail, user);
  updateThreadField(threadId, "Visibility", visibility);
  return { ok: true };
}

function setReplyVisibility(replyId, visibility, user, authorAllowed) {
  const found = findReply(replyId);
  if (authorAllowed) assertCanManage(found.reply.authoremail, user);
  setCell(found.table.sheet, found.table.header, found.reply._row, "Visibility", visibility);
  if (visibility !== "visible") {
    setCell(found.table.sheet, found.table.header, found.reply._row, "IsAccepted", "FALSE");
  }
  recountReplies(found.reply.threadid);
  return { ok: true };
}

// Admin hide/unhide of a thread or reply.
function setVisibility(body, user) {
  const visibility = body.visible ? "visible" : "hidden";
  if (body.targetType === "thread") {
    return setThreadVisibility(body.targetId, visibility, user, false);
  }
  if (body.targetType === "reply") {
    return setReplyVisibility(body.targetId, visibility, user, false);
  }
  throw new Error("Invalid target.");
}

function setThreadStatus(body, user) {
  const status = String(body.status || "").toLowerCase();
  if (["open", "resolved", "closed"].indexOf(status) === -1) {
    throw new Error("Invalid status.");
  }
  const thread = findThread(body.threadId);
  assertCanManage(thread.authoremail, user);
  // Authors may open/resolve; only moderators may close or reopen a closed thread.
  if ((status === "closed" || String(thread.status).toLowerCase() === "closed") && !user.isAdmin) {
    throw new Error("Only moderators can close or reopen a closed discussion.");
  }
  return updateThreadField(thread.threadid, "Status", status);
}

function acceptReply(body, user) {
  const thread = findThread(body.threadId);
  assertCanManage(thread.authoremail, user);
  const r = readTable(DISC.REPLIES);
  const accept = body.accepted !== false;
  r.items.forEach(function (reply) {
    if (String(reply.threadid) !== String(thread.threadid)) return;
    const isTarget = String(reply.replyid) === String(body.replyId);
    const value = accept && isTarget ? "TRUE" : "FALSE";
    if (asBool(reply.isaccepted) !== (value === "TRUE")) {
      setCell(r.sheet, r.header, reply._row, "IsAccepted", value);
    }
  });
  if (accept) updateThreadField(thread.threadid, "Status", "resolved");
  invalidateDiscussionCache(thread.threadid);
  return { ok: true };
}

function createReport(body, user) {
  const type = String(body.targetType || "");
  if (type !== "thread" && type !== "reply") throw new Error("Invalid target.");
  const targetId = String(body.targetId || "");
  if (type === "thread") findThread(targetId);
  else findReply(targetId);
  const reason = cleanText(body.reason, DISC.MAX_REASON, "Reason");
  const sheet = discSheet(DISC.REPORTS);
  appendObject(sheet, REPORT_HEADERS, {
    ReportId: newId(),
    CreatedAt: nowIso(),
    TargetType: type,
    TargetId: targetId,
    ReporterEmail: user.email,
    Reason: reason,
    Resolved: "FALSE",
  });
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Email notification to the thread author (best effort — never blocks a reply)
// ---------------------------------------------------------------------------
function notifyThreadAuthor(thread, replier, replyText) {
  try {
    const to = String(thread.authoremail || "").toLowerCase();
    if (!to || to === replier.email || !asBool(thread.notifyauthor)) return;
    if (MailApp.getRemainingDailyQuota() < 5) return;
    const siteUrl = scriptProp("SITE_URL") || DISC.DEFAULT_SITE_URL;
    const link = siteUrl.replace(/\/?$/, "/") + "#/discussions/" + thread.threadid;
    const title = String(thread.title || "").replace(/[\r\n]+/g, " ").slice(0, 120);
    const excerpt = replyText.length > 300 ? replyText.slice(0, 300) + "…" : replyText;
    MailApp.sendEmail({
      to: to,
      name: "Madrid Tamil Sangam",
      subject: "New reply to your discussion: " + title,
      body:
        replier.name +
        " replied to your discussion \"" +
        title +
        "\":\n\n" +
        excerpt +
        "\n\nView the discussion: " +
        link +
        "\n\n— Madrid Tamil Sangam\n(You receive this because you started this discussion. " +
        "You can turn off notifications from the discussion page.)",
    });
  } catch (err) {
    // Notification failures (quota, invalid address) must not fail the reply.
  }
}
