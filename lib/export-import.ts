import { Food, Entry, WeightEntry, WaterEntry } from '@/types';

export interface ExportData {
  version: string;
  exportDate: string;
  user: {
    email: string;
    name: string;
  };
  foods: Food[];
  entries: Entry[];
  weights: WeightEntry[];
  water: WaterEntry[];
}

/**
 * Export all user data to JSON
 */
export async function exportUserData(userId: string): Promise<ExportData> {
  const exportDate = new Date().toISOString();
  
  // Fetch all data
  const [foodsRes, weightsRes, waterRes] = await Promise.all([
    fetch('/api/foods?filter=mine'),
    fetch('/api/weights?from=2000-01-01&to=2099-12-31'),
    fetch('/api/water?from=2000-01-01&to=2099-12-31'),
  ]);

  const foods = foodsRes.ok ? (await foodsRes.json()).foods : [];
  const weights = weightsRes.ok ? (await weightsRes.json()).weights : [];
  const waterEntries = waterRes.ok ? (await waterRes.json()).waterEntries || [] : [];

  // Fetch entries for last 365 days (limit to avoid timeout)
  const today = new Date();
  const oneYearAgo = new Date(today);
  oneYearAgo.setFullYear(today.getFullYear() - 1);
  const fromDate = oneYearAgo.toISOString().split('T')[0];
  const toDate = today.toISOString().split('T')[0];

  const entries: Entry[] = [];
  // Fetch entries day by day (limit to last 90 days for performance)
  const ninetyDaysAgo = new Date(today);
  ninetyDaysAgo.setDate(today.getDate() - 90);
  const startDate = ninetyDaysAgo.toISOString().split('T')[0];
  
  const currentDate = new Date(startDate);
  let dayCount = 0;
  const maxDays = 90; // Limit to prevent timeout
  
  while (currentDate <= new Date(toDate) && dayCount < maxDays) {
    const dateStr = currentDate.toISOString().split('T')[0];
    try {
      const entriesRes = await fetch(`/api/entries?date=${dateStr}`);
      if (entriesRes.ok) {
        const data = await entriesRes.json();
        const dayEntries = (data.entries || []).map((e: any) => ({
          ...e,
          foodId: typeof e.foodId === 'object' ? e.foodId._id : e.foodId,
        }));
        entries.push(...dayEntries);
      }
    } catch (error) {
      console.error(`Error fetching entries for ${dateStr}:`, error);
    }
    currentDate.setDate(currentDate.getDate() + 1);
    dayCount++;
  }

  // Get user info
  const userRes = await fetch('/api/auth/me');
  const userData = userRes.ok ? await userRes.json() : { user: { email: '', name: '' } };

  return {
    version: '1.0',
    exportDate,
    user: {
      email: userData.user?.email || '',
      name: userData.user?.name || '',
    },
    foods,
    entries,
    weights,
    water: waterEntries,
  };
}

/**
 * Download export data as JSON file
 */
export function downloadExport(data: ExportData, filename?: string): void {
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `cal-counter-backup-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Import user data from JSON
 */
export async function importUserData(data: ExportData, userId: string): Promise<{
  foods: number;
  entries: number;
  weights: number;
  water: number;
  errors: string[];
}> {
  const results = {
    foods: 0,
    entries: 0,
    weights: 0,
    water: 0,
    errors: [] as string[],
  };

  // Import foods
  for (const food of data.foods || []) {
    try {
      const res = await fetch('/api/foods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...food,
          _id: undefined, // Let server generate new ID
        }),
      });
      if (res.ok) {
        results.foods++;
      } else {
        results.errors.push(`Error importando alimento: ${food.name}`);
      }
    } catch (error) {
      results.errors.push(`Error importando alimento: ${food.name}`);
    }
  }

  // Import entries
  for (const entry of data.entries || []) {
    try {
      const res = await fetch('/api/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...entry,
          _id: undefined,
        }),
      });
      if (res.ok) {
        results.entries++;
      } else {
        results.errors.push(`Error importando entrada del ${entry.date}`);
      }
    } catch (error) {
      results.errors.push(`Error importando entrada del ${entry.date}`);
    }
  }

  // Import weights
  for (const weight of data.weights || []) {
    try {
      const res = await fetch('/api/weights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: weight.date,
          weightKg: weight.weightKg,
        }),
      });
      if (res.ok) {
        results.weights++;
      } else {
        results.errors.push(`Error importando peso del ${weight.date}`);
      }
    } catch (error) {
      results.errors.push(`Error importando peso del ${weight.date}`);
    }
  }

  // Import water
  for (const waterEntry of data.water || []) {
    try {
      const res = await fetch('/api/water', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: waterEntry.date,
          amountMl: waterEntry.amountMl,
        }),
      });
      if (res.ok) {
        results.water++;
      } else {
        results.errors.push(`Error importando agua del ${waterEntry.date}`);
      }
    } catch (error) {
      results.errors.push(`Error importando agua del ${waterEntry.date}`);
    }
  }

  return results;
}
