import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const PROJECT_ID = 'sheet-generator-69633';
const DATABASE_ID = '(default)';
const TIME_ZONE = 'Atlantic/Madeira';
const FIREBASE_TOOLS_CONFIG_PATH = path.join(os.homedir(), '.config', 'configstore', 'firebase-tools.json');
const FIRESTORE_BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${DATABASE_ID}`;
const TARGET_USERS = [
  {
    uid: 'qEwToJ86AJOYWV6nDOd2j3MxTTh2',
    label: 'Luis Gonçalves',
  },
  {
    uid: 'oejZUqu5gmW3hiqc0CAXOVqKaj13',
    label: 'Sandra Silva',
  },
];
const QUERY_TARGETS = [
  {
    collectionId: 'service_status',
    timestampField: 'updatedAt',
    uidField: 'updatedByUid',
  },
  {
    collectionId: 'service_time_overrides',
    timestampField: 'updatedAt',
    uidField: 'updatedByUid',
  },
  {
    collectionId: 'service_ready',
    timestampField: 'updatedAt',
    uidField: 'updatedByUid',
  },
  {
    collectionId: 'entries',
    timestampField: 'createdAt',
    uidField: 'updatedByUid',
    allDescendants: true,
    collectionLabel: 'service_activity_entries',
  },
];

function getDateFormatter(timeZone) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

function formatTimestampToServiceDate(timestampValue, timeZone = TIME_ZONE) {
  if (!timestampValue) {
    return '';
  }

  const date = new Date(timestampValue);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const parts = getDateFormatter(timeZone).formatToParts(date);
  const year = parts.find((part) => part.type === 'year')?.value ?? '0000';
  const month = parts.find((part) => part.type === 'month')?.value ?? '00';
  const day = parts.find((part) => part.type === 'day')?.value ?? '00';
  return `${year}-${month}-${day}`;
}

function readFirebaseToolsConfig() {
  if (!fs.existsSync(FIREBASE_TOOLS_CONFIG_PATH)) {
    throw new Error(`Firebase CLI config not found at ${FIREBASE_TOOLS_CONFIG_PATH}. Run "firebase login" first.`);
  }

  return JSON.parse(fs.readFileSync(FIREBASE_TOOLS_CONFIG_PATH, 'utf8'));
}

function ensureFreshFirebaseCliToken() {
  const config = readFirebaseToolsConfig();
  const expiresAt = Number(config?.tokens?.expires_at ?? 0);
  if (expiresAt > Date.now() + 60_000) {
    return config;
  }

  execFileSync('firebase', ['projects:list', '--json'], {
    stdio: 'ignore',
  });

  const refreshedConfig = readFirebaseToolsConfig();
  const refreshedExpiresAt = Number(refreshedConfig?.tokens?.expires_at ?? 0);
  if (refreshedExpiresAt <= Date.now() + 60_000 || !refreshedConfig?.tokens?.access_token) {
    throw new Error('Firebase CLI access token is unavailable or expired. Run "firebase login" again and retry.');
  }

  return refreshedConfig;
}

function getAccessToken() {
  const config = ensureFreshFirebaseCliToken();
  const accessToken = String(config?.tokens?.access_token ?? '').trim();
  if (!accessToken) {
    throw new Error('Firebase CLI access token is missing. Run "firebase login" and retry.');
  }

  return accessToken;
}

async function firestoreRequest(accessToken, endpoint, options = {}) {
  const response = await fetch(`${FIRESTORE_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
      ...(options.headers ?? {}),
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Firestore request failed (${response.status}) for ${endpoint}: ${errorText}`);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

function getStringField(fields, key) {
  return String(fields?.[key]?.stringValue ?? '').trim();
}

function getTimestampField(fields, key) {
  return String(fields?.[key]?.timestampValue ?? '').trim();
}

async function runStructuredQuery(accessToken, queryTarget, uid) {
  const response = await firestoreRequest(accessToken, '/documents:runQuery', {
    method: 'POST',
    body: JSON.stringify({
      structuredQuery: {
        from: [
          {
            collectionId: queryTarget.collectionId,
            ...(queryTarget.allDescendants ? { allDescendants: true } : {}),
          },
        ],
        where: {
          fieldFilter: {
            field: {
              fieldPath: queryTarget.uidField,
            },
            op: 'EQUAL',
            value: {
              stringValue: uid,
            },
          },
        },
      },
    }),
  });

  return Array.isArray(response) ? response.map((entry) => entry.document).filter(Boolean) : [];
}

async function listDocuments(accessToken, collectionPath) {
  const documents = [];
  let pageToken = '';

  do {
    const query = new URLSearchParams({
      pageSize: '500',
    });
    if (pageToken) {
      query.set('pageToken', pageToken);
    }

    const response = await firestoreRequest(accessToken, `/documents/${collectionPath}?${query.toString()}`, {
      method: 'GET',
      headers: {
        'content-type': 'application/json',
      },
    });

    documents.push(...(response?.documents ?? []));
    pageToken = String(response?.nextPageToken ?? '').trim();
  } while (pageToken);

  return documents;
}

function buildFlaggedEntry(document, queryTarget, user) {
  const fields = document?.fields ?? {};
  const serviceDate = getStringField(fields, 'date');
  const writeTimestamp = getTimestampField(fields, queryTarget.timestampField);
  const localWriteDate = formatTimestampToServiceDate(writeTimestamp);

  if (!serviceDate || !writeTimestamp || !localWriteDate) {
    return null;
  }

  if (serviceDate === localWriteDate) {
    return null;
  }

  return {
    uid: user.uid,
    userLabel: user.label,
    collection: queryTarget.collectionLabel ?? queryTarget.collectionId,
    documentName: document.name,
    documentPath: document.name.replace(`projects/${PROJECT_ID}/databases/${DATABASE_ID}/documents/`, ''),
    serviceDate,
    localWriteDate,
    writeTimestamp,
  };
}

async function collectFlaggedEntries(accessToken) {
  const flaggedEntries = [];
  const candidateActivityDates = new Set();

  for (const user of TARGET_USERS) {
    for (const queryTarget of QUERY_TARGETS) {
      if (queryTarget.allDescendants) {
        continue;
      }

      const documents = await runStructuredQuery(accessToken, queryTarget, user.uid);
      for (const document of documents) {
        const documentDate = getStringField(document?.fields ?? {}, 'date');
        if (documentDate) {
          candidateActivityDates.add(documentDate);
        }

        const flaggedEntry = buildFlaggedEntry(document, queryTarget, user);
        if (flaggedEntry) {
          flaggedEntries.push(flaggedEntry);
        }
      }
    }
  }

  const userByUid = new Map(TARGET_USERS.map((user) => [user.uid, user]));
  for (const serviceDate of [...candidateActivityDates].sort()) {
    const activityDocuments = await listDocuments(accessToken, `service_activity/${serviceDate}/entries`);
    for (const document of activityDocuments) {
      const fields = document?.fields ?? {};
      const uid = getStringField(fields, 'updatedByUid');
      const user = userByUid.get(uid);
      if (!user) {
        continue;
      }

      const flaggedEntry = buildFlaggedEntry(document, QUERY_TARGETS.find((target) => target.allDescendants), user);
      if (flaggedEntry) {
        flaggedEntries.push(flaggedEntry);
      }
    }
  }

  return flaggedEntries.sort((left, right) => left.documentPath.localeCompare(right.documentPath));
}

function printEntries(entries) {
  if (entries.length === 0) {
    console.log('No out-of-day writes found for the configured users.');
    return;
  }

  for (const entry of entries) {
    console.log(
      [
        entry.userLabel,
        entry.uid,
        entry.collection,
        entry.documentPath,
        `serviceDate=${entry.serviceDate}`,
        `localWriteDate=${entry.localWriteDate}`,
        `timestamp=${entry.writeTimestamp}`,
      ].join(' | '),
    );
  }
}

function printSummary(entries, heading) {
  console.log(`\n${heading}`);
  if (entries.length === 0) {
    console.log('  none');
    return;
  }

  const counts = new Map();
  for (const entry of entries) {
    const key = `${entry.userLabel} (${entry.uid}) :: ${entry.collection}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  for (const [key, count] of [...counts.entries()].sort(([left], [right]) => left.localeCompare(right))) {
    console.log(`  ${key}: ${count}`);
  }
}

