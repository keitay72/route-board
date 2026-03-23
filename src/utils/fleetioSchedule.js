const DEFAULT_FLEETIO_TIME_ZONE = "America/Chicago";
const OPERATION_START_MINUTE = 4 * 60;
const OPERATION_END_MINUTE = 18 * 60;
const WEEKDAY_ORDER = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const YMD_RE = /^\d{4}-\d{2}-\d{2}$/;

function toStringValue(value) {
  return String(value || "").trim();
}

function getDateFormatter(timeZone) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    weekday: "short",
  });
}

function getZonedParts(date, timeZone) {
  const parts = getDateFormatter(timeZone).formatToParts(date);
  const lookup = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return {
    ymd: `${lookup.year}-${lookup.month}-${lookup.day}`,
    hour: Number(lookup.hour),
    minute: Number(lookup.minute),
    weekday: lookup.weekday,
  };
}

function toUtcDate(year, monthIndex, day) {
  return new Date(Date.UTC(year, monthIndex, day));
}

function formatUtcYmd(date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getNthWeekdayOfMonth(year, monthIndex, weekday, occurrence) {
  const firstDay = toUtcDate(year, monthIndex, 1);
  const offset = (weekday - firstDay.getUTCDay() + 7) % 7;
  return toUtcDate(year, monthIndex, 1 + offset + (occurrence - 1) * 7);
}

function getLastWeekdayOfMonth(year, monthIndex, weekday) {
  const lastDay = toUtcDate(year, monthIndex + 1, 0);
  const offset = (lastDay.getUTCDay() - weekday + 7) % 7;
  return toUtcDate(year, monthIndex, lastDay.getUTCDate() - offset);
}

function getSaturdayOfWeek(date) {
  return toUtcDate(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate() + (6 - date.getUTCDay()),
  );
}

function getHolidayDatesForYear(year) {
  return [
    toUtcDate(year, 0, 1),
    getLastWeekdayOfMonth(year, 4, 1),
    toUtcDate(year, 6, 4),
    getNthWeekdayOfMonth(year, 8, 1, 1),
    getNthWeekdayOfMonth(year, 10, 4, 4),
    toUtcDate(year, 11, 25),
  ];
}

function getHolidayOperationalSaturdays(year) {
  const saturdays = new Set();

  for (const holiday of getHolidayDatesForYear(year)) {
    const dayOfWeek = holiday.getUTCDay();
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      saturdays.add(formatUtcYmd(getSaturdayOfWeek(holiday)));
    }
  }

  return saturdays;
}

export function parseExtraOperationalSaturdays(value) {
  const parsed = new Set();

  for (const raw of toStringValue(value).split(",")) {
    const date = raw.trim();
    if (YMD_RE.test(date)) parsed.add(date);
  }

  return parsed;
}

export function getFleetioScheduleConfig({
  extraOperationalSaturdays,
  timeZone = DEFAULT_FLEETIO_TIME_ZONE,
} = {}) {
  return {
    extraOperationalSaturdays:
      extraOperationalSaturdays instanceof Set
        ? extraOperationalSaturdays
        : parseExtraOperationalSaturdays(extraOperationalSaturdays),
    timeZone: toStringValue(timeZone) || DEFAULT_FLEETIO_TIME_ZONE,
  };
}

export function getFleetioOperationalStatus(
  now = new Date(),
  {
    extraOperationalSaturdays,
    timeZone = DEFAULT_FLEETIO_TIME_ZONE,
  } = {},
) {
  const cfg = getFleetioScheduleConfig({
    extraOperationalSaturdays,
    timeZone,
  });
  const parts = getZonedParts(now, cfg.timeZone);
  const holidayOperationalSaturdays = getHolidayOperationalSaturdays(
    Number(parts.ymd.slice(0, 4)),
  );
  const minutes = parts.hour * 60 + parts.minute;
  const isWithinHours =
    minutes >= OPERATION_START_MINUTE && minutes < OPERATION_END_MINUTE;
  const isWeekday =
    WEEKDAY_ORDER.indexOf(parts.weekday) >= 1 &&
    WEEKDAY_ORDER.indexOf(parts.weekday) <= 5;
  const isExtraSaturday =
    parts.weekday === "Sat" &&
    (holidayOperationalSaturdays.has(parts.ymd) ||
      cfg.extraOperationalSaturdays.has(parts.ymd));

  return {
    ...parts,
    holidayOperationalSaturdays,
    isOperational: isWithinHours && (isWeekday || isExtraSaturday),
    timeZone: cfg.timeZone,
  };
}
