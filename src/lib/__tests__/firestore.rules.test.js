// @vitest-environment node

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import process from 'node:process';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { Timestamp, collection, doc, getDocs, query, setDoc, updateDoc, where } from 'firebase/firestore';
import { addDays, getTodayServiceDate } from '../date';

const PROJECT_ID = 'demo-service-tracker';
const STAFF_UID = 'staff-user-1';
const ADMIN_UID = 'admin-user-1';
const PENDING_UID = 'pending-user-1';
const RULES_PATH = resolve(process.cwd(), 'firestore.rules');
const hasFirestoreEmulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);

let testEnv;

function getAuthedDb() {
  return testEnv.authenticatedContext(STAFF_UID, {
    email: 'staff@example.com',
  }).firestore();
}

function getAdminDb() {
  return testEnv.authenticatedContext(ADMIN_UID, {
    email: 'admin@example.com',
  }).firestore();
}

function getUserDb(uid, email = `${uid}@example.com`) {
  return testEnv.authenticatedContext(uid, {
    email,
  }).firestore();
}

function buildStatusPayload(date) {
  return {
    date,
    itemId: 'item-1',
    serviceType: 'pickup',
    done: true,
    updatedAt: Timestamp.fromDate(new Date()),
    updatedByUid: STAFF_UID,
    updatedByName: 'Staff',
    updatedByEmail: 'staff@example.com',
  };
}

function buildTimeOverridePayload(date) {
  return {
    date,
    itemId: 'item-1',
    serviceType: 'pickup',
    originalTime: '09:00',
    overrideTime: '09:30',
    updatedAt: Timestamp.fromDate(new Date()),
    updatedByUid: STAFF_UID,
    updatedByName: 'Staff',
    updatedByEmail: 'staff@example.com',
  };
}

function buildReadyPayload(date) {
  return {
    date,
    itemId: 'item-1',
    serviceType: 'pickup',
    plate: 'AA-00-AA',
    ready: true,
    updatedAt: Timestamp.fromDate(new Date()),
    updatedByUid: STAFF_UID,
    updatedByName: 'Staff',
    updatedByEmail: 'staff@example.com',
  };
}

function buildActivityPayload(date, actionType = 'status_toggle') {
  const basePayload = {
    actionType,
    date,
    itemId: 'item-1',
    serviceType: 'pickup',
    done: actionType === 'status_toggle',
    createdAt: Timestamp.fromDate(new Date()),
    updatedByUid: STAFF_UID,
    updatedByName: 'Staff',
    updatedByEmail: 'staff@example.com',
    itemName: 'Servico 1',
    itemTime: actionType === 'time_change' ? '09:30' : '09:00',
    reservationId: 'reservation-1',
    plate: 'AA-00-AA',
  };

  if (actionType === 'time_change') {
    return {
      ...basePayload,
      done: false,
      oldTime: '09:00',
      newTime: '09:30',
    };
  }

  if (actionType === 'ready_toggle') {
    return {
      ...basePayload,
      done: false,
      ready: true,
    };
  }

  return basePayload;
}

function buildFlightCachePayload(date) {
  return {
    date,
    flightNumbers: ['TP1685'],
    results: [{ flightNumber: 'TP1685', status: 'scheduled' }],
    source: 'fr24-unofficial',
    cachedAt: Timestamp.fromDate(new Date()),
    updatedByUid: STAFF_UID,
  };
}

function buildFlightRefreshLockPayload(date) {
  return {
    date,
    ownerUid: STAFF_UID,
    cacheVersion: 'missing',
    leaseUntil: Timestamp.fromMillis(Date.now() + 45_000),
    updatedAt: Timestamp.fromDate(new Date()),
  };
}

function buildPendingAccessRequestPayload(uid = PENDING_UID) {
  const now = Timestamp.fromDate(new Date());

  return {
    uid,
    email: `${uid}@example.com`,
    emailNormalized: `${uid}@example.com`,
    displayName: 'Pending User',
    photoURL: '',
    status: 'pending',
    requestCount: 1,
    createdAt: now,
    updatedAt: now,
    lastRequestedAt: now,
    decisionType: '',
    decisionAt: null,
    decisionByUid: '',
    decisionByName: '',
    decisionByEmail: '',
  };
}

