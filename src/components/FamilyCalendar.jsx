import React, { useState, useMemo } from 'react';
import { useFamily } from '../FamilyContext';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Gift, Heart, X, Clock } from 'lucide-react';

const eventColors = {
  birthday: '#45b7ae',
  anniversary: '#e0899a',
  death: '#94a3b8',
};

const FamilyCalendar = ({ onClose, onSelectMember }) => {
  const { data } = useFamily();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('month'); // 'month' | 'upcoming'

  // Extract all calendar events from members data
  const events = useMemo(() => {
    const list = [];
    data.members.forEach(m => {
      if (m.birthDate) {
        const [y, month, day] = m.birthDate.split('-').map(Number);
        list.push({
          id: `bday-${m.id}`,
          memberId: m.id,
          title: `${m.name}'s Birthday 🎂`,
          type: 'birthday',
          month,
          day,
          originalYear: y,
          member: m,
        });
      }
      if (m.deathDate) {
        const [y, month, day] = m.deathDate.split('-').map(Number);
        list.push({
          id: `death-${m.id}`,
          memberId: m.id,
          title: `In Memory of ${m.name} ⚰️`,
          type: 'death',
          month,
          day,
          originalYear: y,
          member: m,
        });
      }
    });

    // Detect spouse anniversaries
    data.relations.filter(r => r.type === 'spouse').forEach(r => {
      const m1 = data.members.find(m => m.id === r.source);
      const m2 = data.members.find(m => m.id === r.target);
      if (m1 && m2) {
        // If either has a date, or use placeholder
        list.push({
          id: `anniv-${r.id}`,
          memberId: m1.id,
          title: `${m1.name} & ${m2.name}'s Anniversary 💍`,
          type: 'anniversary',
          month: 1, // Default or generic indicator if date missing
          day: 1,
          member: m1,
        });
      }
    });

    return list;
  }, [data]);

  // Month navigation helpers
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0 = Sun

  const changeMonth = (delta) => {
    setCurrentDate(new Date(year, month + delta, 1));
  };

  // Get events for specific day in current month
  const getEventsForDay = (d) => {
    return events.filter(e => e.month === month + 1 && e.day === d);
  };

  // Get upcoming 30 days events
  const upcomingEvents = useMemo(() => {
    const today = new Date();
    const tMonth = today.getMonth() + 1;
    const tDay = today.getDate();

    return events.map(e => {
      let daysDiff = (e.month - tMonth) * 30 + (e.day - tDay);
      if (daysDiff < 0) daysDiff += 365;
      return { ...e, daysDiff };
    }).sort((a, b) => a.daysDiff - b.daysDiff).slice(0, 10);
  }, [events]);

  const todayObj = new Date();
  const isToday = (d) => year === todayObj.getFullYear() && month === todayObj.getMonth() && d === todayObj.getDate();

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(10, 18, 35, 0.85)',
      backdropFilter: 'blur(12px)',
      zIndex: 1100,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24,
    }}>
      <div className="glass" style={{
        width: '100%', maxWidth: 850,
        height: '85vh',
        display: 'flex', flexDirection: 'column',
        borderRadius: 24,
        overflow: 'hidden',
        border: '1px solid rgba(69, 183, 174, 0.3)',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid rgba(69, 183, 174, 0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'rgba(69, 183, 174, 0.08)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <CalendarIcon size={24} color="var(--accent-color)" />
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              Family Calendar & Anniversaries
            </h2>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ display: 'flex', background: 'rgba(15, 23, 42, 0.6)', borderRadius: 10, padding: 3, border: '1px solid rgba(69,183,174,0.2)' }}>
              <button
                onClick={() => setViewMode('month')}
                style={{
                  padding: '6px 14px', borderRadius: 8, border: 'none',
                  background: viewMode === 'month' ? 'var(--accent-color)' : 'transparent',
                  color: viewMode === 'month' ? 'white' : 'var(--text-secondary)',
                  fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer',
                }}
              >
                Month View
              </button>
              <button
                onClick={() => setViewMode('upcoming')}
                style={{
                  padding: '6px 14px', borderRadius: 8, border: 'none',
                  background: viewMode === 'upcoming' ? 'var(--accent-color)' : 'transparent',
                  color: viewMode === 'upcoming' ? 'white' : 'var(--text-secondary)',
                  fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer',
                }}
              >
                Upcoming
              </button>
            </div>

            <button onClick={onClose} className="btn-icon" style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content Body */}
        {viewMode === 'month' ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 20, overflowY: 'auto' }}>
            {/* Controls */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                {monthNames[month]} {year}
              </h3>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => changeMonth(-1)} className="btn-icon" style={{ padding: '6px 12px', background: 'rgba(69,183,174,0.1)', border: '1px solid rgba(69,183,174,0.3)', borderRadius: 8, color: 'var(--accent-color)', cursor: 'pointer' }}>
                  <ChevronLeft size={18} />
                </button>
                <button onClick={() => setCurrentDate(new Date())} style={{ padding: '6px 12px', background: 'rgba(69,183,174,0.1)', border: '1px solid rgba(69,183,174,0.3)', borderRadius: 8, color: 'var(--accent-color)', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}>
                  Today
                </button>
                <button onClick={() => changeMonth(1)} className="btn-icon" style={{ padding: '6px 12px', background: 'rgba(69,183,174,0.1)', border: '1px solid rgba(69,183,174,0.3)', borderRadius: 8, color: 'var(--accent-color)', cursor: 'pointer' }}>
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>

            {/* Calendar Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6, flex: 1 }}>
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} style={{ textAlign: 'center', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', padding: '6px 0' }}>
                  {day}
                </div>
              ))}

              {/* Empty padding cells */}
              {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                <div key={`empty-${i}`} style={{ background: 'rgba(255,255,255,0.01)', borderRadius: 10, minHeight: 80 }} />
              ))}

              {/* Day cells */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const dayNum = i + 1;
                const dayEvents = getEventsForDay(dayNum);
                const currentToday = isToday(dayNum);

                return (
                  <div
                    key={dayNum}
                    style={{
                      background: currentToday ? 'rgba(69, 183, 174, 0.12)' : 'rgba(255,255,255,0.02)',
                      border: currentToday ? '2px solid var(--accent-color)' : '1px solid rgba(255,255,255,0.05)',
                      borderRadius: 10,
                      padding: 6,
                      minHeight: 80,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4,
                      overflow: 'hidden',
                    }}
                  >
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: currentToday ? 'var(--accent-color)' : 'var(--text-secondary)' }}>
                      {dayNum}
                    </span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3, overflowY: 'auto' }}>
                      {dayEvents.map(evt => (
                        <div
                          key={evt.id}
                          onClick={() => { onSelectMember(evt.memberId); onClose(); }}
                          title={evt.title}
                          style={{
                            background: eventColors[evt.type] + '25',
                            borderLeft: `3px solid ${eventColors[evt.type]}`,
                            borderRadius: 4,
                            padding: '2px 4px',
                            fontSize: '0.68rem',
                            fontWeight: 600,
                            color: 'var(--text-primary)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            cursor: 'pointer',
                          }}
                        >
                          {evt.title}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* Upcoming list view */
          <div style={{ flex: 1, padding: 24, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 8px' }}>
              Next Upcoming Events
            </h3>
            {upcomingEvents.length === 0 ? (
              <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: 40 }}>No upcoming events found</div>
            ) : (
              upcomingEvents.map(evt => (
                <div
                  key={evt.id}
                  onClick={() => { onSelectMember(evt.memberId); onClose(); }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 18px',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(69,183,174,0.15)',
                    borderRadius: 14,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{
                      width: 42, height: 42, borderRadius: '50%',
                      background: eventColors[evt.type] + '20',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: eventColors[evt.type],
                    }}>
                      {evt.type === 'birthday' && <Gift size={20} />}
                      {evt.type === 'anniversary' && <Heart size={20} />}
                      {evt.type === 'death' && <Heart size={20} />}
                    </div>
                    <div>
                      <div style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {evt.title}
                      </div>
                      <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                        {monthNames[evt.month - 1]} {evt.day}
                      </div>
                    </div>
                  </div>

                  <div style={{
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    color: evt.daysDiff === 0 ? '#45b7ae' : 'var(--text-secondary)',
                    background: evt.daysDiff === 0 ? 'rgba(69,183,174,0.15)' : 'rgba(255,255,255,0.05)',
                    padding: '4px 12px',
                    borderRadius: 20,
                  }}>
                    {evt.daysDiff === 0 ? 'Today 🎉' : `In ${evt.daysDiff} days`}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default FamilyCalendar;
