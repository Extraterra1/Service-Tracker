import { collection, documentId, getDocs, query, where } from 'firebase/firestore';
import { normalizeServiceDay } from './api';
import { addDays, getTodayDate } from './date';
import { db } from './firebaseDb';
import { normalizePlate } from './plates';

export function getCarHistoryRange(todayDate = getTodayDate()) {
  return {
    rangeStart: addDays(todayDate, -15),
    rangeEnd: addDays(todayDate, 15)
  };
}

function getDisplayPlate(value, fallback) {
  const plate = String(value ?? '').trim().toUpperCase();
  return plate || fallback;
}

function buildTimeOverrideMap(timeOverrides) {
  return (Array.isArray(timeOverrides) ? timeOverrides : []).reduce((lookup, entry) => {
    const date = String(entry?.date ?? '').trim();
    const itemId = String(entry?.itemId ?? '').trim();
    const overrideTime = String(entry?.overrideTime ?? '').trim();

    if (!date || !itemId || !overrideTime) {
      return lookup;
    }

    lookup.set(`${date}_${itemId}`, overrideTime);
    return lookup;
  }, new Map());
}

function compareHistoryEntries(left, right) {
  return right.date.localeCompare(left.date) || right.effectiveTime.localeCompare(left.effectiveTime) || left.id.localeCompare(right.id);
}

export function buildCarHistoryData({ scrapedDays, timeOverrides }) {
  const overrideTimeByItemKey = buildTimeOverrideMap(timeOverrides);
  const entries = [];

  (Array.isArray(scrapedDays) ? scrapedDays : []).forEach((day) => {
    const date = String(day?.date ?? '').trim();
    if (!date) {
      return;
    }

    const normalizedDay = normalizeServiceDay({
      date,
      pickups: day?.pickups,
      returns: day?.returns
    });

    [...normalizedDay.pickups, ...normalizedDay.returns].forEach((item) => {
      const itemId = String(item?.itemId ?? '').trim();
      const plateKey = normalizePlate(item?.plate);

      if (!itemId || !plateKey) {
        return;
      }

      entries.push({
        id: `${date}_${itemId}`,
        date,
        itemId,
        serviceType: item?.serviceType ?? '',
        plateKey,
        displayPlate: getDisplayPlate(item?.plate, plateKey),
        clientName: String(item?.name ?? '').trim() || 'Cliente sem nome',
        reservationId: String(item?.id ?? '').trim() || 'Sem reserva',
        effectiveTime: String(overrideTimeByItemKey.get(`${date}_${itemId}`) ?? item?.overrideTime ?? item?.displayTime ?? item?.time ?? '').trim() || '--:--'
      });
    });
  });

  entries.sort(compareHistoryEntries);

  const displayLabelByPlateKey = new Map();
  const entriesByPlate = entries.reduce((lookup, entry) => {
    if (!displayLabelByPlateKey.has(entry.plateKey)) {
      displayLabelByPlateKey.set(entry.plateKey, entry.displayPlate);
    }

    if (!lookup[entry.plateKey]) {
      lookup[entry.plateKey] = [];
    }

    lookup[entry.plateKey].push(entry);
    return lookup;
  }, {});

  const plateOptions = [...displayLabelByPlateKey.entries()]
    .map(([value, label]) => ({ value, label }))
    .sort((left, right) => left.label.localeCompare(right.label) || left.value.localeCompare(right.value));

  return {
    plateOptions,
    entriesByPlate
  };
}

export async function fetchCarHistory({ rangeStart, rangeEnd }) {
  if (!db) {
    return {
      plateOptions: [],
      entriesByPlate: {}
    };
  }

  const scrapedDaysQuery = query(
    collection(db, 'scraped-data'),
    where(documentId(), '>=', rangeStart),
    where(documentId(), '<=', rangeEnd)
  );
  const timeOverridesQuery = query(
    collection(db, 'service_time_overrides'),
    where('date', '>=', rangeStart),
    where('date', '<=', rangeEnd)
  );

  const [scrapedDaysSnapshot, timeOverridesSnapshot] = await Promise.all([getDocs(scrapedDaysQuery), getDocs(timeOverridesQuery)]);

  return buildCarHistoryData({
    scrapedDays: scrapedDaysSnapshot.docs.map((entry) => {
      const payload = entry.data() ?? {};
      return {
        ...payload,
        date: String(payload.date ?? '').trim() || entry.id
      };
    }),
    timeOverrides: timeOverridesSnapshot.docs.map((entry) => entry.data() ?? {})
  });
}
