import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

/**
 * Helper to convert color hex to RGB array
 */
const hexToRgb = (hex) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || '#3b82f6');
  return result ? [
    parseInt(result[1], 16),
    parseInt(result[2], 16),
    parseInt(result[3], 16)
  ] : [59, 130, 246];
};

/**
 * Helper to get contrast color (white or black) based on background luminance
 */
const getContrastColor = (rgb) => {
  const luminance = (0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]) / 255;
  return luminance > 0.5 ? [0, 0, 0] : [255, 255, 255];
};

/**
 * Draws a traditional calendar grid for Month View with badge-style IDs
 */
const drawMonthGrid = (doc, events, dateRange, options, themeColors) => {
  const { margin, gridTop, gridWidth, pageWidth } = options;
  const start = new Date(dateRange.start);
  const end = new Date(dateRange.end);
  
  // Title
  doc.setFontSize(22);
  doc.setTextColor(...themeColors.textPrimary);
  const monthTitle = start.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  doc.text(monthTitle, pageWidth / 2, 20, { align: 'center' });

  // Grid Settings
  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const colWidth = gridWidth / 7;
  
  // Calculate Rows
  const diffTime = Math.abs(end - start);
  const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const rowCount = Math.ceil(totalDays / 7);
  const rowHeight = Math.min(25, 140 / rowCount);
  const gridHeight = rowCount * rowHeight;

  // Grid Background
  doc.setFillColor(...themeColors.surface); 
  doc.rect(margin, gridTop, gridWidth, gridHeight, 'F');
  
  // Day Headers
  doc.setDrawColor(...themeColors.border); 
  doc.setLineWidth(0.1);
  doc.setFontSize(8);
  doc.setTextColor(...themeColors.textSecondary);
  dayLabels.forEach((label, i) => {
    const x = margin + i * colWidth;
    doc.text(label, x + colWidth / 2, gridTop + 5, { align: 'center' });
    doc.line(x, gridTop, x, gridTop + gridHeight);
  });
  doc.line(margin + gridWidth, gridTop, margin + gridWidth, gridTop + gridHeight);

  // Render Day Cells
  for (let r = 0; r <= rowCount; r++) {
    const y = gridTop + r * rowHeight;
    doc.line(margin, y, margin + gridWidth, y);
    
    if (r < rowCount) {
      for (let c = 0; c < 7; c++) {
        const dIdx = r * 7 + c;
        if (dIdx < totalDays) {
          const d = new Date(start);
          d.setDate(d.getDate() + dIdx);
          const x = margin + c * colWidth;
          
          // Date Number
          doc.setFontSize(6);
          doc.setTextColor(...themeColors.textSecondary);
          doc.text(`${d.getDate()}`, x + colWidth - 2, y + 4, { align: 'right' });
          
          // Render events as small square badges in a grid
          const dayEvents = events.filter(e => {
            const eStart = new Date(e.start);
            const eEnd = new Date(e.end || e.start);
            const dStart = new Date(d); dStart.setHours(0,0,0,0);
            const dEnd = new Date(d); dEnd.setHours(23,59,59,999);
            return eStart <= dEnd && eEnd >= dStart;
          });

          // Draw Badge Grid
          const badgeSize = 5;
          const badgeMargin = 1;
          const startX = x + 2;
          const startY = y + 6;
          const badgesPerRow = Math.floor((colWidth - 4) / (badgeSize + badgeMargin));

          dayEvents.forEach((e, eIdx) => {
            const row = Math.floor(eIdx / badgesPerRow);
            const col = eIdx % badgesPerRow;
            
            const bx = startX + col * (badgeSize + badgeMargin);
            const by = startY + row * (badgeSize + badgeMargin);
            
            // Limit drawing to cell area
            if (by + badgeSize < y + rowHeight - 2) {
              const rgb = hexToRgb(e.club?.color);
              doc.setFillColor(...rgb);
              doc.rect(bx, by, badgeSize, badgeSize, 'F');
              
              const textColor = getContrastColor(rgb);
              doc.setTextColor(...textColor);
              doc.setFontSize(4);
              doc.setFont("helvetica", "bold");
              doc.text(`#${e._displayId}`, bx + badgeSize / 2, by + badgeSize / 2 + 1.2, { align: 'center' });
              doc.setFont("helvetica", "normal");
            }
          });
        }
      }
    }
  }

  return gridTop + gridHeight;
};

