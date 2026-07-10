# LBD Diamonds Report - Developer Documentation

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                   ReportProcessor.tsx                    │
│  (Main component with 3 tabs: Standard, Mini, LBD)       │
└─────────┬───────────────────────────────────────────────┘
          │
          └─► LBDReportsSection.tsx
              ├─ Form UI (Client Name + PDF Upload)
              ├─ Validation logic
              ├─ Progress tracking
              └─ API integration
                 │
                 └─► apiClient.uploadIGIReport()
                     │
                     └─► Backend: POST /extract-igi-report
                         │
                         ├─ extract_data() → JSON
                         └─ extract_images() → Proportions, QR Code, etc.
                 │
                 └─► IGIReportPDF.tsx
                     │
                     └─► IGIReportContent.tsx
                         ├─ Overlay positioning
                         ├─ Data formatting
                         └─ Image rendering
                 │
                 └─► React PDF
                     └─► User download
```

## Component Hierarchy

### 1. **ReportProcessor** (Parent Container)
```
ReportProcessor
├─ StandardReportsSection (Tab 1)
├─ MiniReportsSection (Tab 2)
└─ LBDReportsSection (Tab 3) ← NEW
```

### 2. **LBDReportsSection** (Form Layer)
- Manages state: `clientName`, `uploadedFile`, `isLoading`, `loadingProgress`
- Handles: File validation, form submission, API calls
- Displays: Loading overlay with progress bar
- Returns: Triggers PDF generation and download

### 3. **IGIReportPDF** (PDF Document Wrapper)
- Creates React PDF Document with fixed dimensions
- Props: `data: IGIReportData`
- Responsibilities:
  - Font registration
  - Page setup (1008 × 612 points)
  - Background image rendering
  - Content overlay mounting

### 4. **IGIReportContent** (Content Overlay)
- Absolute positioning of report elements
- Data display sections
- Image rendering (QR code, proportions)
- Client name display

## Data Flow

```
User Input
    ↓
Form Validation
    ↓
API Call: uploadIGIReport()
    ↓
Backend Processing: /extract-igi-report
    ↓
Response: { data, images, image_urls }
    ↓
Data Merge: { ...data, clientName, ...images }
    ↓
PDF Generation: <IGIReportPDF data={mergedData} />
    ↓
Download: user browser saves file
```

## File Structure

```
clients/
├── src/
│   ├── components/
│   │   └── pdfToReport/
│   │       ├── ReportProcessor.tsx (MODIFIED)
│   │       ├── StandardReports/
│   │       │   ├── InvoicePDFSection4.tsx (FIXED: removed display: "flex")
│   │       │   └── ...
│   │       ├── MiniReports/
│   │       │   └── ...
│   │       └── LBDReports/ (NEW)
│   │           ├── LBDReportsSection.tsx
│   │           ├── IGIReportPDF.tsx
│   │           └── IGIReportContent.tsx
│   │
│   ├── hooks/
│   │   └── useReports.ts (MODIFIED - added useUploadIGIReport)
│   │
│   ├── lib/
│   │   └── apiClient.ts (MODIFIED - added uploadIGIReport)
│   │
│   └── app/
│       └── page.tsx
│
└── public/
    └── images/
        └── igi-report-template.jpg (NEW - 3.1 MB)
```

## Type Definitions

### IGIReportData Interface
```typescript
interface IGIReportData {
  ReportNumber?: string
  ReportDate?: string
  CaratWeight?: string
  ColorGrade?: string
  ClarityGrade?: string
  CutGrade?: string
  ShapeandCuttingStyle?: string
  Measurements?: string
  Polish?: string
  Symmetry?: string
  Fluorescence?: string
  clientName?: string
  Images?: {
    Proportions?: string
    QRCode?: string
  }
  [key: string]: any
}
```

## API Integration

### Endpoint
```
POST /extract-igi-report
```

### Request
```typescript
const response = await apiClient.uploadIGIReport(file, {
  clientName: "John Smith",
  onUploadProgress: (event) => setProgress(event.loaded / event.total * 100)
})
```

### Response Structure
```typescript
{
  data: {
    report_number: string
    report_date: string
    carat_weight: string
    color_grade: string
    clarity_grade: string
    cut_grade: string
    shape_and_cutting_style: string
    measurements: string
    polish: string
    symmetry: string
    fluorescence: string
  },
  report_number: string,
  images: {
    barcode: string
    qr_code: string
    proportions: string
    clarity_characteristics_full: string
    color_clarity_chart_full: string
  },
  image_urls: {
    // Same keys with /LBD-output URLs
  }
}
```

## Styling Approach

### React PDF Styles
```typescript
const styles = StyleSheet.create({
  page: {
    width: 1008,      // 14 inches in points
    height: 612,      // 8.5 inches in points
    fontSize: 9,
    fontFamily: "Helvetica",
    position: "relative"
  },
  backgroundImage: {
    position: "absolute",
    top: 0,
    left: 0,
    width: 1008,
    height: 612,
    zIndex: 0
  },
  contentOverlay: {
    position: "relative",
    width: "100%",
    height: "100%",
    zIndex: 1
  }
})
```

### Content Positioning
- **Left Column (20px from left):** Proportions & Grading Info
- **Right Column (20px from right):** Report Details
- **Bottom Left:** Client Name (with semi-transparent background)
- **Bottom Right:** QR Code (80×80px)
- **Bottom Center:** Proportions Diagram (120×120px)

## Validation Rules

### Client Name
- ✅ Required field
- ✅ Accepts letters, numbers, spaces, hyphens
- ✅ Sanitized for filename (spaces → underscores)
- ✅ Max 100 characters recommended

### PDF File
- ✅ Type: PDF only
- ✅ Max size: 100 MB (backend limit)
- ✅ Must be valid IGI report
- ✅ Not password-protected

## Error Handling

### Error Types & Responses
```typescript
// File validation
if (!file.type.includes('pdf')) {
  toast.error("Invalid file type. Please upload a PDF file.")
}

