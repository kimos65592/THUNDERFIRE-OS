import { useState, useEffect } from 'react';

export const translations = {
  en: {
    title: "ThunderFire AI",
    chatPlaceholder: "Type your message or ask to build something...",
    send: "Send",
    listening: "Listening...",
    speak: "Speak",
    reminders: "Reminders",
    settings: "Settings",
    autoSpeak: "AI Voice Output",
    personality: "Personality",
    language: "Language",
    addReminder: "Add Reminder",
    reminderText: "What should I remind you about?",
    reminderTime: "When?",
    memorySaved: "Memory updated",
    openYoutube: "Opening YouTube...",
    searchGoogle: "Searching Google for: "
  },
  ar: {
    title: "ثاندر فاير (ThunderFire)",
    chatPlaceholder: "اكتب رسالتك هنا...",
    send: "إرسال",
    listening: "جاري الاستماع...",
    speak: "تحدث",
    reminders: "التذكيرات",
    settings: "الإعدادات",
    autoSpeak: "صوت الذكاء الاصطناعي",
    personality: "الشخصية",
    language: "اللغة",
    addReminder: "إضافة تذكير",
    reminderText: "بماذا تريد أن أذكرك؟",
    reminderTime: "متى؟",
    memorySaved: "تم تحديث الذاكرة",
    openYoutube: "جاري فتح يوتيوب...",
    searchGoogle: "جاري البحث في جوجل عن: "
  }
};

export type Language = 'en' | 'ar';
