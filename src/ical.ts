import { Reserve } from './scrape'

function dateToMinimumISOString(date: Date) {
  if (date.getHours() === 0 && date.getMinutes() === 0) {
    return `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`
  }

  return date
    .toISOString()
    .replaceAll(/[-:]/g, '')
    .replaceAll(/\.\d{3}/g, '')
}

export function genereteIcalFromReserves(
  reserves: Reserve[],
  location: string,
) {
  return `
BEGIN:VCALENDAR
PRODID:-//Rokoucha//Oh Big 7//EN
VERSION:2.0
BEGIN:VTIMEZONE
TZID:Asia/Tokyo
BEGIN:STANDARD
TZOFFSETFROM:+0900
TZOFFSETTO:+0900
TZNAME:JST
DTSTART:19700101T000000
END:STANDARD
END:VTIMEZONE
${reserves
  .map((r) =>
    `
BEGIN:VEVENT
DTSTAMP:${dateToMinimumISOString(new Date())}
DTSTART:${dateToMinimumISOString(r.from)}
DTEND:${dateToMinimumISOString(r.to)}
SUMMARY:${r.type} ${r.slot} ${r.description}
LOCATION:${location}
UID:${r.from.getTime()}@oh-big-7
END:VEVENT
`.trim(),
  )
  .join('\n')}
END:VCALENDAR
`.trim()
}
