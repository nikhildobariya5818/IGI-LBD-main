# Report Editor Feature - Implementation Summary

## Overview
This feature adds the ability to edit generated diamond grading reports by adjusting section positions with 1px precision movements before PDF download.

## Key Features Implemented

### 1. **Edit Checkbox in Report Processor**
- Added "Edit Generated Report" checkbox to the main ReportProcessor component
- When checked, redirected to the editor page instead of direct PDF download
- When unchecked, maintains original direct download behavior

**File Modified:** `/src/components/pdfToReport/ReportProcessor.tsx`
- Added `editReport` state variable
- Modified `handleSubmit` to redirect to `/editor` with encoded data when checkbox is enabled

### 2. **Editor Page**
- New interactive editor page at `/src/app/editor/page.tsx`
- Features:
  - **Live Preview**: Visual representation of all 5 sections with blue borders (unselected) and red borders (selected)
  - **Section Selection**: Click any section to select it
  - **Movement Controls**: Arrow buttons (↑ ↓ ← →) move selected sections by 1px increments
  - **Offset Display**: Shows current X and Y offsets for selected section
  - **Reset Function**: "Reset All Positions" button to return all sections to original positions
  - **PDF Download**: Downloads the edited PDF with all position adjustments applied

**Key Component Details:**
- Uses `useSearchParams` to decode report data from URL
- Manages offsets in state for each section (section1-5)
- Calculates visual preview positions based on offsets
- Passes offsets to PDF component for final rendering

### 3. **PDF Component Updates**
Updated both standard and GradingScales PDF components to support position offsets:

**Files Modified:**
- `/src/components/pdfToReport/StandardReports/InvoicePDF.tsx`
- `/src/components/pdfToReport/StandardReports/InvoicePDF-GradingScales.tsx`

**Changes:**
- Added optional `offsets` parameter to component props
- Extracts offset values for each section (section1-5)
- Applies offsets to margin values when rendering sections
- Ensures PDF output reflects the adjusted positions

**Example:**
```typescript
const section1Offset = offsets?.section1 || { x: 0, y: 0 }
const section1Style = isSmall
  ? { width: "215px", marginTop: `${38 + section1Offset.y}px`, marginLeft: `${-14 + section1Offset.x}px` }
  : { width: "215px", marginTop: `${42 + section1Offset.y}px`, marginLeft: `${103 + section1Offset.x}px` }
```

## User Workflow

1. **Upload and Configure**: User uploads PDF and configures proportion data as normal
2. **Enable Edit Mode**: Check "Edit Generated Report" checkbox
3. **Submit**: Click "Submit Report" button
4. **Edit Page**: Redirected to editor with live preview
5. **Adjust Positions**: Click sections and use arrow buttons to move them
6. **Download**: Click "Download PDF" to get the final edited PDF

## Technical Details

### Data Flow
1. ReportProcessor processes PDF and collects report data
2. If editReport enabled, encodes data and redirects to `/editor`
3. Editor page decodes data and displays interactive preview
4. User adjusts positions, offsets stored in component state
5. Download button passes offsets to PDF component
6. PDF component applies offsets to render final output

### URL Parameters
- `data`: JSON-encoded report data
- `size`: PDF size ("17x11" or "14x8.5")
- `useGradingScales`: Boolean for grading scales variant
- `fileName`: Original suggested filename

### Offset System
- Each section has independent X and Y offsets (in pixels)
- Offsets accumulate (multiple arrow clicks compound)
- Reset button clears all offsets to 0
- Offsets are only applied during PDF render, not stored

## Files Created
- `/src/app/editor/page.tsx` - Interactive editor page

## Files Modified
- `/src/components/pdfToReport/ReportProcessor.tsx` - Added checkbox and redirect logic
- `/src/components/pdfToReport/StandardReports/InvoicePDF.tsx` - Added offset support
- `/src/components/pdfToReport/StandardReports/InvoicePDF-GradingScales.tsx` - Added offset support

## Future Enhancements
- Undo/Redo functionality for position adjustments
- Save/Load preset position configurations
- Visual grid overlay for precise alignment
- Batch edit mode for multiple reports
- Keyboard shortcuts for faster adjustments
