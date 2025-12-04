# Targeted Date Range Control

## Overview
**Targeted Date Range Control** is a Looker Studio Community Visualization designed to provide advanced date filtering capabilities. Unlike the native Date Range Control, which universally affects the "Date Range Dimension" of charts, this control allows users to filter specific date columns within a Data Source.

This enables complex filtering scenarios, such as filtering a single table by multiple independent date criteria simultaneously (e.g., finding projects where `start_date` is in Q1 **AND** `end_date` is in Q2).

## Core Value Proposition
The native Looker Studio date selector is limited to a single "Date Range Dimension" per chart. This poses a problem for datasets where records have multiple relevant dates (e.g., `Order Date` vs. `Ship Date`, or `Project Start` vs. `Project End`).

**Targeted Date Range Control** solves this by:
1.  **Decoupling** the date selection from the chart's primary Date Range Dimension.
2.  Allowing the user to **specify a target column** to filter.
3.  Enabling **stackable date filters** on the same visualization.

## Features & Goals

### 1. Functionality
- **Target Specific Columns:** Users can configure which specific field in their Data Source this control should filter.
- **Multi-Column Filtering:** Multiple instances of this control can be used on a single dashboard to filter different columns on the same chart.
- **Cross-Chart Compatibility:** Works with any chart that shares the target Data Source.

### 2. User Interface
- **Native Look & Feel:** The UI will mimic the native Looker Studio Date Selector to ensure a seamless user experience.
- **Minimal Footprint:** Lightweight implementation to ensure fast load times and consistency.

### 3. Configuration
The property panel will include:
- **Target Data Source:** Selection of the data source to filter.
- **Target Date Column:** Selection of the specific column (dimension) to apply the date range to.
- **Standard Date Options:** Default ranges, presets, and styling options consistent with native controls.

## Development Stack
- **Framework:** Vanilla JavaScript / Minimal dependencies (to maintain performance and visual consistency).
- **Platform:** Google Looker Studio Community Visualizations API.

## Project Structure
- `src/` - Source code for the visualization.
  - `index.js` - Main logic for handling data and rendering.
  - `index.json` - Configuration for the property panel.
  - `index.css` - Styling to match native Looker Studio controls.
  - `manifest.json` - Visualization metadata.

## Setup
1.  **Install Dependencies:** `npm install`
2.  **Configure Bucket:** Ensure your GCS bucket allows CORS.
    ```bash
    gsutil cors set cors.json gs://YOUR_BUCKET_NAME
    ```
3.  **Develop:** `npm start`
4.  **Deploy:** `npm run push:dev`