async function deleteDocument(accessToken, documentName) {
  const endpoint = `/documents/${documentName.replace(`projects/${PROJECT_ID}/databases/${DATABASE_ID}/documents/`, '')}`;
  await firestoreRequest(accessToken, endpoint, {
    method: 'DELETE',
  });
}

async function main() {
  const mode = process.argv[2];
  if (mode !== '--dry-run' && mode !== '--apply') {
    throw new Error('Usage: node functions/scripts/cleanup-out-of-day-writes.mjs --dry-run|--apply');
  }

  const accessToken = getAccessToken();
  const flaggedEntries = await collectFlaggedEntries(accessToken);

  console.log(`Project: ${PROJECT_ID}`);
  console.log(`Timezone: ${TIME_ZONE}`);
  console.log(`Mode: ${mode}`);
  console.log(`Flagged entries: ${flaggedEntries.length}\n`);

  printEntries(flaggedEntries);
  printSummary(flaggedEntries, 'Summary by user and collection');

  if (mode === '--dry-run') {
    return;
  }

  for (const entry of flaggedEntries) {
    await deleteDocument(accessToken, entry.documentName);
  }

  const remainingEntries = await collectFlaggedEntries(accessToken);
  console.log(`\nDeleted entries: ${flaggedEntries.length}`);
  console.log(`Remaining flagged entries after delete: ${remainingEntries.length}`);
  printSummary(remainingEntries, 'Post-delete summary by user and collection');
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
