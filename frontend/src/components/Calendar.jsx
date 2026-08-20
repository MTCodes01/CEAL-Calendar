import { useRef, forwardRef, useImperativeHandle } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import momentTimezonePlugin from '@fullcalendar/moment-timezone';
import { getContrastColor } from '../utils/colorUtils';

const Calendar = forwardRef(({ events, userColor = '#3779e6', timeFormat = '12h', selectable = true, timezone = 'Asia/Kolkata', onEventClick, onDateSelect, onDatesSet, onEventDrop, onEventResize }, ref) => {
  const calendarRef = useRef(null);


  useImperativeHandle(ref, () => ({
    getApi: () => calendarRef.current.getApi(),
  }));

  const calendarEvents = events.map((event) => ({
    id: event.id,
    title: event.title,
    start: event.start,
    end: event.end,
    backgroundColor: event.club.color,
    borderColor: event.club.color,
    editable: event.editable,
    startEditable: event.startEditable,
    durationEditable: event.durationEditable,
    resourceEditable: event.resourceEditable,
    extendedProps: {
      description: event.description,
      location: event.location,
      club: event.club,
      created_by: event.created_by,
      created_by_name: event.created_by_name,
    },
  }));

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  return (
    <>
      <style>{`
        .fc-highlight {
          background-color: ${userColor} !important;
          opacity: 0.25 !important;
        }
        .fc .fc-event-mirror {
          box-shadow: 0 4px 12px rgba(0,0,0,0.15) !important;
        }
      `}</style>
      <FullCalendar
        ref={calendarRef}
      plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, momentTimezonePlugin]}
      timeZone={timezone}
      initialView="dayGridMonth"

      headerToolbar={{
        left: 'prev,next today',
        center: 'title',
        right: 'dayGridMonth,timeGridWeek,timeGridDay',
      }}
      events={calendarEvents}
      dayMaxEvents={4}
      selectable={isMobile ? false : selectable}
      selectMirror={!isMobile}
      unselectAuto={false}
      selectOverlap={true}
      slotEventOverlap={false}
      editable={isMobile ? false : true}
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
        if (onEventDrop) onEventDrop(info);
      }}
      eventResize={(info) => {
        if (onEventResize) onEventResize(info);
      }}
      select={(info) => {
        const isMonthView = info.view.type === 'dayGridMonth';
        const diffInMs = info.end.getTime() - info.start.getTime();
        const diffInDays = Math.round(diffInMs / (1000 * 60 * 60 * 24));
        
        if (isMonthView && diffInDays <= 1) {
          // This is a single click in month view.
          // The dateClick handler will handle navigating to the day view.
          const calendarApi = calendarRef.current.getApi();
          calendarApi.unselect();
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
        const calendarApi = calendarRef.current.getApi();
        if (calendarApi.view.type === 'dayGridMonth') {
          calendarApi.changeView('timeGridDay', info.dateStr);
        }
      }}
      datesSet={(dateInfo) => {
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
              {eventInfo.event.extendedProps.club && (
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
            {eventInfo.event.extendedProps.location && (
              <div className="text-xs truncate mb-0.5" style={{ color: textColor, opacity: 0.85 }}>
                📍 {eventInfo.event.extendedProps.location}
              </div>
            )}
            {eventInfo.event.extendedProps.description && (
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
    </>
  );
});

export default Calendar;