function buildAccessDecisionPayload(status, decisionType) {
  const pendingPayload = buildPendingAccessRequestPayload(PENDING_UID);
  const now = Timestamp.fromDate(new Date());

  return {
    ...pendingPayload,
    status,
    updatedAt: now,
    decisionType,
    decisionAt: now,
    decisionByUid: ADMIN_UID,
    decisionByName: 'Admin User',
    decisionByEmail: 'admin@example.com',
  };
}

function buildAllowlistApprovalPayload() {
  return {
    active: true,
    role: 'staff',
    uid: PENDING_UID,
    email: `${PENDING_UID}@example.com`,
    displayName: 'Pending User',
    approvedAt: Timestamp.fromDate(new Date()),
    approvedByUid: ADMIN_UID,
    approvedByName: 'Admin User',
    approvedByEmail: 'admin@example.com',
  };
}

function buildRevokedAllowlistPayload(uid = PENDING_UID) {
  const now = Timestamp.fromDate(new Date());

  return {
    active: false,
    role: 'staff',
    uid,
    email: `${uid}@example.com`,
    displayName: 'Revoked User',
    approvedAt: now,
    approvedByUid: ADMIN_UID,
    approvedByName: 'Admin User',
    approvedByEmail: 'admin@example.com',
    revokedAt: now,
    revokedByUid: ADMIN_UID,
    revokedByName: 'Admin User',
    revokedByEmail: 'admin@example.com',
  };
}

function buildBlockedAccessRequestPayload(uid = PENDING_UID) {
  const now = Timestamp.fromDate(new Date());

  return {
    uid,
    email: `${uid}@example.com`,
    emailNormalized: `${uid}@example.com`,
    displayName: 'Revoked User',
    photoURL: '',
    status: 'blocked',
    requestCount: 1,
    createdAt: now,
    updatedAt: now,
    lastRequestedAt: null,
    decisionType: 'revoke',
    decisionAt: now,
    decisionByUid: ADMIN_UID,
    decisionByName: 'Admin User',
    decisionByEmail: 'admin@example.com',
  };
}

beforeAll(async () => {
  if (!hasFirestoreEmulator) {
    return;
  }

  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync(RULES_PATH, 'utf8'),
    },
  });
});

afterAll(async () => {
  if (!testEnv) {
    return;
  }

  await testEnv.cleanup();
});

beforeEach(async () => {
  if (!testEnv) {
    return;
  }

  await testEnv.clearFirestore();

  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, 'staff_allowlist', STAFF_UID), {
      active: true,
      email: 'staff@example.com',
      displayName: 'Staff User',
      role: 'staff',
    });
    await setDoc(doc(db, 'staff_allowlist', ADMIN_UID), {
      active: true,
      uid: ADMIN_UID,
      email: 'admin@example.com',
      displayName: 'Admin User',
      role: 'admin',
      approvedAt: Timestamp.fromDate(new Date()),
      approvedByUid: ADMIN_UID,
      approvedByName: 'Admin User',
      approvedByEmail: 'admin@example.com',
    });
  });
});

const describeRules = hasFirestoreEmulator ? describe : describe.skip;