/**
 * Draws the high-fidelity vertical timeline (Week & Day Views)
 */
const drawScheduleTimeline = (doc, events, dateRange, options, themeColors, timeFormat) => {
  const { margin, gridTop, gridWidth, pageWidth } = options;
  const gutterWidth = 18;
  const timelineHeight = 150;
  const hourHeight = timelineHeight / 24;
  const allDayHeight = 10;
  
  const startLimit = new Date(dateRange.start);
  const endLimit = new Date(dateRange.end);
  
  // Title
  doc.setFontSize(22);
  doc.setTextColor(...themeColors.textPrimary);
  const diffTime = Math.abs(endLimit - startLimit);
  const actualDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
  
  const titleText = actualDays > 1 
    ? `${startLimit.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} - ${endLimit.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`
    : startLimit.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
  doc.text(titleText, pageWidth / 2, 20, { align: 'center' });

  // Surfaces
  doc.setFillColor(...themeColors.surface); 
  doc.rect(margin, gridTop, gridWidth, timelineHeight + allDayHeight, 'F');
  
  // Different color for Gutter in Dark mode, but maybe same for Light?
  const gutterColor = themeColors.theme === 'dark' ? [15, 23, 42] : [241, 245, 249];
  doc.setFillColor(...gutterColor); 
  doc.rect(margin, gridTop, gutterWidth, timelineHeight + allDayHeight, 'F');

  doc.setDrawColor(...themeColors.border); 
  doc.setLineWidth(0.1);
  doc.line(margin, gridTop + allDayHeight, margin + gridWidth, gridTop + allDayHeight);
  
  doc.setFontSize(7);
  doc.setTextColor(...themeColors.textSecondary);
  doc.text('all-day', margin + 2, gridTop + 6);

  for (let i = 0; i <= 24; i++) {
    const y = gridTop + allDayHeight + (i * hourHeight);
    doc.line(margin + gutterWidth, y, margin + gridWidth, y);
    
    let label;
    if (timeFormat === '12h') {
      label = i === 0 ? '12 am' : i < 12 ? `${i} am` : i === 12 ? '12 pm' : `${i - 12} pm`;
    } else {
      label = i < 10 ? `0${i}:00` : `${i}:00`;
    }

    if (i < 24) {
      doc.setFontSize(7);
      doc.setTextColor(...themeColors.textSecondary);
      doc.text(label, margin + 2, y + 2);
    }
  }

  const colWidth = (gridWidth - gutterWidth) / actualDays;

  for (let dIdx = 0; dIdx < actualDays; dIdx++) {
    const currentDayStart = new Date(startLimit);
    currentDayStart.setDate(currentDayStart.getDate() + dIdx);
    currentDayStart.setHours(0,0,0,0);
    const dayX = margin + gutterWidth + (dIdx * colWidth);
    if (dIdx > 0) doc.line(dayX, gridTop, dayX, gridTop + timelineHeight + allDayHeight);

    doc.setFontSize(actualDays > 7 ? 4 : 6);
    doc.setTextColor(...themeColors.textSecondary);
    const dayLabel = actualDays > 7 
      ? `${currentDayStart.getDate()}`
      : currentDayStart.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' });
    doc.text(dayLabel, dayX + (colWidth / 2), gridTop - 3, { align: 'center' });

    const currentDayEnd = new Date(currentDayStart);
    currentDayEnd.setHours(23, 59, 59, 999);

    const dayEvents = events.filter(e => {
      const eStart = new Date(e.start);
      const eEnd = new Date(e.end || e.start);
      return eStart <= currentDayEnd && eEnd >= currentDayStart;
    }).sort((a, b) => new Date(a.start) - new Date(b.start));

    const lanes = [];
    const tEvents = dayEvents.filter(e => !e.allDay);
    const adEvents = dayEvents.filter(e => e.allDay);

    tEvents.forEach(e => {
      const eStart = new Date(e.start);
      const eEnd = new Date(e.end || e.start);
      const startMin = eStart < currentDayStart ? 0 : (eStart.getHours() * 60 + eStart.getMinutes());
      const endMin = eEnd > currentDayEnd ? 1440 : (eEnd.getHours() * 60 + eEnd.getMinutes() || (startMin + 45));
      let lIdx = lanes.findIndex(lEnd => lEnd <= startMin);
      if (lIdx === -1) {
        lanes.push(endMin);
        lIdx = lanes.length - 1;
      } else {
        lanes[lIdx] = endMin;
      }
      e._lane = lIdx;
      e._sMin = startMin;
      e._eMin = endMin;
    });

    const totalLanes = lanes.length || 1;
    const lWidth = (colWidth - 0.2) / totalLanes;

    tEvents.forEach(e => {
      const y = gridTop + allDayHeight + (e._sMin / 60) * hourHeight;
      const h = Math.max(2, ((e._eMin - e._sMin) / 60) * hourHeight);
      const x = dayX + (e._lane * lWidth) + 0.1;
      const w = lWidth - 0.2;

      const rgb = hexToRgb(e.club?.color);
      doc.setFillColor(...rgb);
      doc.rect(x, y, w, h, 'F');
      
      const textColor = getContrastColor(rgb);
      doc.setTextColor(...textColor);
      doc.setFontSize(Math.min(6, lWidth * 1.5));
      if (h > 3 && w > 2) {
        doc.setFont("helvetica", "bold");
        doc.text(`#${e._displayId}`, x + (w / 2), y + (h / 2) + 0.8, { align: 'center' });
      }
    });

    if (adEvents.length) {
      const adW = (colWidth - 0.2) / adEvents.length;
      adEvents.forEach((e, i) => {
        const rgb = hexToRgb(e.club?.color);
        doc.setFillColor(...rgb);
        doc.rect(dayX + (i * adW) + 0.1, gridTop + 2, adW - 0.1, 6, 'F');
        doc.setTextColor(...getContrastColor(rgb));
        doc.setFontSize(Math.min(5, adW * 1.5));
        doc.text(`#${e._displayId}`, dayX + (i * adW) + (adW / 2), gridTop + 6, { align: 'center' });
      });
    }
  }

  return gridTop + timelineHeight + allDayHeight;
};

