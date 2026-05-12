import { useState, useEffect } from 'react';

export function useMemory<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : initialValue;
  });

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue] as const;
}

export function useReminders() {
  const [reminders, setReminders] = useMemory<Array<{ id: string; text: string; time: string; notified: boolean }>>('tf_reminders', []);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      reminders.forEach(reminder => {
        const reminderTime = new Date(reminder.time);
        if (!reminder.notified && reminderTime <= now) {
          showNotification(reminder.text);
          setReminders(prev => prev.map(r => r.id === reminder.id ? { ...r, notified: true } : r));
        }
      });
    }, 10000);

    return () => clearInterval(interval);
  }, [reminders]);

  const showNotification = (text: string) => {
    if (Notification.permission === "granted") {
      new Notification("ThunderFire Reminder", { body: text });
    } else if (Notification.permission !== "denied") {
      Notification.requestPermission().then(permission => {
        if (permission === "granted") {
          new Notification("ThunderFire Reminder", { body: text });
        }
      });
    }
  };

  const addReminder = (text: string, time: string) => {
    setReminders(prev => [...prev, { id: Date.now().toString(), text, time, notified: false }]);
  };

  const removeReminder = (id: string) => {
    setReminders(prev => prev.filter(r => r.id !== id));
  };

  return { reminders, addReminder, removeReminder };
}
