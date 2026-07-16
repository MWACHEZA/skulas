import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  isSameMonth, 
  isSameDay, 
  addDays,
  parseISO
} from 'date-fns';
import api from '../../../../lib/api';

interface NoticeboardEvent {
  id: string;
  title: string;
  content: string;
  date: string;
}

export default function NoticeboardSettings() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'month' | 'week' | 'day'>('month');
  const [events, setEvents] = useState<NoticeboardEvent[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const { register, handleSubmit, reset } = useForm();

  useEffect(() => {
    fetchEvents();
  }, [currentDate]);

  const fetchEvents = async () => {
    try {
      const response = await api.get('/api/website-settings/noticeboard');
      setEvents(response.data);
    } catch (error) {
      console.error('Failed to fetch noticeboard events', error);
    
    }
  };

  const nextMonth = () => {
    if (view === 'month') setCurrentDate(addMonths(currentDate, 1));
    else if (view === 'week') setCurrentDate(addDays(currentDate, 7));
    else setCurrentDate(addDays(currentDate, 1));
  };
  const prevMonth = () => {
    if (view === 'month') setCurrentDate(subMonths(currentDate, 1));
    else if (view === 'week') setCurrentDate(addDays(currentDate, -7));
    else setCurrentDate(addDays(currentDate, -1));
  };
  const today = () => setCurrentDate(new Date());

  const onSubmit = async (data: any) => {
    try {
      const payload = {
        ...data,
        date: selectedDate ? selectedDate.toISOString() : new Date().toISOString()
      };
      await api.post('/api/website-settings/noticeboard', payload);
      toast.success('Event added to noticeboard!');
      setIsModalOpen(false);
      reset();
      fetchEvents();
    } catch (error) {
      console.error('Failed to add event', error);
      toast.error('Failed to add event.');
    }
  };

  const deleteEvent = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!(await toastConfirm('Delete this event?'))) return;
    try {
      await api.delete(`/api/website-settings/noticeboard/${id}`);
      fetchEvents();
    } catch (error) {
      console.error('Failed to delete event', error);
    
    }
  };

  const openAddModal = (date: Date) => {
    setSelectedDate(date);
    setIsModalOpen(true);
  };

  const renderHeader = () => {
    const getHeaderText = () => {
      if (view === 'day') {
        return format(currentDate, "MMMM d, yyyy");
      }
      if (view === 'week') {
        const start = startOfWeek(currentDate);
        const end = endOfWeek(currentDate);
        return `${format(start, "MMM d")} - ${format(end, "MMM d, yyyy")}`;
      }
      return format(currentDate, "MMMM yyyy");
    };

    return (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '15px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button onClick={prevMonth} className="portal-btn-secondary" style={{ padding: '6px 12px', background: '#e2e8f0', color: '#475569', border: 'none' }}>
            <i className="fas fa-chevron-left"></i>
          </button>
          <button onClick={nextMonth} className="portal-btn-secondary" style={{ padding: '6px 12px', background: '#e2e8f0', color: '#475569', border: 'none' }}>
            <i className="fas fa-chevron-right"></i>
          </button>
          <button onClick={today} className="portal-btn-secondary" style={{ padding: '6px 16px', background: 'var(--portal-primary)', color: 'white', border: 'none' }}>
            Today
          </button>
        </div>
        <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1e293b', textTransform: 'uppercase' }}>
          {getHeaderText()}
        </div>
        <div style={{ display: 'flex', gap: '4px', background: '#f1f5f9', padding: '4px', borderRadius: '8px' }}>
          <button 
            className="portal-btn-secondary" 
            style={{ 
              padding: '4px 12px', 
              background: view === 'month' ? 'var(--portal-primary)' : 'transparent', 
              color: view === 'month' ? 'white' : '#64748b', 
              border: 'none', 
              fontSize: '0.8rem',
              borderRadius: '6px'
            }}
            onClick={() => setView('month')}
          >
            Month
          </button>
          <button 
            className="portal-btn-secondary" 
            style={{ 
              padding: '4px 12px', 
              background: view === 'week' ? 'var(--portal-primary)' : 'transparent', 
              color: view === 'week' ? 'white' : '#64748b', 
              border: 'none', 
              fontSize: '0.8rem',
              borderRadius: '6px'
            }}
            onClick={() => setView('week')}
          >
            Week
          </button>
          <button 
            className="portal-btn-secondary" 
            style={{ 
              padding: '4px 12px', 
              background: view === 'day' ? 'var(--portal-primary)' : 'transparent', 
              color: view === 'day' ? 'white' : '#64748b', 
              border: 'none', 
              fontSize: '0.8rem',
              borderRadius: '6px'
            }}
            onClick={() => setView('day')}
          >
            Day
          </button>
        </div>
      </div>
    );
  };

  const renderDays = () => {
    if (view === 'day') {
      return (
        <div style={{ textAlign: 'center', fontWeight: 'bold', padding: '10px 0', color: 'white', backgroundColor: 'var(--portal-primary)', textTransform: 'uppercase', fontSize: '0.85rem' }}>
          {format(currentDate, "EEEE")}
        </div>
      );
    }
    const days = [];
    const startDate = startOfWeek(currentDate);
    for (let i = 0; i < 7; i++) {
      days.push(
        <div style={{ textAlign: 'center', fontWeight: 'bold', padding: '10px 0', color: 'white', backgroundColor: 'var(--portal-primary)', textTransform: 'uppercase', fontSize: '0.75rem' }} key={i}>
          {format(addDays(startDate, i), "EEE")}
        </div>
      );
    }
    return <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', border: '1px solid #e2e8f0', borderBottom: 'none' }}>{days}</div>;
  };

  const renderCells = () => {
    if (view === 'day') {
      const dayEvents = events.filter(e => isSameDay(parseISO(e.date), currentDate));
      const isCurrentDay = isSameDay(currentDate, new Date());
      return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', borderLeft: '1px solid #e2e8f0' }}>
          <div
            style={{
               minHeight: '200px',
               padding: '20px',
               borderRight: '1px solid #e2e8f0',
               borderBottom: '1px solid #e2e8f0',
               position: 'relative',
               backgroundColor: isCurrentDay ? 'rgba(0, 86, 179, 0.05)' : '#ffffff',
               color: '#334155',
               cursor: 'pointer',
            }}
            onClick={() => openAddModal(currentDate)}
          >
            <span style={{
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'var(--portal-primary)',
              color: 'white',
              borderRadius: '50%',
              fontSize: '1rem',
              fontWeight: 'bold'
            }}>
              {format(currentDate, "d")}
            </span>
            <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {dayEvents.map(event => (
                <div key={event.id} style={{
                  fontSize: '0.85rem',
                  padding: '8px 12px',
                  backgroundColor: 'var(--portal-primary)',
                  color: 'white',
                  borderRadius: '6px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <div>
                    <strong style={{ display: 'block', marginBottom: '2px' }}>{event.title}</strong>
                    <span style={{ fontSize: '0.75rem', opacity: 0.9 }}>{event.content}</span>
                  </div>
                  <i 
                    className="fas fa-times"
                    style={{ cursor: 'pointer', opacity: 0.8 }}
                    onClick={(e) => deleteEvent(event.id, e)}
                  ></i>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = view === 'month' ? startOfWeek(monthStart) : startOfWeek(currentDate);
    const endDate = view === 'month' ? endOfWeek(monthEnd) : endOfWeek(currentDate);

    const rows = [];
    let days = [];
    let day = startDate;
    let formattedDate = "";

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        formattedDate = format(day, "d");
        const cloneDay = day;
        
        // Find events for this day
        const dayEvents = events.filter(e => isSameDay(parseISO(e.date), cloneDay));
        const isCurrentMonth = view === 'week' ? true : isSameMonth(day, monthStart);
        const isCurrentDay = isSameDay(day, new Date());

        days.push(
          <div
            style={{
              minHeight: '120px',
              padding: '10px',
              borderRight: '1px solid #e2e8f0',
              borderBottom: '1px solid #e2e8f0',
              position: 'relative',
              backgroundColor: !isCurrentMonth ? '#f8fafc' : isCurrentDay ? 'rgba(0, 86, 179, 0.05)' : '#ffffff',
              color: !isCurrentMonth ? '#94a3b8' : isCurrentDay ? 'var(--portal-primary)' : '#334155',
              cursor: 'pointer',
              transition: 'background-color 0.2s'
            }}
            key={day.toString()}
            onClick={() => openAddModal(cloneDay)}
          >
            <span style={isCurrentDay ? {
              width: '24px',
              height: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'var(--portal-primary)',
              color: 'white',
              borderRadius: '50%',
              fontSize: '0.8rem',
              fontWeight: 'bold'
            } : { fontSize: '0.85rem' }}>
              {formattedDate}
            </span>
            
            <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {dayEvents.map(event => (
                <div key={event.id} style={{
                  fontSize: '0.75rem',
                  padding: '4px 8px',
                  backgroundColor: 'var(--portal-primary)',
                  color: 'white',
                  borderRadius: '4px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }} title={event.title}>{event.title}</span>
                  <i 
                    className="fas fa-times"
                    style={{ cursor: 'pointer', opacity: 0.8 }}
                    onClick={(e) => deleteEvent(event.id, e)}
                  ></i>
                </div>
              ))}
            </div>
          </div>
        );
        day = addDays(day, 1);
      }
      rows.push(
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderLeft: '1px solid #e2e8f0' }} key={day.toString()}>
          {days}
        </div>
      );
      days = [];
    }
    return <div>{rows}</div>;
  };

  return (
    <div className="portal-card">
      <div className="portal-card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <i className="far fa-calendar-alt text-gray-500"></i> School Noticeboard
        </h3>
        <button 
          onClick={() => openAddModal(new Date())}
          className="portal-btn-primary"
          style={{ background: 'var(--portal-success)', borderColor: 'var(--portal-success)', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <i className="fas fa-plus"></i> Add Notice
        </button>
      </div>
      
      <div className="portal-card-body" style={{ padding: '24px' }}>
        {renderHeader()}
        <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
          {renderDays()}
          {renderCells()}
        </div>
      </div>

      {isModalOpen && (
        <div className="portal-modal-overlay">
          <div className="portal-modal-card" style={{ maxWidth: '450px' }}>
            <div className="portal-modal-header">
              <div className="header-titles">
                <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: 0 }}>Add Notice for {selectedDate && format(selectedDate, 'MMM d, yyyy')}</h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#a0aec0' }}>
                &times;
              </button>
            </div>
            <div className="portal-modal-body">
              <form onSubmit={handleSubmit(onSubmit)}>
                <div className="portal-form-group" style={{ marginBottom: '16px' }}>
                  <label className="portal-label">Title <span style={{ color: 'red' }}>*</span></label>
                  <input
                    {...register('title', { required: true })}
                    type="text"
                    className="portal-input"
                    placeholder="Notice title..."
                  />
                </div>
                <div className="portal-form-group" style={{ marginBottom: '20px' }}>
                  <label className="portal-label">Content <span style={{ color: 'red' }}>*</span></label>
                  <textarea
                    {...register('content', { required: true })}
                    rows={4}
                    className="portal-input"
                    placeholder="Notice content..."
                  ></textarea>
                </div>
                <div style={{ display: 'flex', gap: '15px', marginTop: '25px' }}>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="portal-btn-ghost"
                    style={{ flex: 1, padding: '10px' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="portal-btn-primary"
                    style={{ flex: 1, padding: '10px' }}
                  >
                    Save Notice
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
