// @ts-nocheck
import { useRef, forwardRef, useImperativeHandle, useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import momentTimezonePlugin from '@fullcalendar/moment-timezone';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { getContrastColor } from '../utils/colorUtils';

const Calendar = forwardRef(({ events, userColor = '#3779e6', timeFormat = '12h', selectable = true, timezone = 'Asia/Kolkata', onEventClick, onDateSelect, onDatesSet, onEventDrop, onEventResize }, ref) => {
  const calendarRef = useRef(/** @type {any} */ (null));
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentView, setCurrentView] = useState('dayGridMonth');
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useImperativeHandle(ref, () => ({
    getApi: () => calendarRef.current?.getApi(),
  }));

  const calendarEvents = events.map((event) => ({
    id: event.id,
    title: event.title,
    start: event.start,
    end: event.end,
    backgroundColor: event.club.color,
    borderColor: event.club.color,
    editable: isMobile ? false : event.editable,
    startEditable: isMobile ? false : event.startEditable,
    durationEditable: isMobile ? false : event.durationEditable,
    resourceEditable: isMobile ? false : event.resourceEditable,
    extendedProps: {
      description: event.description,
      location: event.location,
      club: event.club,
      created_by: event.created_by,
      created_by_name: event.created_by_name,
    },
  }));

  return (
    <div className="flex flex-col relative w-full h-full">
      <style>{`
        .fc-highlight {
          background-color: var(--fc-highlight-color, ${userColor}) !important;
          opacity: 0.35 !important;
          border-radius: 4px !important;
          transition: background-color 0.1s ease;
        }
        .fc-event-mirror,
        .fc .fc-event-mirror {
          box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.95), 0 12px 24px -4px rgba(0,0,0,0.35) !important;
        }
        .calendar-header-datepicker-wrapper {
          width: auto !important;
        }
        
        /* Force DatePicker month grid layout */
        .calendar-header-popup {
          width: 250px !important;
          font-family: inherit !important;
        }
        .calendar-header-popup .react-datepicker__month-container {
          width: 100% !important;
        }
        .calendar-header-popup .react-datepicker__month-wrapper {
          display: flex !important;
          flex-wrap: nowrap !important;
          justify-content: space-evenly !important;
          padding: 0.25rem !important;
        }
        .calendar-header-popup .react-datepicker__month-text {
          flex: 1 1 0px !important;
          width: auto !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          padding: 0.5rem 0 !important;
          margin: 0.125rem !important;
        }
        /* Center DatePicker popup header arrows vertically */
        .calendar-header-popup .react-datepicker__navigation {
          top: 12px !important;
        }
        /* Fix FullCalendar sticky headers overlapping with our custom sticky header on Desktop */
        @media (min-width: 768px) {
          .fc .fc-scrollgrid-section-header.fc-scrollgrid-section-sticky > * {
            top: 65px !important;
            z-index: 30 !important;
          }
          .fc .fc-scrollgrid-section-all-day.fc-scrollgrid-section-sticky > * {
            top: 102px !important; /* 65px custom header + approx 37px day header */
            z-index: 30 !important;
          }
        }
      `}</style>
      
      {/* Mobile Sticky Header (Hidden on Desktop) */}
      <div className="flex md:hidden sticky top-0 z-40 bg-gray-50/95 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-white/5 p-3 mb-4 rounded-xl shadow-sm flex-col items-center gap-3 transition-colors">
        
        {/* Row 1: < Title > */}
        <div className="flex items-center justify-center gap-4 w-full">
          <button 
            onClick={() => calendarRef.current?.getApi()?.prev()}
            className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
          </button>
          
          <div className="text-gray-900 dark:text-white flex items-center justify-center relative">
            <DatePicker
              selected={currentDate}
              onChange={(date) => {
                if (date) calendarRef.current?.getApi()?.gotoDate(date);
              }}
              dateFormat="MMMM yyyy"
              showMonthYearPicker
              popperPlacement="bottom"
              wrapperClassName="calendar-header-datepicker-wrapper"
              calendarClassName="calendar-header-popup"
              customInput={
                <button className="font-bold text-xl flex items-center gap-2 outline-none hover:opacity-80 transition-opacity">
                  {currentDate.toLocaleString('default', { month: 'short', year: 'numeric' })}
                  <svg className="w-4 h-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                </button>
              }
            />
          </div>

          <button 
            onClick={() => calendarRef.current?.getApi()?.next()}
            className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>

        {/* Row 2: Today */}
        <button 
          onClick={() => calendarRef.current?.getApi()?.today()}
          className="px-6 py-1.5 text-sm font-medium rounded-full bg-white dark:bg-gray-900/50 hover:bg-gray-100 dark:hover:bg-gray-800/80 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-white/5 transition-all shadow-sm dark:shadow-none"
        >
          Today
        </button>

        {/* Row 3: Views */}
        <div className="flex bg-white dark:bg-gray-900/50 rounded-lg p-1 border border-gray-200 dark:border-white/5 shadow-sm w-full max-w-[280px]">
          {['dayGridMonth', 'timeGridWeek', 'timeGridDay'].map((view) => (
            <button
              key={view}
              onClick={() => calendarRef.current?.getApi()?.changeView(view)}
              className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all ${currentView === view ? 'bg-primary-50 dark:bg-primary-500/20 text-primary-600 dark:text-primary-400 shadow-sm dark:shadow-none' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 dark:hover:bg-gray-800/50'}`}
            >
              {view === 'dayGridMonth' ? 'Month' : view === 'timeGridWeek' ? 'Week' : 'Day'}
            </button>
          ))}
        </div>
      </div>

      {/* Desktop Sticky Header (Hidden on Mobile) */}
      <div className="hidden md:flex sticky top-0 z-40 bg-gray-50/95 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-white/5 p-4 rounded-xl shadow-sm items-center justify-between gap-4 transition-colors">
        
        {/* Left: Prev/Next/Today */}
        <div className="flex items-center gap-2">
          <div className="flex bg-white dark:bg-gray-900/50 rounded-lg p-1 border border-gray-200 dark:border-white/5 shadow-sm">
            <button 
              onClick={() => calendarRef.current?.getApi()?.prev()}
              className="p-1.5 px-3 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800/50 text-gray-700 dark:text-gray-300 transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
            </button>
            <div className="w-px bg-gray-200 dark:bg-white/5 mx-1"></div>
            <button 
              onClick={() => calendarRef.current?.getApi()?.next()}
              className="p-1.5 px-3 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800/50 text-gray-700 dark:text-gray-300 transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
          <button 
            onClick={() => calendarRef.current?.getApi()?.today()}
            className="px-4 py-1.5 text-sm font-medium rounded-lg bg-white dark:bg-gray-900/50 hover:bg-gray-100 dark:hover:bg-gray-800/80 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-white/5 transition-all shadow-sm dark:shadow-none"
          >
            Today
          </button>
        </div>

        {/* Center: Title / DatePicker */}
        <div className="text-gray-900 dark:text-white flex items-center justify-center relative">
          <DatePicker
            selected={currentDate}
            onChange={(date) => {
              if (date) calendarRef.current?.getApi()?.gotoDate(date);
            }}
            dateFormat="MMMM yyyy"
            showMonthYearPicker
            popperPlacement="bottom"
            wrapperClassName="calendar-header-datepicker-wrapper"
            calendarClassName="calendar-header-popup"
            customInput={
              <button className="font-bold text-2xl flex items-center gap-2 outline-none hover:opacity-80 transition-opacity">
                {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                <svg className="w-5 h-5 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
              </button>
            }
          />
        </div>

        {/* Right: Views */}
        <div className="flex bg-white dark:bg-gray-900/50 rounded-lg p-1 border border-gray-200 dark:border-white/5 shadow-sm">
          {['dayGridMonth', 'timeGridWeek', 'timeGridDay'].map((view) => (
            <button
              key={view}
              onClick={() => calendarRef.current?.getApi()?.changeView(view)}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${currentView === view ? 'bg-primary-50 dark:bg-primary-500/20 text-primary-600 dark:text-primary-400 shadow-sm dark:shadow-none' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 dark:hover:bg-gray-800/50'}`}
            >
              {view === 'dayGridMonth' ? 'Month' : view === 'timeGridWeek' ? 'Week' : 'Day'}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 md:mt-0 pt-0 md:pt-4">
        <FullCalendar
          ref={calendarRef}
      plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, momentTimezonePlugin]}
      timeZone={timezone}
      initialView="dayGridMonth"
      headerToolbar={false}
      events={calendarEvents}
      views={{
        timeGridDay: {
          dayHeaderFormat: { weekday: 'long', month: 'short', day: 'numeric', omitCommas: false }
        }
      }}
      dayMaxEvents={4}
      selectable={isMobile ? false : selectable}
      selectMirror={!isMobile}
      unselectAuto={false}
      selectOverlap={true}
      slotEventOverlap={false}
      editable={!isMobile}
      eventStartEditable={!isMobile}
      eventDurationEditable={!isMobile}
      eventResizableFromStart={!isMobile}
      droppable={!isMobile}
      fixedMirrorParent={typeof document !== 'undefined' ? (document.body || undefined) : undefined}
      eventDragStart={(info) => {
        const color = info.event.backgroundColor || info.event.borderColor || info.event.extendedProps?.club?.color;
        if (color && typeof document !== 'undefined') {
          document.documentElement.style.setProperty('--fc-highlight-color', color);
        }
      }}
      eventDragStop={() => {
        if (typeof document !== 'undefined') {
          document.documentElement.style.removeProperty('--fc-highlight-color');
        }
      }}
      eventResizeStart={(info) => {
        const color = info.event.backgroundColor || info.event.borderColor || info.event.extendedProps?.club?.color;
        if (color && typeof document !== 'undefined') {
          document.documentElement.style.setProperty('--fc-highlight-color', color);
        }
      }}
      eventResizeStop={() => {
        if (typeof document !== 'undefined') {
          document.documentElement.style.removeProperty('--fc-highlight-color');
        }
      }}
      slotLabelFormat={{
        hour: 'numeric',
        minute: '2-digit',
        omitZeroMinute: false,
        meridiem: timeFormat === '12h' ? 'short' : false,
        hour12: timeFormat === '12h'
      }}
      eventTimeFormat={{
        hour: 'numeric',
        minute: '2-digit',
        meridiem: timeFormat === '12h' ? 'short' : false,
        hour12: timeFormat === '12h'
      }}
      eventDrop={(info) => {
        if (typeof document !== 'undefined') {
          document.documentElement.style.removeProperty('--fc-highlight-color');
        }
        if (onEventDrop) onEventDrop(info);
      }}
      eventResize={(info) => {
        if (typeof document !== 'undefined') {
          document.documentElement.style.removeProperty('--fc-highlight-color');
        }
        if (onEventResize) onEventResize(info);
      }}
      select={(info) => {
        const isMonthView = info.view.type === 'dayGridMonth';
        const diffInMs = info.end.getTime() - info.start.getTime();
        const diffInDays = Math.round(diffInMs / (1000 * 60 * 60 * 24));
        
        if (isMonthView && diffInDays <= 1) {
          // This is a single click in month view.
          // The dateClick handler will handle navigating to the day view.
          calendarRef.current?.getApi()?.unselect();
          return;
        }

        if (onDateSelect) {
          onDateSelect(info.start, info.end);
        }
        // Selection is now persisted until manually cleared
      }}
      eventClick={(info) => {
        // Use loose equality (==) because FullCalendar IDs are strings, 
        // but local state IDs might be numbers
        const event = events.find((e) => e.id == info.event.id);
        if (event) onEventClick(event);
      }}
      dateClick={(info) => {
        const calendarApi = calendarRef.current?.getApi();
        if (calendarApi?.view?.type === 'dayGridMonth') {
          calendarApi.changeView('timeGridDay', info.dateStr);
        }
      }}
      datesSet={(dateInfo) => {
        // Find the "middle" date of the view to accurately determine the current month
        // ActiveStart/End might include dates from prev/next months
        const midPointMs = (dateInfo.view.activeStart.getTime() + dateInfo.view.activeEnd.getTime()) / 2;
        setCurrentDate(new Date(midPointMs));
        setCurrentView(dateInfo.view.type);
        if (onDatesSet) {
          onDatesSet(dateInfo.start, dateInfo.end);
        }
      }}
      eventContent={(eventInfo) => {
        const bgColor = eventInfo.event.backgroundColor;
        const textColor = getContrastColor(bgColor);
        if (eventInfo.view.type === 'dayGridMonth') {
          return (
            <div 
              className="px-2 py-0.5 rounded text-xs font-medium truncate w-full text-center"
              style={{ backgroundColor: bgColor, color: textColor }}
            >
              {eventInfo.event.title}
            </div>
          );
        }
        return (
          <div className="p-1 cursor-pointer h-full flex flex-col overflow-hidden">
            <div className="flex justify-between items-start mb-0.5">
              <div className="text-xs font-bold truncate" style={{ color: textColor }}>{eventInfo.timeText}</div>
              {eventInfo.event.extendedProps?.club && (
                <div
                  className="text-[10px] px-1.5 py-0.5 rounded truncate max-w-[55%] font-medium"
                  style={{
                    color: textColor,
                    border: `1px solid ${textColor === '#000000' ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.5)'}`,
                    boxShadow: `0 1px 3px rgba(0,0,0,0.25)`,
                    backgroundColor: textColor === '#000000' ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.15)',
                  }}
                >
                  {eventInfo.event.extendedProps.club.name}
                </div>
              )}
            </div>
            <div className="font-semibold text-xs truncate mb-0.5" style={{ color: textColor }}>{eventInfo.event.title}</div>
            {eventInfo.event.extendedProps?.location && (
              <div className="text-xs truncate mb-0.5" style={{ color: textColor, opacity: 0.85 }}>
                📍 {eventInfo.event.extendedProps.location}
              </div>
            )}
            {eventInfo.event.extendedProps?.description && (
              <div className="text-[10px] truncate" style={{ color: textColor, opacity: 0.75 }}>
                {eventInfo.event.extendedProps.description}
              </div>
            )}
          </div>
        );
      }}
      height="auto"
      slotMinTime="00:00:00"
      slotMaxTime="24:00:00"
      slotDuration="00:30:00"
      snapDuration="00:15:00"
      dragScroll={!isMobile}
      dragRevertDuration={500}
      expandRows={true}
      stickyHeaderDates={true}
      nowIndicator={true}
      longPressDelay={250}
      eventLongPressDelay={250}
        selectLongPressDelay={250}
        />
      </div>
    </div>
  );
});

export default Calendar;
