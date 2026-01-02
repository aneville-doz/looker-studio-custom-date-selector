const dscc = require('@google/dscc');
const local = require('./localMessage.js');

// Store the current date selections to preserve across re-renders
let currentStartDate = '';
let currentEndDate = '';
let isManualInput = false;
let hasUserEverInteracted = false;
// Track the last filter we sent to avoid re-sending the same filter
let lastFilterSent = null;

function parseDate(dateString) {
  if (!dateString || typeof dateString !== 'string') {
    return null;
  }
  
  let year, month, day;
  let match;
  
  // YYYY-MM-DD (ISO format, most common)
  match = dateString.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    [, year, month, day] = match;
    return new Date(`${year}-${month}-${day}T00:00:00Z`);
  }
  
  // YYYY/MM/DD
  match = dateString.match(/^(\d{4})\/(\d{2})\/(\d{2})$/);
  if (match) {
    [, year, month, day] = match;
    return new Date(`${year}-${month}-${day}T00:00:00Z`);
  }
  
  // YYYYMMDD (no separators)
  match = dateString.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (match) {
    [, year, month, day] = match;
    return new Date(`${year}-${month}-${day}T00:00:00Z`);
  }
  
  // MM/DD/YYYY (US format)
  match = dateString.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (match) {
    [, month, day, year] = match;
    month = month.padStart(2, '0');
    day = day.padStart(2, '0');
    return new Date(`${year}-${month}-${day}T00:00:00Z`);
  }
  
  // DD/MM/YYYY (European format)
  match = dateString.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (match) {
    // Try to distinguish - if first part > 12, it's likely DD/MM/YYYY
    const firstPart = parseInt(match[1], 10);
    const secondPart = parseInt(match[2], 10);
    if (firstPart > 12 && secondPart <= 12) {
      // DD/MM/YYYY
      [, day, month, year] = match;
      day = day.padStart(2, '0');
      month = month.padStart(2, '0');
      return new Date(`${year}-${month}-${day}T00:00:00Z`);
    } else if (firstPart <= 12 && secondPart > 12) {
      // MM/DD/YYYY (already handled above, but this is more explicit)
      [, month, day, year] = match;
      month = month.padStart(2, '0');
      day = day.padStart(2, '0');
      return new Date(`${year}-${month}-${day}T00:00:00Z`);
    }
  }
  
  // DD-MM-YYYY (European format with dashes)
  match = dateString.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (match) {
    [, day, month, year] = match;
    return new Date(`${year}-${month}-${day}T00:00:00Z`);
  }
  
  // MM-DD-YYYY (US format with dashes)
  match = dateString.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (match) {
    // Try to distinguish - if first part > 12, it's DD-MM-YYYY, else MM-DD-YYYY
    const firstPart = parseInt(match[1], 10);
    if (firstPart > 12) {
      // DD-MM-YYYY
      [, day, month, year] = match;
      return new Date(`${year}-${month}-${day}T00:00:00Z`);
    } else {
      // MM-DD-YYYY
      [, month, day, year] = match;
      return new Date(`${year}-${month}-${day}T00:00:00Z`);
    }
  }
  
  // YYYY.MM.DD (dots as separators)
  match = dateString.match(/^(\d{4})\.(\d{2})\.(\d{2})$/);
  if (match) {
    [, year, month, day] = match;
    return new Date(`${year}-${month}-${day}T00:00:00Z`);
  }
  
  // DD.MM.YYYY (dots as separators, European)
  match = dateString.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (match) {
    [, day, month, year] = match;
    return new Date(`${year}-${month}-${day}T00:00:00Z`);
  }
  
  // Try native Date parsing as fallback
  const parsed = new Date(dateString);
  if (!isNaN(parsed.getTime())) {
    return parsed;
  }
  
  return null;
}

// Always return a value suitable for <input type="date">: "YYYY-MM-DD" or "".
function toInputDate(dateString) {
  const d = parseDate(dateString);
  if (!d) return '';
  return d.toISOString().split('T')[0];
}

function getStyleColor(styleProp, fallback) {
  if (!styleProp || styleProp.value == null) return fallback;
  const v = styleProp.value;
  if (typeof v === 'string') return v;
  if (typeof v === 'object' && v.color) return v.color;
  return fallback;
}

function getStyleNumber(styleProp, fallback) {
  if (!styleProp || styleProp.value == null) return fallback;
  const n = Number(styleProp.value);
  return Number.isFinite(n) ? n : fallback;
}

