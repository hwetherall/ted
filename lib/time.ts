import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { EVENT_TZ } from "@/lib/config";

export function formatEventTime(value: string | Date) {
  const date = new Date(value);
  const zone = new Intl.DateTimeFormat("en-AU", { timeZone: EVENT_TZ, timeZoneName: "short" })
    .formatToParts(date)
    .find((part) => part.type === "timeZoneName")?.value;
  return `${formatInTimeZone(date, EVENT_TZ, "EEE d MMM, h:mma")} ${zone || EVENT_TZ}`;
}

export function eventInputToUtc(value: string) {
  return fromZonedTime(value, EVENT_TZ).toISOString();
}

export function toDateTimeLocal(value: string | Date) {
  return formatInTimeZone(value, EVENT_TZ, "yyyy-MM-dd'T'HH:mm");
}
