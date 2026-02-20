import React, { useState, useEffect } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import './CalendarView.css';

const CalendarView = ({ onDateSelect, history, userLevel, minDate }) => {
    const [date, setDate] = useState(new Date());

    const getTileClassName = ({ date, view }) => {
        if (view === 'month') {
            const dateStr = date.toISOString().split('T')[0];
            const lesson = history.find(l => l.date === dateStr);

            if (lesson) {
                // Color coding based on level
                const levelClasses = {
                    'Beginner': 'tile-beginner',
                    'Intermediate': 'tile-intermediate',
                    'Advanced': 'tile-advanced'
                };
                return `has-lesson ${levelClasses[userLevel] || 'tile-default'} ${lesson.completed ? 'completed' : ''}`;
            }
        }
        return '';
    };

    const handleDateChange = (newDate) => {
        setDate(newDate);
        if (onDateSelect) {
            onDateSelect(newDate);
        }
    };

    return (
        <div className="calendar-container fade-in">
            <Calendar
                onChange={handleDateChange}
                value={date}
                tileClassName={getTileClassName}
                className="custom-calendar"
                maxDate={new Date()}
                minDate={minDate ? new Date(minDate) : null}
            />
            <div className="calendar-legend">
                <div className="legend-item"><span className="dot dot-beginner"></span> Beginner</div>
                <div className="legend-item"><span className="dot dot-intermediate"></span> Intermediate</div>
                <div className="legend-item"><span className="dot dot-advanced"></span> Advanced</div>
            </div>
        </div>
    );
};

export default CalendarView;
