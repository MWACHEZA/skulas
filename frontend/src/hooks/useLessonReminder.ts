import { useEffect, useState } from 'react';
import api from '../lib/api';
import { useToast } from '../context/ToastContext';

export const useLessonReminder = (role: string | undefined) => {
  const [slots, setSlots] = useState<any[]>([]);
  const { showToast } = useToast();

  useEffect(() => {
    if (role === 'STUDENT' || role === 'TEACHER') {
      fetchSlots();
    }
  }, [role]);

  useEffect(() => {
    if (slots.length === 0) return;

    const interval = setInterval(() => {
      checkReminders();
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [slots]);

  const fetchSlots = async () => {
    try {
      const { data } = await api.get('/api/timetable/my');
      setSlots(data);
    } catch (err) {
      console.error('Failed to fetch reminders');
    }
  };

  const checkReminders = () => {
    const now = new Date();
    const currentDay = now.getDay(); // 0=Sun, 1=Mon ... 5=Fri
    if (currentDay === 0 || currentDay === 6) return; // No school on weekends

    const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    // Find slot starting in exactly 5 minutes
    const reminderTime = new Date(now.getTime() + 5 * 60000);
    const reminderTimeStr = `${String(reminderTime.getHours()).padStart(2, '0')}:${String(reminderTime.getMinutes()).padStart(2, '0')}`;

    const nextSlot = slots.find(s => s.dayOfWeek === currentDay && s.startTime === reminderTimeStr);

    if (nextSlot) {
      const msg = role === 'TEACHER' 
        ? `Reminder: Your ${nextSlot.subject?.name} lesson for ${nextSlot.class?.name} starts in 5 minutes!`
        : `Incoming: ${nextSlot.subject?.name} starts in 5 minutes!`;
      
      showToast(msg, 'info');
    }
  };
};
