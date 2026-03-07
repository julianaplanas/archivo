import { parseISO, startOfDay, differenceInCalendarDays } from 'date-fns';

export function computeStreak(entries, tracker) {
  if (!entries?.length) {
    if (tracker.mode === 'quit') {
      return Math.max(0, differenceInCalendarDays(new Date(), parseISO(tracker.created_at)));
    }
    return 0;
  }

  if (tracker.mode === 'quit') {
    const last = [...entries].sort((a, b) => new Date(b.logged_at) - new Date(a.logged_at))[0];
    return differenceInCalendarDays(new Date(), parseISO(last.logged_at));
  }

  // do_it / track_only: consecutive days with at least one entry
  const logged = new Set(entries.map(e => startOfDay(parseISO(e.logged_at)).toDateString()));

  let streak = 0;
  let date = startOfDay(new Date());

  // If today not logged yet, start from yesterday (don't break streak mid-day)
  if (!logged.has(date.toDateString())) {
    date = new Date(date.getTime() - 86_400_000);
  }

  while (logged.has(date.toDateString())) {
    streak++;
    date = new Date(date.getTime() - 86_400_000);
  }

  return streak;
}

export function isLoggedToday(entries) {
  const today = startOfDay(new Date()).toDateString();
  return (entries || []).some(e => startOfDay(parseISO(e.logged_at)).toDateString() === today);
}

export function getMilestone(streak) {
  return [7, 14, 30, 60, 90].find(m => m === streak) || null;
}
