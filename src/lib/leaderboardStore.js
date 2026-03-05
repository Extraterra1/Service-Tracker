import {
  Timestamp,
  collection,
  collectionGroup,
  documentId,
  getDocs,
  limit,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import { db } from './firebaseDb';

const DEFAULT_TIME_ZONE = 'Atlantic/Madeira';
const ALL_TIME_LIMIT = 10000;
const WEEKDAY_INDEX = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

function getFormatter(timeZone, options) {
  return new Intl.DateTimeFormat('en-US', { timeZone, ...options });
}

function getDatePart(parts, type) {
  return Number(parts.find((part) => part.type === type)?.value ?? '0');
}

function getZonedDateParts(value, timeZone) {
  const date = value instanceof Date ? value : new Date(value);
  const parts = getFormatter(timeZone, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  return {
    year: getDatePart(parts, 'year'),
    month: getDatePart(parts, 'month'),
    day: getDatePart(parts, 'day'),
  };
}

function getZonedWeekdayIndex(value, timeZone) {
  const date = value instanceof Date ? value : new Date(value);
  const label = getFormatter(timeZone, { weekday: 'short' }).format(date);
  return WEEKDAY_INDEX[label] ?? 1;
}

function shiftDateParts({ year, month, day }, deltaDays) {
  const shifted = new Date(Date.UTC(year, month - 1, day));
  shifted.setUTCDate(shifted.getUTCDate() + deltaDays);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  };
}

function getTimeZoneOffsetMinutes(value, timeZone) {
  const date = value instanceof Date ? value : new Date(value);
  const parts = getFormatter(timeZone, {
    timeZoneName: 'shortOffset',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(date);

  const offsetLabel = parts.find((part) => part.type === 'timeZoneName')?.value ?? 'GMT+0';
  const match = offsetLabel.match(/GMT([+-])(\d{1,2})(?::?(\d{2}))?/i);
  if (!match) {
    return 0;
  }

  const sign = match[1] === '-' ? -1 : 1;
  const hours = Number(match[2] ?? '0');
  const minutes = Number(match[3] ?? '0');

  return sign * (hours * 60 + minutes);
}

function zonedDateTimeToUtcMs({ year, month, day, hour = 0, minute = 0, second = 0 }, timeZone) {
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, second);
  const initialOffset = getTimeZoneOffsetMinutes(new Date(utcGuess), timeZone);
  const adjusted = utcGuess - initialOffset * 60_000;
  const adjustedOffset = getTimeZoneOffsetMinutes(new Date(adjusted), timeZone);

  if (adjustedOffset === initialOffset) {
    return adjusted;
  }

  return utcGuess - adjustedOffset * 60_000;
}

function normalizePeriod(value) {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (normalized === 'weekly' || normalized === 'monthly' || normalized === 'all_time') {
    return normalized;
  }
  return 'weekly';
}

function normalizeEmail(value) {
  return String(value ?? '').trim().toLowerCase();
}

function fallbackDisplayName(name, email, uid) {
  const displayName = String(name ?? '').trim();
  if (displayName) {
    return displayName;
  }

  const normalizedEmail = normalizeEmail(email);
  if (normalizedEmail) {
    return normalizedEmail.split('@')[0];
  }

  return uid ? `User ${uid.slice(0, 6)}` : 'Equipa';
}

function toDateValue(value) {
  if (!value) {
    return null;
  }

  if (typeof value.toDate === 'function') {
    return value.toDate();
  }

  if (value?.seconds) {
    return new Date(value.seconds * 1000);
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function getIdentityKey(uid, email, name) {
  const normalizedUid = String(uid ?? '').trim();
  if (normalizedUid) {
    return `uid:${normalizedUid}`;
  }

  const normalizedEmail = normalizeEmail(email);
  if (normalizedEmail) {
    return `email:${normalizedEmail}`;
  }

  const normalizedName = String(name ?? '').trim().toLowerCase();
  if (normalizedName) {
    return `name:${normalizedName}`;
  }

  return 'unknown';
}

function toChunkedArray(values, chunkSize) {
  const result = [];
  for (let index = 0; index < values.length; index += chunkSize) {
    result.push(values.slice(index, index + chunkSize));
  }
  return result;
}

function getEntryId(value) {
  return String(value ?? '').trim();
}

function getSortableActionEntries(entries) {
  return entries
    .map((entry) => {
      const createdAt = toDateValue(entry?.createdAt);
      if (!createdAt) {
        return null;
      }

      return {
        ...entry,
        createdAt,
        __entryId: getEntryId(entry?.__entryId),
      };
    })
    .filter(Boolean)
    .sort((left, right) => {
      const leftTime = left.createdAt.getTime();
      const rightTime = right.createdAt.getTime();
      if (leftTime !== rightTime) {
        return leftTime - rightTime;
      }

      return left.__entryId.localeCompare(right.__entryId);
    });
}

function getScoredPoints(entry, countedStatusCompletions) {
  if (entry.actionType === 'status_toggle') {
    if (entry.done !== true) {
      return 0;
    }

    const date = String(entry.date ?? '').trim();
    const itemId = String(entry.itemId ?? '').trim();
    if (!date || !itemId) {
      return 0;
    }

    const completionKey = `${date}|${itemId}`;
    if (countedStatusCompletions.has(completionKey)) {
      return 0;
    }

    countedStatusCompletions.add(completionKey);
    return 1;
  }

  if (entry.actionType === 'ready_toggle' || entry.actionType === 'time_change') {
    return 1;
  }

  return 0;
}

export function getLeaderboardRange(periodInput, nowInput = new Date(), timeZone = DEFAULT_TIME_ZONE) {
  const period = normalizePeriod(periodInput);
  const now = nowInput instanceof Date ? nowInput : new Date(nowInput);

  if (period === 'all_time') {
    return {
      period,
      timeZone,
      startAt: null,
      endAt: null,
      label: 'All time',
    };
  }

  const todayParts = getZonedDateParts(now, timeZone);
  let startParts = todayParts;
  let endParts;

  if (period === 'weekly') {
    const weekday = getZonedWeekdayIndex(now, timeZone);
    const offsetToMonday = weekday === 0 ? -6 : 1 - weekday;
    startParts = shiftDateParts(todayParts, offsetToMonday);
    endParts = shiftDateParts(startParts, 7);
  } else {
    startParts = { year: todayParts.year, month: todayParts.month, day: 1 };
    const nextMonthYear = todayParts.month === 12 ? todayParts.year + 1 : todayParts.year;
    const nextMonth = todayParts.month === 12 ? 1 : todayParts.month + 1;
    endParts = { year: nextMonthYear, month: nextMonth, day: 1 };
  }

  const startAt = Timestamp.fromDate(new Date(zonedDateTimeToUtcMs(startParts, timeZone)));
  const endAt = Timestamp.fromDate(new Date(zonedDateTimeToUtcMs(endParts, timeZone)));

  return {
    period,
    timeZone,
    startAt,
    endAt,
    label: period === 'weekly' ? 'Semana' : 'Mês',
  };
}

export function applySharedRanks(rows) {
  let previousScore = null;
  let currentRank = 0;

  return rows.map((row, index) => {
    if (row.score !== previousScore) {
      currentRank = index + 1;
      previousScore = row.score;
    }

    return {
      ...row,
      rank: currentRank,
      sharedRank: index > 0 && row.score === rows[index - 1].score,
    };
  });
}

export function buildLeaderboardRows(entries) {
  const map = new Map();
  let totalActions = 0;
  const countedStatusCompletions = new Set();
  const sortableEntries = getSortableActionEntries(entries);

  sortableEntries.forEach((entry) => {
    const points = getScoredPoints(entry, countedStatusCompletions);
    if (points <= 0) {
      return;
    }

    const uid = String(entry.updatedByUid ?? '').trim();
    const email = normalizeEmail(entry.updatedByEmail);
    const key = getIdentityKey(uid, email, entry.updatedByName);
    const identity = map.get(key) ?? {
      key,
      uid,
      email,
      displayName: fallbackDisplayName(entry.updatedByName, email, uid),
      firstActionAt: entry.createdAt,
      lastActionAt: entry.createdAt,
      score: 0,
      photoURL: '',
    };

    identity.score += points;
    if (entry.createdAt.getTime() < identity.firstActionAt.getTime()) {
      identity.firstActionAt = entry.createdAt;
    }
    if (entry.createdAt.getTime() > identity.lastActionAt.getTime()) {
      identity.lastActionAt = entry.createdAt;
    }

    map.set(key, identity);
    totalActions += points;
  });

  const sortedRows = Array.from(map.values()).sort((left, right) => {
    if (right.score !== left.score) {
      return right.score - left.score;
    }

    const rightTime = right.lastActionAt?.getTime?.() ?? 0;
    const leftTime = left.lastActionAt?.getTime?.() ?? 0;
    if (rightTime !== leftTime) {
      return rightTime - leftTime;
    }

    return String(left.displayName).localeCompare(String(right.displayName), 'pt-PT');
  });

  return {
    rows: applySharedRanks(sortedRows),
    totalActions,
  };
}

export async function fetchStaffProfilesByUids(uids) {
  if (!db || !Array.isArray(uids) || uids.length === 0) {
    return new Map();
  }

  const uniqueUids = Array.from(new Set(uids.map((uid) => String(uid ?? '').trim()).filter(Boolean)));
  if (uniqueUids.length === 0) {
    return new Map();
  }

  const profileMap = new Map();
  const uidGroups = toChunkedArray(uniqueUids, 30);
  const profileCollection = collection(db, 'staff_profiles');

  await Promise.all(
    uidGroups.map(async (group) => {
      const groupQuery = query(profileCollection, where(documentId(), 'in', group));
      const snapshot = await getDocs(groupQuery);
      snapshot.forEach((docSnap) => {
        const value = docSnap.data() ?? {};
        profileMap.set(docSnap.id, {
          uid: docSnap.id,
          displayName: String(value.displayName ?? '').trim(),
          firstName: String(value.firstName ?? '').trim(),
          email: normalizeEmail(value.email),
          photoURL: String(value.photoURL ?? '').trim(),
        });
      });
    })
  );

  return profileMap;
}

function mergeProfiles(rows, profileMap) {
  return rows.map((row) => {
    const profile = row.uid ? profileMap.get(row.uid) : null;
    if (!profile) {
      return row;
    }

    return {
      ...row,
      displayName: profile.displayName || row.displayName,
      email: profile.email || row.email,
      photoURL: profile.photoURL || row.photoURL,
    };
  });
}

function getLeaderboardQuery(periodRange) {
  const entriesGroup = collectionGroup(db, 'entries');

  if (periodRange.period === 'all_time') {
    return query(entriesGroup, orderBy('createdAt', 'desc'), limit(ALL_TIME_LIMIT));
  }

  return query(
    entriesGroup,
    where('createdAt', '>=', periodRange.startAt),
    where('createdAt', '<', periodRange.endAt),
    orderBy('createdAt', 'desc')
  );
}

export async function fetchLeaderboard({ period = 'weekly', now = new Date() } = {}) {
  if (!db) {
    return {
      period: normalizePeriod(period),
      rows: [],
      totalActions: 0,
      participants: 0,
      fetchedAt: new Date(),
      capped: false,
      range: getLeaderboardRange(period, now),
    };
  }

  const range = getLeaderboardRange(period, now);
  const leaderboardQuery = getLeaderboardQuery(range);
  const snapshot = await getDocs(leaderboardQuery);
  const entries = snapshot.docs.map((docSnap) => ({
    ...(docSnap.data() ?? {}),
    __entryId: docSnap.id,
  }));
  const { rows: rawRows, totalActions } = buildLeaderboardRows(entries);
  const profileMap = await fetchStaffProfilesByUids(rawRows.map((row) => row.uid).filter(Boolean));
  const rows = applySharedRanks(mergeProfiles(rawRows, profileMap));

  return {
    period: range.period,
    rows,
    totalActions,
    participants: rows.length,
    fetchedAt: new Date(),
    capped: range.period === 'all_time' && snapshot.size >= ALL_TIME_LIMIT,
    range,
  };
}

export { ALL_TIME_LIMIT, DEFAULT_TIME_ZONE };