/**
 * Main Export Service
 */
export const exportToPDF = async (events, selectedClubs, dateRange, viewType, theme = 'dark', timeFormat = '12h', timezone = 'Asia/Kolkata') => {
  const doc = new jsPDF('p', 'mm', 'a4');

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  // Theme Palettes
  const getThemeColors = (t) => {
    if (t === 'dark') {
      return {
        theme: 'dark',
        background: [15, 23, 42],     // slate-900
        surface: [30, 41, 59],        // slate-800
        textPrimary: [255, 255, 255],
        textSecondary: [148, 163, 184],
        border: [51, 65, 85],         // slate-700
        tableBody: [15, 23, 42],
        tableAlt: [17, 24, 39],
        tableText: [203, 213, 225]
      };
    }
    return {
      theme: 'light',
      background: [248, 250, 252],    // slate-50
      surface: [255, 255, 255],
      textPrimary: [15, 23, 42],      // slate-900
      textSecondary: [71, 85, 105],   // slate-600
      border: [226, 232, 240],        // slate-200
      tableBody: [255, 255, 255],
      tableAlt: [249, 250, 251],
      tableText: [51, 65, 85]
    };
  };

  const themeColors = getThemeColors(theme);

  // Helper to draw background
  const drawBackground = (d) => {
    d.setFillColor(...themeColors.background);
    d.rect(0, 0, d.internal.pageSize.getWidth(), d.internal.pageSize.getHeight(), 'F');
  };

  // Override addPage to ensure background is drawn on every new page
  const originalAddPage = doc.addPage.bind(doc);
  doc.addPage = function() {
    originalAddPage.apply(this, arguments);
    drawBackground(this);
    return this;
  };

  // Draw background on the first page
  drawBackground(doc);

  const options = {
    margin: 12,
    gridTop: 40,
    gridWidth: pageWidth - 24,
    pageWidth: pageWidth
  };

  const filteredEvents = events.filter(e => {
    const s = new Date(e.start);
    const end = new Date(e.end || e.start);
    return s <= new Date(dateRange.end) && end >= new Date(dateRange.start);
  }).sort((a, b) => new Date(a.start) - new Date(b.start));

  // Assign sequential display IDs for this PDF report
  filteredEvents.forEach((e, i) => {
    e._displayId = i + 1;
  });

  let lastY;
  if (viewType === 'dayGridMonth') {
    lastY = drawMonthGrid(doc, filteredEvents, dateRange, options, themeColors);
  } else {
    lastY = drawScheduleTimeline(doc, filteredEvents, dateRange, options, themeColors, timeFormat);
  }

  const tableRows = filteredEvents.map(e => [
    `#${e._displayId}`,
    e.title,
    new Date(e.start).toLocaleString([], { hour12: timeFormat === '12h', dateStyle: 'medium', timeStyle: 'short', timeZone: timezone }),
    new Date(e.end || e.start).toLocaleString([], { hour12: timeFormat === '12h', dateStyle: 'medium', timeStyle: 'short', timeZone: timezone }),

    e.club?.parent_name || e.club?.name || 'N/A',
    e.club?.parent_name ? (e.club?.name || '-') : '-',
    (e.collaborating_clubs && e.collaborating_clubs.length > 0)
      ? e.collaborating_clubs.map(c => c.name).join(', ')
      : '-'
  ]);

  doc.autoTable({
    startY: lastY + 15,
    head: [['ID', 'Event Title', 'Start', 'End', 'Main Club', 'Sub Club', 'Collaborating Clubs']],
    body: tableRows,
    theme: 'grid',
    headStyles: { 
      fillColor: themeColors.theme === 'dark' ? [30, 41, 59] : [51, 65, 85], 
      textColor: [255, 255, 255] 
    },
    bodyStyles: { 
      fillColor: themeColors.tableBody, 
      textColor: themeColors.tableText, 
      fontSize: 7 
    },
    alternateRowStyles: { 
      fillColor: themeColors.tableAlt 
    },
    styles: { 
      lineColor: themeColors.border 
    },
    columnStyles: { 6: { cellWidth: 40 } },
    margin: { left: 12, right: 12 }
  });

  // Generate dynamic filename based on dateRange and viewType
  const formatFileNameDate = (date) => {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}_${month}_${year}`;
  };

  const startStr = formatFileNameDate(dateRange.start);
  let fileName;

  if (viewType === 'timeGridDay') {
    fileName = `CEAL_Calendar_${startStr}.pdf`;
  } else if (viewType === 'timeGridWeek') {
    const endStr = formatFileNameDate(new Date(dateRange.end).getTime() - 86400000); // Subtract 1 day because FC end is exclusive
    fileName = `CEAL_Calendar_${startStr}_to_${endStr}.pdf`;
  } else if (viewType === 'dayGridMonth') {
    const d = new Date(dateRange.start);
    // Month views usually start at the beginning of the actual month, 
    // but sometimes include trailing days of prev month. 
    // We'll use the month name/year for the filename.
    const monthName = d.toLocaleDateString(undefined, { month: '2-digit' });
    const year = d.getFullYear();
    fileName = `CEAL_Calendar_${monthName}_${year}.pdf`;
  } else {
    fileName = `CEAL_Calendar_${new Date().toISOString().split('T')[0]}.pdf`;
  }

  doc.save(fileName);
};
