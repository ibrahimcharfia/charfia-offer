/**
 * CHARFIA Seller Funnel - lead receiver (Google Apps Script Web App)
 * - Writes every lead into the sheet "Leads"
 * - Emails the owner instantly (subject starts with "NEW SELLER LEAD")
 * - Sends the seller an instant confirmation email
 * - Step-3 survey answers update the same row (matched by lead_id)
 * - Optional: pushes the lead into Close.io when a CLOSE_API_KEY script property exists
 *
 * Deploy: Deploy > New deployment > Web app > Execute as: Me > Who has access: Anyone.
 */
var OWNER_EMAIL = "acquisitions@charfia.com";
var SHEET_ID = "1I94rjj9SvGpJ83sMLqx1uP2zTFbkrKsErrk9EzJ4nqM"; // "CHARFIA Seller Leads" Google Sheet
function ss_() { return SpreadsheetApp.openById(SHEET_ID); }
var SHEET_NAME = "Leads";
var COLS = ["received_at","lead_id","status","name","phone","email","address","condition","timeline","listed","notes",
            "city_page","form_position","utm_source","utm_medium","utm_campaign","utm_term","utm_content",
            "gclid","gbraid","wbraid","landing_url","referrer","consent","consent_text","user_agent","close_lead_id"];

function sheet_() {
  var ss = ss_();
  var sh = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
  if (sh.getLastRow() === 0) {
    sh.appendRow(COLS);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, COLS.length).setFontWeight("bold").setBackground("#000000").setFontColor("#ffffff");
  }
  return sh;
}

function clean_(v, max) { return String(v == null ? "" : v).replace(/[\r\n]+/g, " ").replace(/^[=+\-@]/, "'").slice(0, max || 300); }

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000);
  try {
    var p = (e && e.parameter) || {};
    if (p.website) return out_("ok"); // honeypot
    var sh = sheet_();
    if (p.type === "update") return update_(sh, p);

    var phone = String(p.phone || "").replace(/\D/g, "");
    if (!p.address || phone.length !== 10) return out_("invalid");

    var row = {};
    COLS.forEach(function (c) { row[c] = clean_(p[c], c === "consent_text" ? 600 : 300); });
    row.received_at = new Date();
    row.status = "New";
    row.phone = phone;
    sh.appendRow(COLS.map(function (c) { return row[c]; }));

    notifyOwner_(row);
    confirmSeller_(row);
    try { pushClose_(sh, row); } catch (err) { console.error(err); }
    return out_("ok");
  } finally {
    lock.releaseLock();
  }
}

function update_(sh, p) {
  var id = clean_(p.lead_id, 40);
  var data = sh.getDataRange().getValues();
  var idCol = COLS.indexOf("lead_id");
  for (var r = data.length - 1; r >= 1; r--) {
    if (data[r][idCol] === id) {
      ["condition", "timeline", "listed", "notes"].forEach(function (c) {
        if (p[c]) sh.getRange(r + 1, COLS.indexOf(c) + 1).setValue(clean_(p[c], 500));
      });
      MailApp.sendEmail(OWNER_EMAIL, "UPDATE seller lead " + id + " | " + data[r][COLS.indexOf("address")],
        "Survey answers for " + data[r][COLS.indexOf("name")] + " (" + fmtPhone_(data[r][COLS.indexOf("phone")]) + ")\n\n" +
        "Condition: " + (p.condition || "-") + "\nTimeline: " + (p.timeline || "-") + "\nListed with agent: " + (p.listed || "-") + "\nNotes: " + (p.notes || "-"));
      return out_("ok");
    }
  }
  return out_("not_found");
}

function fmtPhone_(d) { d = String(d); return d.length === 10 ? "(" + d.slice(0, 3) + ") " + d.slice(3, 6) + "-" + d.slice(6) : d; }

function notifyOwner_(row) {
  var body =
    "CALL NOW (goal: under 2 minutes)\n\n" +
    "Name: " + row.name + "\nPhone: " + fmtPhone_(row.phone) + "\nEmail: " + row.email + "\nAddress: " + row.address + "\n\n" +
    "Page: " + row.city_page + " (" + row.form_position + " form)\n" +
    "Source: " + (row.utm_source || "-") + " / " + (row.utm_medium || "-") + " / " + (row.utm_campaign || "-") + "\n" +
    "Keyword: " + (row.utm_term || "-") + "\nGCLID: " + (row.gclid ? "yes" : "no") + "\nLead ID: " + row.lead_id + "\n\n" +
    "Open sheet: " + ss_().getUrl();
  MailApp.sendEmail({ to: OWNER_EMAIL, subject: "NEW SELLER LEAD | " + row.address + " | " + fmtPhone_(row.phone), body: body });
}

function confirmSeller_(row) {
  if (!row.email || row.email.indexOf("@") < 1) return;
  var first = String(row.name).split(" ")[0];
  var body =
    "Hi " + first + ",\n\n" +
    "Thank you for requesting a cash offer for " + row.address + ".\n\n" +
    "We are reviewing the property now and will call you shortly from a Texas number. " +
    "If you prefer, you can call or text us any time at 713-588-5613.\n\n" +
    "What happens next:\n" +
    "1. A short call about the house and your timeline.\n" +
    "2. A written cash offer. No obligation.\n" +
    "3. If you accept, we close at a licensed Texas title company on your date. We pay all closing costs.\n\n" +
    "Ibrahim\nCHARFIA | Direct Cash Buyer, Texas\n713-588-5613 | acquisitions@charfia.com\n\n" +
    "S3 Group LLC d/b/a CHARFIA. Reply STOP to this email to stop further emails.";
  MailApp.sendEmail({ to: row.email, subject: "We received your request for " + row.address, body: body, name: "Ibrahim | CHARFIA", replyTo: OWNER_EMAIL });
}

/** Optional Close.io push. Add Script Property CLOSE_API_KEY (Project Settings > Script properties). */
function pushClose_(sh, row) {
  var key = PropertiesService.getScriptProperties().getProperty("CLOSE_API_KEY");
  if (!key) return;
  var payload = {
    name: row.address,
    description: "Google Ads seller lead (" + row.city_page + "). Keyword: " + (row.utm_term || "-") + ". Lead ID " + row.lead_id,
    contacts: [{ name: row.name, phones: [{ phone: "+1" + row.phone, type: "mobile" }], emails: row.email ? [{ email: row.email, type: "office" }] : [] }],
    addresses: [{ address_1: row.address, country: "US", label: "business" }]
  };
  var res = UrlFetchApp.fetch("https://api.close.com/api/v1/lead/", {
    method: "post", contentType: "application/json", payload: JSON.stringify(payload), muteHttpExceptions: true,
    headers: { Authorization: "Basic " + Utilities.base64Encode(key + ":") }
  });
  var j = JSON.parse(res.getContentText() || "{}");
  if (j.id) sh.getRange(sh.getLastRow(), COLS.indexOf("close_lead_id") + 1).setValue(j.id);
}

function doGet() { return out_("CHARFIA lead endpoint is running"); }
function out_(s) { return ContentService.createTextOutput(s).setMimeType(ContentService.MimeType.TEXT); }

/** Run once from the editor to grant permissions and send yourself a test email. */
function testSetup() {
  sheet_();
  MailApp.sendEmail(OWNER_EMAIL, "CHARFIA funnel: setup test", "The lead endpoint can send email. Sheet: " + ss_().getUrl());
}