describeRules('firestore current-day write rules', () => {
  it('allows current-day service status writes and blocks past/future ones', async () => {
    const db = getAuthedDb();
    const today = getTodayServiceDate();
    const past = addDays(today, -1);
    const future = addDays(today, 1);

    await expect(assertSucceeds(setDoc(doc(db, 'service_status', `${today}_item-1`), buildStatusPayload(today)))).resolves.toBeUndefined();
    await expect(assertFails(setDoc(doc(db, 'service_status', `${past}_item-1`), buildStatusPayload(past)))).resolves.toBeDefined();
    await expect(assertFails(setDoc(doc(db, 'service_status', `${future}_item-1`), buildStatusPayload(future)))).resolves.toBeDefined();
  });

  it('allows current-day status updates and blocks updates for past-day documents', async () => {
    const db = getAuthedDb();
    const today = getTodayServiceDate();
    const past = addDays(today, -1);

    await testEnv.withSecurityRulesDisabled(async (context) => {
      const adminDb = context.firestore();
      await setDoc(doc(adminDb, 'service_status', `${today}_item-1`), buildStatusPayload(today));
      await setDoc(doc(adminDb, 'service_status', `${past}_item-1`), buildStatusPayload(past));
    });

    await expect(assertSucceeds(updateDoc(doc(db, 'service_status', `${today}_item-1`), { done: false, updatedAt: Timestamp.fromDate(new Date()) }))).resolves.toBeUndefined();
    await expect(assertFails(updateDoc(doc(db, 'service_status', `${past}_item-1`), { done: false, updatedAt: Timestamp.fromDate(new Date()) }))).resolves.toBeDefined();
  });

  it('allows current-day time override writes and blocks past/future ones', async () => {
    const db = getAuthedDb();
    const today = getTodayServiceDate();
    const past = addDays(today, -1);
    const future = addDays(today, 1);

    await expect(assertSucceeds(setDoc(doc(db, 'service_time_overrides', `${today}_item-1`), buildTimeOverridePayload(today)))).resolves.toBeUndefined();
    await expect(assertFails(setDoc(doc(db, 'service_time_overrides', `${past}_item-1`), buildTimeOverridePayload(past)))).resolves.toBeDefined();
    await expect(assertFails(setDoc(doc(db, 'service_time_overrides', `${future}_item-1`), buildTimeOverridePayload(future)))).resolves.toBeDefined();
  });

  it('allows current-day ready writes and blocks past/future ones', async () => {
    const db = getAuthedDb();
    const today = getTodayServiceDate();
    const past = addDays(today, -1);
    const future = addDays(today, 1);

    await expect(assertSucceeds(setDoc(doc(db, 'service_ready', `${today}_item-1`), buildReadyPayload(today)))).resolves.toBeUndefined();
    await expect(assertFails(setDoc(doc(db, 'service_ready', `${past}_item-1`), buildReadyPayload(past)))).resolves.toBeDefined();
    await expect(assertFails(setDoc(doc(db, 'service_ready', `${future}_item-1`), buildReadyPayload(future)))).resolves.toBeDefined();
  });

  it('allows current-day activity writes and blocks past/future ones', async () => {
    const db = getAuthedDb();
    const today = getTodayServiceDate();
    const past = addDays(today, -1);
    const future = addDays(today, 1);

    await expect(assertSucceeds(setDoc(doc(db, 'service_activity', today, 'entries', 'entry-today'), buildActivityPayload(today)))).resolves.toBeUndefined();
    await expect(assertFails(setDoc(doc(db, 'service_activity', past, 'entries', 'entry-past'), buildActivityPayload(past)))).resolves.toBeDefined();
    await expect(assertFails(setDoc(doc(db, 'service_activity', future, 'entries', 'entry-future'), buildActivityPayload(future)))).resolves.toBeDefined();
  });

  it('allows validated current-day flight cache writes and blocks other days or owners', async () => {
    const db = getAuthedDb();
    const today = getTodayServiceDate();
    const past = addDays(today, -1);

    await expect(assertSucceeds(setDoc(doc(db, 'flight_status_cache', today), buildFlightCachePayload(today)))).resolves.toBeUndefined();
    await expect(assertFails(setDoc(doc(db, 'flight_status_cache', past), buildFlightCachePayload(past)))).resolves.toBeDefined();
    await expect(assertFails(setDoc(doc(db, 'flight_status_cache', today), { ...buildFlightCachePayload(today), updatedByUid: 'another-user' }))).resolves.toBeDefined();
  });

  it('allows only the current staff user to acquire today flight refresh lease', async () => {
    const db = getAuthedDb();
    const today = getTodayServiceDate();
    const past = addDays(today, -1);

    await expect(assertSucceeds(setDoc(doc(db, 'flight_status_refresh_locks', today), buildFlightRefreshLockPayload(today)))).resolves.toBeUndefined();
    await expect(assertFails(setDoc(doc(db, 'flight_status_refresh_locks', past), buildFlightRefreshLockPayload(past)))).resolves.toBeDefined();
    await expect(assertFails(setDoc(doc(db, 'flight_status_refresh_locks', today), { ...buildFlightRefreshLockPayload(today), ownerUid: 'another-user' }))).resolves.toBeDefined();
  });
});

