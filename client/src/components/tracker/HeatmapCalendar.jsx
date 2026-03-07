import React, { useMemo, useState } from 'react';
import {
  startOfDay, parseISO, format,
  eachDayOfInterval, subDays, startOfWeek,
} from 'date-fns';
import './HeatmapCalendar.css';

// lime (#c8f135 = 200,241,53) → coral (#ff6b4a = 255,107,74)
function lerp(t) {
  const r = Math.round(200 + (255 - 200) * t);
  const g = Math.round(241 + (107 - 241) * t);
  const b = Math.round(53  + (74  - 53)  * t);
  return `rgb(${r},${g},${b})`;
}

function cellColor(dayEntries, tracker) {
  if (!dayEntries.length) {
    // quit mode: clean day gets a very subtle lime wash
    return tracker.mode === 'quit' ? 'rgba(200,241,53,0.18)' : null;
  }
  switch (tracker.type) {
    case 'boolean': {
      const did = dayEntries.some(e => e.value === '1');
      if (tracker.mode === 'quit') return did ? '#ff6b4a' : 'rgba(200,241,53,0.28)';
      return did ? '#c8f135' : null;
    }
    case 'scale': {
      const val = Math.max(...dayEntries.map(e => parseInt(e.value) || 0));
      return lerp(val / 10);
    }
    case 'quantity': {
      const total = dayEntries.reduce((s, e) => s + (parseFloat(e.value) || 0), 0);
      const max = tracker.goal_value ? Number(tracker.goal_value) : Math.max(total, 1);
      return lerp(Math.min(total / max, 1));
    }
    default: return '#c8f135';
  }
}

function fmtValue(e, tracker) {
  if (tracker.type === 'boolean') return e.value === '1' ? 'yes ✓' : 'no ✗';
  if (tracker.type === 'scale')   return `${e.value}/10`;
  return e.value || '—';
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function HeatmapCalendar({ entries, tracker }) {
  const [tooltip, setTooltip] = useState(null); // { key, day, entries }

  // Build 13-week grid (91 days back → today), weeks = columns
  const { weeks, monthLabels } = useMemo(() => {
    const today = startOfDay(new Date());
    const start = startOfWeek(subDays(today, 90), { weekStartsOn: 1 });
    const allDays = eachDayOfInterval({ start, end: today });

    const cols = [];
    for (let i = 0; i < allDays.length; i += 7) cols.push(allDays.slice(i, i + 7));

    const labels = [];
    let lastMonth = -1;
    cols.forEach((col, ci) => {
      const m = col[0].getMonth();
      if (m !== lastMonth) { labels.push({ ci, label: format(col[0], 'MMM') }); lastMonth = m; }
    });

    return { weeks: cols, monthLabels: labels };
  }, []);

  // entries → { dateString: entry[] }
  const byDay = useMemo(() => {
    const map = {};
    entries.forEach(e => {
      const k = startOfDay(parseISO(e.logged_at)).toDateString();
      (map[k] = map[k] || []).push(e);
    });
    return map;
  }, [entries]);

  const todayStr = startOfDay(new Date()).toDateString();
  const DAY_LABELS = ['M', '', 'W', '', 'F', '', 'S'];

  function toggleTooltip(key, day, dayEntries) {
    setTooltip(prev => prev?.key === key ? null : { key, day, entries: dayEntries });
  }

  // Legend cells
  const legendStops = [0, 0.25, 0.5, 0.75, 1].map(t => {
    if (tracker.type === 'boolean') {
      if (tracker.mode === 'quit') return t === 0 ? 'rgba(200,241,53,0.18)' : `rgba(255,107,74,${t})`;
      return t === 0 ? 'var(--surface-2)' : `rgba(200,241,53,${t})`;
    }
    return t === 0 ? 'var(--surface-2)' : lerp(t);
  });

  return (
    <div className="heatmap">
      {/* Month labels */}
      <div className="heatmap-top">
        <div className="hm-day-spacer" />
        <div className="hm-month-row">
          {weeks.map((_, ci) => (
            <div key={ci} className="hm-month-slot">
              {monthLabels.find(m => m.ci === ci)?.label ?? ''}
            </div>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="heatmap-body">
        <div className="hm-day-labels">
          {DAY_LABELS.map((d, i) => <div key={i} className="hm-day-label">{d}</div>)}
        </div>
        <div className="hm-cols">
          {weeks.map((col, ci) => (
            <div key={ci} className="hm-col">
              {col.map((day, di) => {
                const key = day.toDateString();
                const dayEntries = byDay[key] || [];
                const bg = cellColor(dayEntries, tracker);
                const isToday = key === todayStr;
                const isFuture = day > new Date();

                return (
                  <div
                    key={di}
                    className={`hm-cell${isToday ? ' today' : ''}${isFuture ? ' future' : ''}${dayEntries.length ? ' has-entry' : ''}`}
                    style={{
                      background: isFuture ? 'transparent' : (bg || 'var(--surface-2)'),
                      boxShadow: isToday ? '0 0 0 1.5px var(--text-muted)' : undefined,
                    }}
                    onClick={() => !isFuture && toggleTooltip(key, day, dayEntries)}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Tap tooltip */}
      {tooltip && (
        <div className="hm-tooltip">
          <span className="hm-tooltip-date">{format(tooltip.day, 'EEE, MMM d')}</span>
          {tooltip.entries.length === 0
            ? <span className="hm-tooltip-empty">nothing logged</span>
            : tooltip.entries.map((e, i) => (
                <span key={i} className="hm-tooltip-val">
                  {fmtValue(e, tracker)}
                  {e.notes && <span className="hm-tooltip-note"> · {e.notes}</span>}
                </span>
              ))
          }
        </div>
      )}

      {/* Legend */}
      <div className="hm-legend">
        <span>{tracker.mode === 'quit' ? 'clean' : 'less'}</span>
        {legendStops.map((bg, i) => <div key={i} className="hm-cell" style={{ background: bg }} />)}
        <span>{tracker.mode === 'quit' ? 'relapsed' : 'more'}</span>
      </div>
    </div>
  );
}
