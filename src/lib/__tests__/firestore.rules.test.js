// @vitest-environment node

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import process from 'node:process';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { Timestamp, doc, setDoc, updateDoc } from 'firebase/firestore';
import { addDays, getTodayServiceDate } from '../date';

const PROJECT_ID = 'demo-service-tracker';
const STAFF_UID = 'staff-user-1';
const RULES_PATH = resolve(process.cwd(), 'firestore.rules');
const hasFirestoreEmulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);

let testEnv;

function getAuthedDb() {
  return testEnv.authenticatedContext(STAFF_UID, {
    email: 'staff@example.com',
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
});