describeRules('firestore access request rules', () => {
  it('allows a signed-in user to create their own pending access request', async () => {
    const db = getUserDb(PENDING_UID);

    await expect(assertSucceeds(setDoc(doc(db, 'access_requests', PENDING_UID), buildPendingAccessRequestPayload()))).resolves.toBeUndefined();
  });

  it('blocks a signed-in user from approving themselves', async () => {
    const db = getUserDb(PENDING_UID);

    await expect(assertFails(setDoc(doc(db, 'staff_allowlist', PENDING_UID), buildAllowlistApprovalPayload()))).resolves.toBeDefined();
    await expect(assertFails(setDoc(doc(db, 'access_requests', PENDING_UID), buildAccessDecisionPayload('approved', 'approve')))).resolves.toBeDefined();
  });

  it('blocks non-admin staff from listing pending access requests', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const adminDb = context.firestore();
      await setDoc(doc(adminDb, 'access_requests', PENDING_UID), buildPendingAccessRequestPayload());
    });

    const db = getAuthedDb();
    const pendingQuery = query(collection(db, 'access_requests'), where('status', '==', 'pending'));

    await expect(assertFails(getDocs(pendingQuery))).resolves.toBeDefined();
  });

  it('allows admins to list pending access requests', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const adminDb = context.firestore();
      await setDoc(doc(adminDb, 'access_requests', PENDING_UID), buildPendingAccessRequestPayload());
    });

    const db = getAdminDb();
    const pendingQuery = query(collection(db, 'access_requests'), where('status', '==', 'pending'));

    await expect(assertSucceeds(getDocs(pendingQuery))).resolves.toBeDefined();
  });

  it('allows admins to approve a pending access request', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const adminDb = context.firestore();
      await setDoc(doc(adminDb, 'access_requests', PENDING_UID), buildPendingAccessRequestPayload());
    });

    const db = getAdminDb();

    await expect(assertSucceeds(setDoc(doc(db, 'staff_allowlist', PENDING_UID), buildAllowlistApprovalPayload()))).resolves.toBeUndefined();
    await expect(assertSucceeds(setDoc(doc(db, 'access_requests', PENDING_UID), buildAccessDecisionPayload('approved', 'approve')))).resolves.toBeUndefined();
  });

  it('allows admins to deny a pending access request without allowlisting the user', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const adminDb = context.firestore();
      await setDoc(doc(adminDb, 'access_requests', PENDING_UID), buildPendingAccessRequestPayload());
    });

    const db = getAdminDb();

    await expect(assertSucceeds(setDoc(doc(db, 'access_requests', PENDING_UID), buildAccessDecisionPayload('denied', 'deny')))).resolves.toBeUndefined();
  });

  it('blocks non-admin staff from listing staff allowlist users or revoking access', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const adminDb = context.firestore();
      await setDoc(doc(adminDb, 'staff_allowlist', PENDING_UID), {
        active: true,
        uid: PENDING_UID,
        email: `${PENDING_UID}@example.com`,
        displayName: 'Active User',
        role: 'staff',
      });
    });

    const db = getAuthedDb();

    await expect(assertFails(getDocs(collection(db, 'staff_allowlist')))).resolves.toBeDefined();
    await expect(assertFails(setDoc(doc(db, 'staff_allowlist', PENDING_UID), buildRevokedAllowlistPayload()))).resolves.toBeDefined();
    await expect(assertFails(setDoc(doc(db, 'access_requests', PENDING_UID), buildBlockedAccessRequestPayload()))).resolves.toBeDefined();
  });

  it('allows admins to list all staff allowlist users and revoke a user into blocked state', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const adminDb = context.firestore();
      await setDoc(doc(adminDb, 'staff_allowlist', PENDING_UID), {
        active: true,
        uid: PENDING_UID,
        email: `${PENDING_UID}@example.com`,
        displayName: 'Active User',
        role: 'staff',
      });
    });

    const db = getAdminDb();

    await expect(assertSucceeds(getDocs(collection(db, 'staff_allowlist')))).resolves.toBeDefined();
    await expect(assertSucceeds(setDoc(doc(db, 'staff_allowlist', PENDING_UID), buildRevokedAllowlistPayload()))).resolves.toBeUndefined();
    await expect(assertSucceeds(setDoc(doc(db, 'access_requests', PENDING_UID), buildBlockedAccessRequestPayload()))).resolves.toBeUndefined();
  });
});