// Form validation
if (!uploadedFile) {
  toast.error("Please upload a PDF file")
}
if (!clientName.trim()) {
  toast.error("Please enter a client name")
}

// API errors
catch (error: any) {
  toast.error(
    error.message || 
    "Failed to generate IGI report. Please ensure the backend is running..."
  )
}
```

## Performance Optimization

### Current Optimizations
- ✅ Image background serves from CDN at `public/images/`
- ✅ Font files cached in Next.js public directory
- ✅ PDF generation happens client-side (no round-trip)
- ✅ Lazy loading of components via Next.js dynamic imports

### Potential Improvements
```typescript
// Code splitting (Future)
const IGIReportPDF = dynamic(() => import('./IGIReportPDF'), {
  ssr: false,
  loading: () => <p>Loading PDF renderer...</p>
})

// Image optimization
// Consider serving as WebP with fallback
// CDN caching headers for template image

// PDF file size optimization
// Remove unnecessary styles
// Compress embedded images
```

## Testing Guide

### Unit Tests Example
```typescript
// LBDReportsSection.test.tsx
describe('LBDReportsSection', () => {
  test('renders form with client name and file inputs', () => {
    render(<LBDReportsSection />)
    expect(screen.getByLabelText('Client Name')).toBeInTheDocument()
    expect(screen.getByLabelText('PDF Document')).toBeInTheDocument()
  })

  test('disables submit button when form incomplete', () => {
    render(<LBDReportsSection />)
    const submitBtn = screen.getByRole('button', { name: /Generate/i })
    expect(submitBtn).toBeDisabled()
  })

  test('calls uploadIGIReport on form submission', async () => {
    const mockUpload = jest.fn().mockResolvedValue({})
    // ... test implementation
  })
})
```

### Integration Tests Example
```typescript
// Integration with backend
test('End-to-end: Upload PDF -> Extract Data -> Generate Report', async () => {
  // 1. Render component
  // 2. Fill client name
  // 3. Upload test PDF
  // 4. Click generate
  // 5. Verify PDF download triggered
  // 6. Verify download filename format
})
```

## Debugging

### Console Logging
The implementation includes debug logs:
```typescript
console.log("[v0] IGI Report Data:", reportData)
console.log("[v0] Fetched reports:", data)
console.log("[v0] Error processing PDFs:", error)
```

### Browser DevTools
1. **Network Tab:**
   - Check `/extract-igi-report` POST request
   - Verify response structure
   - Monitor upload progress

2. **Console Tab:**
   - Look for `[v0]` prefixed logs
   - Check for API errors
   - Verify TypeScript errors

3. **React DevTools:**
   - Inspect LBDReportsSection state
   - Check prop values
   - Monitor re-renders

## Future Enhancements

### 1. Advanced Features
```typescript
// Multiple client names with multi-language support
interface ClientInfo {
  primaryName: string
  localizedNames: Record<string, string>
  title?: string
  company?: string
}

// Custom report sections selection
interface ReportOptions {
  includeSections: ('proportions' | 'grading' | 'images' | 'qrcode')[]
  layout: 'compact' | 'standard' | 'detailed'
  colorScheme: 'light' | 'dark'
}
```

### 2. Batch Processing
```typescript
// Process multiple PDFs
async function batchGenerateReports(files: File[], clientNames: string[]) {
  const results: string[] = []
  for (let i = 0; i < files.length; i++) {
    const pdf = await generateReport(files[i], clientNames[i])
    results.push(pdf)
  }
  return results
}
```

### 3. Report Caching
```typescript
// Cache generated reports by report number + client name
const cache = new Map<string, Blob>()
function getCacheKey(reportNumber: string, clientName: string): string {
  return `${reportNumber}_${clientName}`
}
```

### 4. Email Integration
```typescript
// Send report directly to email
async function emailReport(pdf: Blob, email: string, clientName: string) {
  const formData = new FormData()
  formData.append('pdf', pdf)
  formData.append('email', email)
  formData.append('clientName', clientName)
  
  return fetch('/api/email-report', {
    method: 'POST',
    body: formData
  })
}
```

## Deployment Checklist

- ✅ All files committed to `diamond-report-generation` branch
- ✅ Build passes without errors: `npm run build`
- ✅ TypeScript type checks pass
- ✅ No console errors in development
- ✅ IGI template image deployed to `public/images/`
- ✅ Backend `/extract-igi-report` endpoint verified
- ✅ CORS headers configured
- ✅ Environment variables set (if any)
- ✅ API rate limiting configured
- ✅ File upload size limits set

## Support & Maintenance

### Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| "API error" | Backend down | Verify backend is running on correct port |
| PDF blank | Background image missing | Check `public/images/igi-report-template.jpg` exists |
| Slow generation | Large PDF | Consider implementing streaming or compression |
| CORS error | Domain not whitelisted | Add frontend domain to backend CORS config |

### Monitoring

```typescript
// Add metrics/logging
function trackReportGeneration(clientName: string, duration: number, status: 'success' | 'error') {
  analytics.track('report_generated', {
    client: clientName,
    duration,
    status,
    timestamp: new Date()
  })
}
```

## References

- **React PDF Docs:** https://react-pdf.org/
- **Next.js Docs:** https://nextjs.org/docs
- **React Query Docs:** https://tanstack.com/query/latest
- **Axios Documentation:** https://axios-http.com/

---

**Document Version:** 1.0  
**Last Updated:** July 10, 2026  
**Maintainer:** v0 AI Assistant
