const dscc = require('@google/dscc');
const local = require('./localMessage.js');

// Helper to generate a range of dates (YYYYMMDD)
const getDatesInRange = (startDate, endDate) => {
  const dates = [];
  // Parse YYYY-MM-DD as UTC to avoid timezone shifts
  let currentDate = new Date(startDate + 'T00:00:00Z');
  const end = new Date(endDate + 'T00:00:00Z');

  while (currentDate <= end) {
    const year = currentDate.getUTCFullYear();
    const month = String(currentDate.getUTCMonth() + 1).padStart(2, '0');
    const day = String(currentDate.getUTCDate()).padStart(2, '0');
    dates.push(`${year}${month}${day}`);
    currentDate.setUTCDate(currentDate.getUTCDate() + 1);
  }
  return dates;
};

// Main Viz Rendering
const drawViz = (data) => {
  // Clear existing content
  document.body.innerHTML = '';

  const styles = data.style || {};
  const dateField = data.fields.dateDimension && data.fields.dateDimension[0];

  if (!dateField) {
    const msg = document.createElement('div');
    msg.innerText = 'Please select a Date Dimension.';
    document.body.appendChild(msg);
    return;
  }

  // Create Container
  const container = document.createElement('div');
  container.className = 'date-selector-container';
  
  // Apply Styles
  const fontColor = styles.fontColor ? (styles.fontColor.value.color || styles.fontColor.value) : '#000000';
  const bgColor = styles.backgroundColor ? (styles.backgroundColor.value.color || styles.backgroundColor.value) : '#ffffff';
  const borderRadius = styles.borderRadius ? styles.borderRadius.value : '4';
  const fontFamily = styles.fontFamily ? styles.fontFamily.value : 'Roboto';
  const opacity = styles.opacity ? styles.opacity.value : '1';

  container.style.color = fontColor;
  container.style.backgroundColor = bgColor;
  container.style.borderRadius = `${borderRadius}px`;
  container.style.fontFamily = fontFamily;
  container.style.opacity = opacity;

  // Create Inputs
  const startDateInput = document.createElement('input');
  startDateInput.type = 'date';
  startDateInput.className = 'date-input';
  
  const separator = document.createElement('span');
  separator.innerText = ' to ';
  separator.className = 'date-separator';

  const endDateInput = document.createElement('input');
  endDateInput.type = 'date';
  endDateInput.className = 'date-input';

  // Apply styles to inputs if needed (can be done in CSS, but coloring inheritance is good)
  startDateInput.style.color = fontColor;
  endDateInput.style.color = fontColor;

  // Append elements
  container.appendChild(startDateInput);
  container.appendChild(separator);
  container.appendChild(endDateInput);

  // DEBUG: Add Text Filter for testing
  const debugContainer = document.createElement('div');
  debugContainer.style.marginTop = '8px';
  const debugInput = document.createElement('input');
  debugInput.placeholder = 'Debug Text Filter';
  const debugBtn = document.createElement('button');
  debugBtn.innerText = 'Filter Text';
  debugBtn.onclick = () => {
      const val = debugInput.value;
      if (val) {
          const interactionData = {
              concepts: [dateField.id],
              values: [[val]]
          };
          console.log('Sending Debug Text Filter:', interactionData);
          dscc.sendInteraction('crossFilter', dscc.InteractionType.FILTER, interactionData);
      }
  };
  debugContainer.appendChild(debugInput);
  debugContainer.appendChild(debugBtn);
  container.appendChild(debugContainer);

  document.body.appendChild(container);

  // Interaction Logic
  const handleDateChange = () => {
    const start = startDateInput.value;
    const end = endDateInput.value;

    if (start && end) {
      if (new Date(start) > new Date(end)) {
        // Handle invalid range gracefully (maybe swap or just return)
        return;
      }

      // Looker Studio expects YYYYMMDD for YEAR_MONTH_DAY types
      // HTML input gives YYYY-MM-DD
      // We need to generate all dates in between for the filter interaction
      // assuming the standard behavior of selecting specific values.
      
      const datesToFilter = getDatesInRange(start, end);
      
      const interactionData = {
        concepts: [dateField.id],
        values: datesToFilter.map(d => [d]) // values are arrays of concept values
      };

      console.log('Sending Filter Interaction:', interactionData);
      dscc.sendInteraction('crossFilter', dscc.InteractionType.FILTER, interactionData);
    } else {
      // Clear filter if one is missing? Or wait for both?
      // Native control waits for both usually.
      // If user clears inputs, we should clear filter.
      if (!start && !end) {
          dscc.clearInteraction('crossFilter', dscc.InteractionType.FILTER);
      }
    }
  };

  startDateInput.addEventListener('change', handleDateChange);
  endDateInput.addEventListener('change', handleDateChange);
};

// Renders locally
if (typeof DSCC_IS_LOCAL !== 'undefined' && DSCC_IS_LOCAL) {
  drawViz(local.message);
} else {
  dscc.subscribeToData(drawViz, {transform: dscc.objectTransform});
}
