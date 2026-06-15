export interface Registration {
  id: string;
  eventId: string;
  name: string;
  email?: string;
  phone?: string;
  customFields: Record<string, any>;
  feedback?: string;
  rating?: number;
  registeredAt: string;
  checkedIn: boolean;
  checkedInAt?: string;
}

export interface CheckinRecord {
  registrationId: string;
  checkedInAt: string;
}

export interface RatingHistogramItem {
  rating: number;
  count: number;
}

export interface CheckinTimeDistributionItem {
  time: string;
  count: number;
}

export interface ReportData {
  totalRegistrations: number;
  checkedInCount: number;
  checkinRate: number;
  avgRating: number;
  ratingHistogram: RatingHistogramItem[];
  checkinTimeDistribution: CheckinTimeDistributionItem[];
  customFieldSummary: Record<string, Record<string, number>>;
}

export function calculateCheckinRate(registrations: Registration[]): number {
  if (registrations.length === 0) return 0;
  const checkedIn = registrations.filter((r) => r.checkedIn).length;
  return (checkedIn / registrations.length) * 100;
}

export function calculateAvgRating(registrations: Registration[]): number {
  const ratings = registrations.filter((r) => r.rating !== undefined).map((r) => r.rating as number);
  if (ratings.length === 0) return 0;
  return ratings.reduce((sum, r) => sum + r, 0) / ratings.length;
}

export function getRatingHistogram(registrations: Registration[]): RatingHistogramItem[] {
  const ratings = registrations.filter((r) => r.rating !== undefined).map((r) => r.rating as number);
  return [1, 2, 3, 4, 5].map((rating) => ({
    rating,
    count: ratings.filter((r) => r === rating).length,
  }));
}

export function getCheckinTimeDistribution(registrations: Registration[]): CheckinTimeDistributionItem[] {
  const checkinTimes = registrations
    .filter((r) => r.checkedIn && r.checkedInAt)
    .map((r) => new Date(r.checkedInAt!));

  if (checkinTimes.length === 0) {
    return [];
  }

  const sortedTimes = [...checkinTimes].sort((a, b) => a.getTime() - b.getTime());
  const earliest = new Date(sortedTimes[0]);
  earliest.setMinutes(0, 0, 0);
  const latest = new Date(sortedTimes[sortedTimes.length - 1]);
  latest.setMinutes(59, 59, 999);

  const distribution: CheckinTimeDistributionItem[] = [];
  for (let h = earliest.getHours(); h <= latest.getHours(); h++) {
    const hourStr = `${h.toString().padStart(2, '0')}:00`;
    const count = sortedTimes.filter((t) => t.getHours() === h).length;
    distribution.push({ time: hourStr, count });
  }

  return distribution;
}

export function getCustomFieldSummary(
  registrations: Registration[],
  customFields: { id: string; name: string; type: string }[]
): Record<string, Record<string, number>> {
  const summary: Record<string, Record<string, number>> = {};

  for (const field of customFields) {
    summary[field.id] = {};
    for (const reg of registrations) {
      const value = reg.customFields[field.id];
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          for (const v of value) {
            summary[field.id][v] = (summary[field.id][v] || 0) + 1;
          }
        } else {
          const key = String(value);
          summary[field.id][key] = (summary[field.id][key] || 0) + 1;
        }
      }
    }
  }

  return summary;
}

export function generateReport(
  registrations: Registration[],
  customFields: { id: string; name: string; type: string }[] = []
): ReportData {
  return {
    totalRegistrations: registrations.length,
    checkedInCount: registrations.filter((r) => r.checkedIn).length,
    checkinRate: calculateCheckinRate(registrations),
    avgRating: calculateAvgRating(registrations),
    ratingHistogram: getRatingHistogram(registrations),
    checkinTimeDistribution: getCheckinTimeDistribution(registrations),
    customFieldSummary: getCustomFieldSummary(registrations, customFields),
  };
}
