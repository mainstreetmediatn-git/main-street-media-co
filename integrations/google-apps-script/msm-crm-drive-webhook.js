const CRM_FOLDER_ID = PropertiesService.getScriptProperties().getProperty("CRM_GOOGLE_DRIVE_FOLDER_ID");
const SHARED_SECRET = PropertiesService.getScriptProperties().getProperty("LEAD_CRAWL_GOOGLE_DRIVE_WEBHOOK_SECRET");

const STANDARD_FOLDERS = [
  "01 Research",
  "02 Evidence",
  "03 Reveal Visibility Audit",
  "04 What-If Package",
  "05 Website Concepts",
  "06 Social Content",
  "07 Outreach",
  "08 Approved Deliverables"
];

function doGet() {
  return jsonResponse({
    ok: true,
    service: "msm-crm-drive-webhook",
    configured: Boolean(CRM_FOLDER_ID && SHARED_SECRET),
    timestamp: new Date().toISOString()
  });
}

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents || "{}");
    const dryRun = payload.dryRun === true || payload.mode === "dry_run";
    const secret = String(payload.secret || "");

    if (!CRM_FOLDER_ID || !SHARED_SECRET) {
      return jsonResponse({ ok: false, error: "not_configured" }, 500);
    }

    if (secret !== SHARED_SECRET) {
      return jsonResponse({ ok: false, error: "unauthorized" }, 401);
    }

    const root = DriveApp.getFolderById(CRM_FOLDER_ID);
    const rootName = root.getName();

    if (dryRun) {
      return jsonResponse({
        ok: true,
        dryRun: true,
        rootName: rootName,
        canCreateFolders: true,
        timestamp: new Date().toISOString()
      });
    }

    const bundle = requireObject(payload.auditBundle, "auditBundle");
    const source = requireObject(bundle.source, "auditBundle.source");
    const businessName = cleanName(source.businessName || source.inputUrl || "Unknown Business");
    const city = cleanName(payload.city || source.city || "Unknown City");
    const leadFolderName = businessName + " - " + city;
    const runId = cleanName(payload.runId || bundle.bundleId || new Date().toISOString());
    const idempotencyKey = cleanName(payload.idempotencyKey || "lead-crawl:" + runId);

    const leadFolder = findOrCreateFolder(root, leadFolderName);
    const folderMap = ensureStandardFolders(leadFolder);
    const existingRun = findFile(folderMap["01 Research"], "run-" + runId + ".json");

    if (!existingRun) {
      upsertTextFile(
        folderMap["01 Research"],
        "run-" + runId + ".json",
        JSON.stringify({
          runId: runId,
          idempotencyKey: idempotencyKey,
          sourceUrl: payload.sourceUrl || source.inputUrl || "unknown",
          generatedAt: payload.generatedAt || new Date().toISOString(),
          receivedAt: new Date().toISOString(),
          target: payload.target || "google_drive_crm"
        }, null, 2),
        MimeType.PLAIN_TEXT
      );
    }

    const savedFiles = [];
    const artifacts = Array.isArray(bundle.artifacts) ? bundle.artifacts : [];
    artifacts.forEach(function(artifact) {
      const folderName = artifact.kind === "what_if_package"
        ? "04 What-If Package"
        : artifact.kind === "reveal_visibility_audit"
          ? "03 Reveal Visibility Audit"
          : "02 Evidence";
      const file = upsertTextFile(
        folderMap[folderName],
        cleanName(artifact.fileName || artifact.kind + ".md"),
        String(artifact.content || ""),
        MimeType.PLAIN_TEXT
      );
      savedFiles.push({
        kind: artifact.kind || "unknown",
        name: file.getName(),
        url: file.getUrl(),
        folder: folderName
      });
    });

    const crmRecord = {
      leadId: idempotencyKey,
      businessName: businessName,
      city: city,
      sourceUrl: payload.sourceUrl || source.inputUrl || "unknown",
      opportunityScore: payload.score,
      confidenceScore: payload.confidenceScore || "unknown",
      priority: payload.leadPriority || source.leadPriority || "unknown",
      crawlStatus: "completed",
      researchStatus: "completed",
      auditStatus: savedFiles.some(function(file) { return file.kind === "reveal_visibility_audit"; }) ? "saved" : "not_found",
      whatIfPackageStatus: savedFiles.some(function(file) { return file.kind === "what_if_package"; }) ? "saved" : "not_found",
      approvalStatus: "pending",
      outreachStatus: "not_started",
      googleDriveFolderUrl: leadFolder.getUrl(),
      savedFiles: savedFiles,
      runId: runId,
      idempotencyKey: idempotencyKey,
      updatedAt: new Date().toISOString()
    };

    const crmRecordFile = upsertTextFile(
      leadFolder,
      "crm-record.json",
      JSON.stringify(crmRecord, null, 2),
      MimeType.PLAIN_TEXT
    );

    return jsonResponse({
      ok: true,
      duplicatePrevented: Boolean(existingRun),
      rootName: rootName,
      leadFolderUrl: leadFolder.getUrl(),
      crmRecordUrl: crmRecordFile.getUrl(),
      savedFiles: savedFiles,
      runId: runId
    });
  } catch (error) {
    return jsonResponse({
      ok: false,
      error: "request_failed",
      message: String(error && error.message ? error.message : error)
    }, 500);
  }
}

function ensureStandardFolders(leadFolder) {
  const folders = {};
  STANDARD_FOLDERS.forEach(function(name) {
    folders[name] = findOrCreateFolder(leadFolder, name);
  });
  return folders;
}

function findOrCreateFolder(parent, name) {
  const existing = parent.getFoldersByName(name);
  if (existing.hasNext()) return existing.next();
  return parent.createFolder(name);
}

function findFile(parent, name) {
  const existing = parent.getFilesByName(name);
  if (existing.hasNext()) return existing.next();
  return null;
}

function upsertTextFile(parent, name, content, mimeType) {
  const existing = findFile(parent, name);
  if (existing) {
    existing.setContent(content);
    return existing;
  }
  return parent.createFile(name, content, mimeType);
}

function requireObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(label + " is required");
  }
  return value;
}

function cleanName(value) {
  return String(value || "")
    .replace(/[\\/:*?"<>|#{}%~&]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120) || "Unknown";
}

function jsonResponse(body, statusCode) {
  const output = ContentService
    .createTextOutput(JSON.stringify(body))
    .setMimeType(ContentService.MimeType.JSON);
  if (typeof output.setResponseCode === "function" && statusCode) {
    output.setResponseCode(statusCode);
  }
  return output;
}
