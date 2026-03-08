import React, { useState, useMemo } from 'react';
import { parseISO } from 'date-fns';
import './SharedTrackerCalendar.css';

const DAY_NAMES = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export default function SharedTrackerCalendar({ trackers, entriesMap }) {
  const [selectedDay, setSelectedDay] = useState(null);
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const today = now.getDate();

  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const trackerById = useMemo(
    () => Object.fromEntries(trackers.map(t => [String(t.id), t])),
    [trackers]
  );

  // dayMap: "YYYY-MM-DD" -> Set of tracker ids logged that day (deduped)
  const dayMap = useMemo(() => {
    const map = {};
    for (const [trackerId, entries] of Object.entries(entriesMap)) {
      const tracker = trackerById[String(trackerId)];
      if (!tracker) continue;
      for (const entry of entries) {
        const d = parseISO(entry.logged_at);
        if (d.getFullYear() !== year || d.getMonth() !== month) continue;
        const key = d.getDate();
        if (!map[key]) map[key] = new Map();
        map[key].set(tracker.id, tracker);
      }
    }
    return map;
  }, [entriesMap, trackerById, year, month]);

  const cells = [];
  for (let i = 0; i < firstDayOfWeek; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const selectedTrackers = selectedDay ? [...(dayMap[selectedDay]?.values() ?? [])] : [];

  return (
    <div className="shared-cal">
      <div className="shared-cal-month">
        {new Date(year, month).toLocaleString('default', { month: 'long', year: 'numeric' })}
      </div>
      <div className="shared-cal-daynames">
        {DAY_NAMES.map(d => <div key={d} className="shared-cal-dayname">{d}</div>)}
      </div>
      <div className="shared-cal-grid">
        {cells.map((d, i) => {
          if (!d) return <div key={i} className="shared-cal-cell empty" />;
          const dayTrackers = dayMap[d] ? [...dayMap[d].values()] : [];
          const isToday = d === today;
          const isSelected = d === selectedDay;
          return (
            <div
              key={i}
              className={`shared-cal-cell ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}`}
              onClick={() => setSelectedDay(isSelected ? null : d)}
            >
              <span className="shared-cal-num">{d}</span>
              {dayTrackers.length > 0 && (
                <div className="shared-cal-dots">
                  {dayTrackers.slice(0, 5).map(t => (
                    <span key={t.id} className="shared-cal-dot" style={{ background: t.color }} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {selectedDay && (
        <div className="shared-cal-summary">
          <div className="shared-cal-summary-date">
            {new Date(year, month, selectedDay).toLocaleDateString('en-US', {
              weekday: 'short', month: 'short', day: 'numeric',
            })}
          </div>
          {selectedTrackers.length === 0 ? (
            <div className="shared-cal-summary-empty">nothing logged</div>
          ) : (
            <div className="shared-cal-summary-items">
              {selectedTrackers.map(t => (
                <div key={t.id} className="shared-cal-summary-item">
                  <span className="shared-cal-summary-dot" style={{ background: t.color }} />
                  <span>{t.emoji} {t.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
