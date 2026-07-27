import React, { useState, useEffect } from 'react';
import { useFamily } from '../FamilyContext';
import { X } from 'lucide-react';

const BirthdayNotifier = () => {
  const { data } = useFamily();
  const [visible, setVisible] = useState(false);
  const [birthdays, setBirthdays] = useState([]);

  useEffect(() => {
    const today = new Date();
    const todayMonth = today.getMonth() + 1; // 1-12
    const todayDay = today.getDate();

    const todayBirthdays = data.members.filter(member => {
      if (!member.birthDate) return false;
      const date = new Date(member.birthDate);
      // getMonth/getDate from UTC to avoid timezone shifts
      const [year, month, day] = member.birthDate.split('-').map(Number);
      return month === todayMonth && day === todayDay;
    }).map(member => {
      const [year, month, day] = member.birthDate.split('-').map(Number);
      const age = new Date().getFullYear() - year;
      return { name: member.name, age };
    });

    if (todayBirthdays.length > 0) {
      setBirthdays(todayBirthdays);
      setVisible(true);
    }
  }, [data.members]);

  if (!visible || birthdays.length === 0) return null;

  return (
    <div className="birthday-banner" role="alert" aria-live="polite">
      <button className="birthday-close" onClick={() => setVisible(false)} aria-label="Close birthday notification">
        <X size={16} />
      </button>
      <div className="birthday-banner-title">
        🎂 Happy Birthday!
      </div>
      {birthdays.map((b, i) => (
        <div key={i} className="birthday-banner-item">
          🎉 {b.name} turns {b.age} today!
        </div>
      ))}
    </div>
  );
};

export default BirthdayNotifier;