function hexToRgb(hex) {
  if (!hex || typeof hex !== 'string') return null;
  let h = hex.trim().replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  if (h.length !== 6) return null;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  if ([r, g, b].some((x) => Number.isNaN(x))) return null;
  return { r, g, b };
}

function withOpacity(color, opacity) {
  // Prefer rgba() so only background changes opacity (not text).
  const o = Math.max(0, Math.min(1, Number(opacity)));
  if (typeof color === 'string' && color.startsWith('rgba(')) return color;
  if (typeof color === 'string' && color.startsWith('rgb(')) {
    return color.replace(/^rgb\((.+)\)$/, `rgba($1, ${o})`);
  }
  const rgb = hexToRgb(color);
  if (!rgb) return color;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${o})`;
}

// Helper to format date based on field type
const formatDateForLooker = (dateString, fieldType) => {
  const date = new Date(dateString + 'T00:00:00Z');
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  
  // Format based on Looker Studio field type
  switch(fieldType) {
    case 'YEAR_MONTH_DAY':
    case 'YEAR_MONTH_DAY_HOUR':
    case 'YEAR_MONTH_DAY_SECOND':
      return `${year}${month}${day}`;
    case 'YEAR_MONTH':
      return `${year}${month}`;
    case 'YEAR_WEEK':
      // Week format is complex, approximate with YYYYMMDD for now
      return `${year}${month}${day}`;
    case 'YEAR_QUARTER':
      const quarter = Math.floor((date.getUTCMonth() / 3)) + 1;
      return `${year}Q${quarter}`;
    case 'YEAR':
      return `${year}`;
    default:
      return `${year}${month}${day}`;
  }
};

// Helper to generate a range of dates
const getDatesInRange = (startDate, endDate, fieldType) => {
  const dates = [];
  let currentDate = new Date(startDate + 'T00:00:00Z');
  const end = new Date(endDate + 'T00:00:00Z');

  while (currentDate <= end) {
    dates.push(formatDateForLooker(currentDate.toISOString().split('T')[0], fieldType));
    currentDate.setUTCDate(currentDate.getUTCDate() + 1);
  }
  
  // Remove duplicates (important for YEAR_MONTH, YEAR, etc.)
  return [...new Set(dates)];
};

// Main Viz Rendering
const drawViz = (data) => {
  console.log('═══ drawViz called ═══');
  console.log('Current state before render:', { currentStartDate, currentEndDate });
  
  // Preserve current input values before clearing
  const existingStartInput = document.querySelector('.date-input-start');
  const existingEndInput = document.querySelector('.date-input-end');
  const domStartValue = (existingStartInput && existingStartInput.value) ? existingStartInput.value : '';
  const domEndValue = (existingEndInput && existingEndInput.value) ? existingEndInput.value : '';
  const hadDomValues = !!(domStartValue || domEndValue);
  let appliedDefaultsThisRender = false;

  // Decide what values to render *before* we clear the DOM.
  // Priority:
  // - If the user already interacted: preserve DOM values across re-renders.
  // - Otherwise: apply defaults once (and keep them) without marking it as "manual".
  if (hadDomValues) {
    currentStartDate = domStartValue || currentStartDate;
    currentEndDate = domEndValue || currentEndDate;
    console.log('Preserved dates from DOM:', { currentStartDate, currentEndDate });
  } else if (!isManualInput && !currentStartDate && !currentEndDate) {
    const styles = data.style || {};
    const defaultStartRaw = styles.defaultStartDate && styles.defaultStartDate.value;
    const defaultEndRaw = styles.defaultEndDate && styles.defaultEndDate.value;
    currentStartDate = toInputDate(defaultStartRaw);
    currentEndDate = toInputDate(defaultEndRaw);
    appliedDefaultsThisRender = !!(currentStartDate || currentEndDate);
    console.log('No prior values; applying defaults:', { currentStartDate, currentEndDate });
  } else {
    console.log('Keeping existing stored state:', { currentStartDate, currentEndDate });
  }
  
  console.log('Available dates in data.tables:', data.tables && data.tables.DEFAULT ? data.tables.DEFAULT.length : 0);
  
  // Clear existing content
  document.body.innerHTML = '';

  const styles = data.style || {};
  const dateField = data.fields.dateDimension && data.fields.dateDimension[0];

  if (!dateField) {
    const msg = document.createElement('div');
    msg.innerText = 'Please select a Date Dimension.';
    msg.style.padding = '20px';
    msg.style.textAlign = 'center';
    document.body.appendChild(msg);
    return;
  }
  
  console.log('Date field:', dateField);

  // Create Container
  const container = document.createElement('div');
  container.className = 'date-selector-container';
  
  // Apply Styles
  const fontColor = getStyleColor(styles.fontColor, '#202124');
  const fontFamily = (styles.textFontFamily && styles.textFontFamily.value) ? styles.textFontFamily.value : 'Roboto';
  const inputFontSizePx = getStyleNumber(styles.buttonTextFontSize, 14);
  const secondaryFontSizePx = getStyleNumber(styles.listTextSize, inputFontSizePx);

  const bgColor = getStyleColor(styles.backgroundColor, '#ffffff');
  const bgOpacity = getStyleNumber(styles.backgroundOpacity, 1);
  const bgColorWithOpacity = withOpacity(bgColor, bgOpacity);

  const borderColor = getStyleColor(styles.borderColor, '#DADCE0');
  const borderWidthPx = getStyleNumber(styles.borderWidth, 1);
  const borderRadiusPx = getStyleNumber(styles.borderRadius, 8);

  // Feed CSS variables so all elements update consistently.
  container.style.setProperty('--ls-font-color', fontColor);
  container.style.setProperty('--ls-font-family', fontFamily);
  container.style.setProperty('--ls-input-font-size', `${inputFontSizePx}px`);
  container.style.setProperty('--ls-secondary-font-size', `${secondaryFontSizePx}px`);
  container.style.setProperty('--ls-bg-color', bgColorWithOpacity);
  container.style.setProperty('--ls-border-color', borderColor);
  container.style.setProperty('--ls-border-width', `${borderWidthPx}px`);
  container.style.setProperty('--ls-border-radius', `${borderRadiusPx}px`);

  container.style.color = fontColor;
  container.style.fontFamily = fontFamily;
  container.style.backgroundColor = bgColorWithOpacity;
  container.style.border = `${borderWidthPx}px solid ${borderColor}`;
  container.style.borderRadius = `${borderRadiusPx}px`;

  // Create Inputs
  const startDateInput = document.createElement('input');
  startDateInput.type = 'date';
  startDateInput.className = 'date-input date-input-start';
  // Restore previous value if it exists
  if (currentStartDate) {
    startDateInput.value = currentStartDate;
  }
  
  const separator = document.createElement('span');
  separator.innerText = ' to ';
  separator.className = 'date-separator';

  const endDateInput = document.createElement('input');
  endDateInput.type = 'date';
  endDateInput.className = 'date-input date-input-end';
  // Restore previous value if it exists
  if (currentEndDate) {
    endDateInput.value = currentEndDate;
  }

  // Apply styles to inputs
  startDateInput.style.color = fontColor;
  endDateInput.style.color = fontColor;
  
  // Style the calendar icon color
  // Convert font color to determine if we need light or dark icon
  const iconTheme = (data.style && data.style.iconTheme && data.style.iconTheme.value) ? data.style.iconTheme.value : 'light';
  console.log('Icon theme:', iconTheme);
  const isDarkColor = iconTheme === 'dark';
  if (isDarkColor) {
    startDateInput.classList.add('dark-icon');
    endDateInput.classList.add('dark-icon');
  } else {
    startDateInput.classList.add('light-icon');
    endDateInput.classList.add('light-icon');
  }
  
  // Helper function to determine if a color is dark (based on hex color argument)
  function isColorDark(color) {
    // Remove # if present
    color = color.replace('#', '');
    
    // Convert hex to RGB
    const r = parseInt(color.substring(0, 2), 16);
    const g = parseInt(color.substring(2, 4), 16);
    const b = parseInt(color.substring(4, 6), 16);
    
    // Calculate luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    
    // Return true if dark (luminance < 0.5)
    return luminance < 0.5;
  }

  // Append elements
  container.appendChild(startDateInput);
  container.appendChild(separator);
  container.appendChild(endDateInput);
  
  // Re-apply filter only when the user has actually interacted (not just because defaults exist).
  const shouldReapplyFilter = !!(hasUserEverInteracted && (currentStartDate || currentEndDate));
  console.log('Should re-apply filter?', shouldReapplyFilter, { currentStartDate, currentEndDate });

  // Info text showing field info for debugging
  const infoText = document.createElement('div');
  infoText.style.fontSize = '10px';
  infoText.style.color = '#666';
  infoText.style.marginTop = '4px';
  infoText.innerText = `Filtering field: ${dateField.name || dateField.id} (${dateField.type || 'unknown type'})`;
  // container.appendChild(infoText);

  // Show that this is a filter control
  const modeInfo = document.createElement('div');
  modeInfo.style.fontSize = '9px';
  modeInfo.style.color = '#999';
  modeInfo.style.marginTop = '2px';
  modeInfo.innerText = 'Filter Control Mode - Select dates to filter other charts';
  // container.appendChild(modeInfo);

  document.body.appendChild(container);

  // Helper to convert Looker date format to comparable format
  const lookerDateToComparable = (lookerDate, fieldType) => {
    // Convert YYYYMMDD or other Looker formats to Date object for comparison
    const dateStr = String(lookerDate);
    if (fieldType === 'YEAR_MONTH_DAY' || fieldType === 'YEAR_MONTH_DAY_HOUR' || fieldType === 'YEAR_MONTH_DAY_SECOND') {
      // Format: YYYYMMDD
      const year = dateStr.substring(0, 4);
      const month = dateStr.substring(4, 6);
      const day = dateStr.substring(6, 8);
      return `${year}-${month}-${day}`;
    } else if (fieldType === 'YEAR_MONTH') {
      // Format: YYYYMM
      const year = dateStr.substring(0, 4);
      const month = dateStr.substring(4, 6);
      return `${year}-${month}-01`;
    } else if (fieldType === 'YEAR') {
      // Format: YYYY
      return `${dateStr}-01-01`;
    }
    return dateStr;
  };

  // Interaction Logic
  const handleDateChange = (options = {}) => {
    const source = options.source || 'user'; // 'user' | 'programmatic'
    const start = startDateInput.value;
    const end = endDateInput.value;
    if (source === 'user') {
      isManualInput = true;
      hasUserEverInteracted = true;
    }
    
    // Store the current values
    currentStartDate = start;
    currentEndDate = end;

    // console.log('─── handleDateChange triggered ───');
    // console.log('Source:', source);
    // console.log('Input values:', { start, end });
    // console.log('Stored to state:', { currentStartDate, currentEndDate });

    if (start && start.slice(0, 4) <= '1900') {
      // console.warn('Start date is before 1900 - cannot filter');
      return;
    }
    if (end && end.slice(0, 4) <= '1900') {
      // console.warn('End date is before 1900 - cannot filter');
      return;
    }

    if (start || end) {
      // Safely check if keepEmptyDates is enabled
      const keepEmptyDates = false; //data.style.keepEmptyDates && data.style.keepEmptyDates.value;
      
      // Get available dates from the data, separating valid dates from empty/null values
      let dateSet = new Set();
      let emptyDateValues = new Set(); // Capture actual empty/null values as they exist in data
      
      if (data.tables && data.tables.DEFAULT) {
        data.tables.DEFAULT.forEach(function(row) {
          const dateValue = row.dateDimension && row.dateDimension[0];
          // Check if this is a valid date value
          if (dateValue !== undefined && dateValue !== null && dateValue !== '' && 
              !(typeof dateValue === 'number' && isNaN(dateValue)) &&
              !(typeof dateValue === 'string' && dateValue.trim() === '')) {
            dateSet.add(dateValue);
          } else if (keepEmptyDates) {
            // Capture the actual empty/null value as it exists in the data
            // We need to use the exact value that Looker has for this row
            emptyDateValues.add(dateValue);
          }
        });
      }
      const availableDates = Array.from(dateSet);
      const emptyDates = Array.from(emptyDateValues);
      
      console.log(`Available dates in dataset: ${availableDates.length} dates`);
      console.log('keepEmptyDates setting:', keepEmptyDates);
      console.log('Empty date values found:', emptyDates.length, emptyDates);

      if (availableDates.length === 0 && emptyDates.length === 0) {
        // console.warn('No date data available - cannot filter');
        return;
      }

      const fieldType = dateField.type || 'YEAR_MONTH_DAY';
      
      // Filter the available dates based on the date range bounds
      let filteredDates = availableDates.filter(function(lookerDate) {
        const comparableDate = lookerDateToComparable(lookerDate, fieldType);

        // Check start bound (>= start)
        if (start && comparableDate < start) {
          return false;
        }
        
        // Check end bound (<= end)
        if (end && comparableDate > end) {
          return false;
        }
        
        return true;
      });

      /*
      // NOTE: Adding empty/null values to Looker cross-filter breaks the filter entirely.
      // Looker Studio interprets '' in filter values as a wildcard, causing all records to match.
      // As a workaround, we log a warning but don't add empty values to the filter.
      // To include records with empty dates, users should create a calculated field in the data
      // source that converts NULL dates to a marker like "(No Date)".
      if (keepEmptyDates && emptyDates.length > 0) {
        console.warn('keepEmptyDates is enabled, but adding empty values to Looker cross-filter breaks filtering.');
        console.warn('Empty date records may not be included. Consider using a calculated field to convert NULL dates to a marker value.');
        // We intentionally do NOT add empty values to avoid breaking the filter:
        // emptyDates.forEach(function(emptyVal) { filteredDates.push(emptyVal); });
      }
      */

      console.log(`Filtered to ${filteredDates.length} dates based on bounds`);
      console.log('Filtered dates (first 10):', filteredDates.slice(0, 10));

      if (filteredDates.length === 0) {
        // console.warn('No dates match the selected range in the dataset');
        // Optionally clear the filter or show a message
        const FILTER = dscc.InteractionType.FILTER;
        dscc.clearInteraction('crossFilter', FILTER);
        lastFilterSent = null;
        return;
      }

      // Create a fingerprint of this filter to check if it's the same as last time
      const filterFingerprint = JSON.stringify({ 
        concept: dateField.id, 
        start: start, 
        end: end,
        count: filteredDates.length 
      });
      
      // console.log('Filter fingerprint:', filterFingerprint);
      // console.log('Last filter sent:', lastFilterSent);

      // Only send if this is a different filter than last time
      if (filterFingerprint === lastFilterSent) {
        // console.log('⚠️ Same filter as last time - skipping to avoid loop');
        return;
      }

      // Format exactly like the working table interaction
      const FILTER = dscc.InteractionType.FILTER;
      const interactionId = 'crossFilter';
      const interactionData = {
        concepts: [dateField.id],
        values: filteredDates.map(function(d) { return [d]; })
      };

      // console.log('>>> SENDING Filter Interaction <<<');
      // console.log('Concepts:', interactionData.concepts);
      // console.log('Number of values:', interactionData.values.length);
      // console.log('Values sample (first 5):', interactionData.values.slice(0, 5));
      // console.log('Current bounds:', { start, end });
      
      dscc.sendInteraction(interactionId, FILTER, interactionData);
      lastFilterSent = filterFingerprint;
      // console.log('✓ Filter interaction sent successfully');
    } else {
      // Clear filter if both inputs are empty
      if (lastFilterSent !== null) {
        // console.log('Clearing filter interaction (both dates empty)');
        const FILTER = dscc.InteractionType.FILTER;
        dscc.clearInteraction('crossFilter', FILTER);
        lastFilterSent = null;
      } else {
        // console.log('No dates set and no filter to clear');
      }
    }
  };

  startDateInput.addEventListener('change', handleDateChange);
  endDateInput.addEventListener('change', handleDateChange);
  
  // console.log('Event listeners attached.');
  
  // If this is a re-render after user interaction, re-trigger the filter.
  // The deduplication logic in handleDateChange will prevent loops.
  if (shouldReapplyFilter) {
    // console.log('Re-render after user interaction - re-triggering filter to maintain state');
    setTimeout(function() {
      handleDateChange({ source: 'programmatic' });
    }, 0);
  } else if (appliedDefaultsThisRender && lastFilterSent === null) {
    // On initial load with defaults, we still want cross-filtering to apply immediately.
    // This is programmatic (not "manual input"), and dedup logic prevents loops.
    // console.log('Defaults applied on initial render - triggering filter once');
    setTimeout(function() {
      handleDateChange({ source: 'programmatic' });
    }, 0);
  } else {
    // console.log('Initial render - waiting for user interaction.');
  }
};

// Renders locally
if (typeof DSCC_IS_LOCAL !== 'undefined' && DSCC_IS_LOCAL) {
  drawViz(local.message);
} else {
  dscc.subscribeToData(drawViz, {transform: dscc.objectTransform});
}
