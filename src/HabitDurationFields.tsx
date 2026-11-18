import { addDays, addMonths, formatDay, isDay, type Day } from './domain';

export type HabitDuration =
  | { type: 'ongoing' }
  | { type: 'period'; amount: number; unit: 'days' | 'weeks' | 'months' }
  | { type: 'date'; endDate: Day };

export function durationEndDate(duration: HabitDuration, startDate: Day): Day | undefined {
  if (duration.type === 'ongoing') return undefined;
  if (duration.type === 'date') return duration.endDate;
  if (!isDay(startDate) || !Number.isInteger(duration.amount) || duration.amount < 1 || duration.amount > 3650) return '';
  const after = duration.unit === 'months'
    ? addMonths(startDate, duration.amount)
    : addDays(startDate, duration.amount * (duration.unit === 'weeks' ? 7 : 1));
  return isDay(after) ? addDays(after, -1) : '';
}

export function HabitResearch() {
  return <details className="habit-research">
    <summary>How long does a habit take?</summary>
    <p>Habits can take weeks or months to feel automatic. A 2024 review found median estimates of 59–66 days in studies that timed habit formation, with wide variation between people and behaviours.</p>
    <p>Gym routines can take months, and findings from daily habits cannot predict an exact timeline for a twice-weekly goal. Repeating the behaviour in a familiar context can help. Use your end date as a check-in: see what feels easier and extend the plan if it still helps.</p>
    <p className="habit-research-sources"><a href="https://doi.org/10.3390/healthcare12232488" target="_blank" rel="noreferrer">2024 review</a><span aria-hidden="true"> · </span><a href="https://doi.org/10.1073/pnas.2216115120" target="_blank" rel="noreferrer">Gym attendance study (2023)</a></p>
  </details>;
}

export function HabitDurationFields({ value, onChange, startDate, minimumEnd = startDate, research = true }: { value: HabitDuration; onChange: (value: HabitDuration) => void; startDate: Day; minimumEnd?: Day; research?: boolean }) {
  const endDate = durationEndDate(value, startDate);
  return <div className="duration-fields">
    <label>Duration<select aria-label="Duration" value={value.type} onChange={event => onChange(event.target.value === 'ongoing' ? { type: 'ongoing' } : event.target.value === 'period' ? { type: 'period', amount: 3, unit: 'months' } : { type: 'date', endDate: endDate || minimumEnd })}>
      <option value="ongoing">Ongoing — no end date</option>
      <option value="period">For a set time</option>
      <option value="date">Until a date</option>
    </select></label>
    {value.type === 'period' && <div className="form-columns">
      <label>How long?<input type="number" min="1" max="3650" required value={value.amount} onChange={event => onChange({ ...value, amount: Number(event.target.value) })} /></label>
      <label>Period<select aria-label="Period" value={value.unit} onChange={event => onChange({ ...value, unit: event.target.value as 'days' | 'weeks' | 'months' })}>
        <option value="days">Days</option><option value="weeks">Weeks</option><option value="months">Months</option>
      </select></label>
    </div>}
    {value.type === 'date' && <label>End date<input type="date" required min={minimumEnd} value={value.endDate} onChange={event => onChange({ type: 'date', endDate: event.target.value })} /></label>}
    {endDate && isDay(endDate) && isDay(startDate) && <p className="duration-preview">Through {formatDay(endDate, { month: 'short', day: 'numeric', year: 'numeric' })}<small>From {formatDay(startDate, { month: 'short', day: 'numeric', year: 'numeric' })}, including the last day. Pauses keep the same end date.</small></p>}
    {research && <HabitResearch />}
  </div>;
}
