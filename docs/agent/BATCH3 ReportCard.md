# BATCH 3: Report Card Config UI + Download Buttons

Read these files COMPLETELY before writing any code:

1. client/src/routes/Routes.tsx
2. client/src/features/settings/ (entire folder)
3. client/src/services/apiClient.ts
4. client/src/components/ (check what UI components exist)
5. client/src/store/toastStore.ts (for notifications)
6. client/src/features/results/pages/BroadsheetPage.tsx
7. client/src/features/results/pages/ (all pages)

Follow existing frontend patterns exactly.
Use existing components (Button, Input, etc.) 
where they exist rather than creating new ones.
All API calls go through apiClient.
All success/error feedback goes through toastStore.

═══════════════════════════════════════════════
PART A — REPORT CARD CONFIG SERVICE (Frontend)
═══════════════════════════════════════════════

Create client/src/services/reportCardConfigService.ts:

const BASE = '/v1/report-card-config';

export const reportCardConfigService = {
  async getConfig(): Promise<ApiResponse<ReportCardConfig>> {
    const { data } = await apiClient.get(BASE);
    return data;
  },

  async updateConfig(
    dto: UpdateReportCardConfigDto
  ): Promise<ApiResponse<ReportCardConfig>> {
    const { data } = await apiClient.patch(BASE, dto);
    return data;
  },

  async uploadImage(
    field: 'principalSignature' | 'schoolStamp',
    file: File,
  ): Promise<ApiResponse<{ field: string; url: string }>> {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await apiClient.post(
      `${BASE}/upload/${field}`, 
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return data;
  },
};

Create client/src/types/report-card-config.ts:

export interface ReportCardConfig {
  id: string;
  schoolId: string;
  template: 'classic' | 'modern' | 'detailed' | 'primary';
  accentColor: string;
  motto?: string;
  principalName?: string;
  principalSignature?: string;
  schoolStamp?: string;
  showRanking: boolean;
  showCumulative: boolean;
  showAffective: boolean;
  showPsychomotor: boolean;
  showTeacherRemark: boolean;
  showPrincipalRemark: boolean;
  showResumptionDate: boolean;
  showStamp: boolean;
  showPoweredBy: boolean;
  affectiveTraits?: string[];
  psychomotorTraits?: string[];
  footerText?: string;
  nextTermDate?: string;
}

export interface UpdateReportCardConfigDto {
  template?: string;
  accentColor?: string;
  motto?: string;
  principalName?: string;
  showRanking?: boolean;
  showCumulative?: boolean;
  showAffective?: boolean;
  showPsychomotor?: boolean;
  showTeacherRemark?: boolean;
  showPrincipalRemark?: boolean;
  showResumptionDate?: boolean;
  showStamp?: boolean;
  showPoweredBy?: boolean;
  affectiveTraits?: string[];
  psychomotorTraits?: string[];
  footerText?: string;
  nextTermDate?: string;
}

═══════════════════════════════════════════════
PART B — REPORT CARD SETTINGS PAGE
═══════════════════════════════════════════════

Create client/src/features/settings/pages/
ReportCardSettingsPage.tsx:

This is the main settings page where School Admins 
customize their report card. Build it with these 
sections using tabs or accordion panels:

--- TAB 1: TEMPLATE ---
Title: "Choose Your Report Card Style"

Show 4 template cards in a 2x2 grid. Each card:
- Template name (Classic/Modern/Detailed/Primary)
- Description text:
  Classic: "Traditional Nigerian school format with 
    full assessment breakdown"
  Modern: "Clean contemporary design with visual 
    score indicators"
  Detailed: "Comprehensive format including affective 
    and psychomotor domains"
  Primary: "Simplified child-friendly format for 
    nursery and primary schools"
- A selected indicator (blue border + checkmark when 
  active, gray border when not)
- Clicking selects that template

Below cards: Color picker for accent color
Label: "Brand Color"
Input: type="color" bound to accentColor value
Preview text showing the color applied to a sample 
header bar

--- TAB 2: SCHOOL IDENTITY ---
Title: "School Branding"

Fields:
- School Motto (text input)
- Principal Name (text input)
- Next Term Resumption Date (text input, 
  e.g. "6th January 2026")
- Footer Text (textarea, max 200 chars)

Upload sections (each with preview):

"Principal Signature"
- Current image preview (if exists) OR 
  placeholder "No signature uploaded"
- Upload button → file input (accepts image/*)
- Note: "Recommended: White background, 
  clear signature, max 2MB"
- On upload: call uploadImage('principalSignature', file)
- Show upload progress and success toast

"School Stamp"
- Same as above but for school stamp
- Call uploadImage('schoolStamp', file)

--- TAB 3: SECTIONS ---
Title: "Report Card Sections"
Subtitle: "Choose what appears on your report card"

Show toggle switches for each section:

[Toggle] Show Class Position/Ranking
  Sub-text: "Display student's position in class"

[Toggle] Show Cumulative Performance
  Sub-text: "Show performance across all 3 terms"

[Toggle] Show Affective Domain Assessment
  Sub-text: "Include behavior and character assessment"

[Toggle] Show Psychomotor Skills
  Sub-text: "Include practical skills assessment"

[Toggle] Class Teacher's Remark
  Sub-text: "Include space for teacher's comments"

[Toggle] Principal's Remark
  Sub-text: "Include space for principal's comments"

[Toggle] Next Term Resumption Date
  Sub-text: "Show when next term begins"

[Toggle] School Stamp
  Sub-text: "Display school stamp on report card"

[Toggle] "Powered by Gradellence" branding
  Sub-text: "Remove Gradellence branding 
             (Premium feature)"
  Note: If school is not on Premium plan, 
    show this toggle as disabled with tooltip:
    "Upgrade to Premium to remove Gradellence branding"

--- TAB 4: AFFECTIVE DOMAIN ---
(Only fully interactive if showAffective is true,
 otherwise show dimmed with message 
 "Enable Affective Domain in Sections tab first")

Title: "Affective Domain Traits"
Sub-text: "Customize the character traits assessed 
  on your report card"

Show current traits as a list of editable text inputs:
[Punctuality          ] [✕ remove]
[Neatness             ] [✕ remove]  
[Cooperation          ] [✕ remove]
[Attentiveness        ] [✕ remove]
[Politeness           ] [✕ remove]
[+ Add Trait          ]

"Psychomotor Skills Traits" section below:
Same editable list for psychomotorTraits

Note: "Maximum 8 traits per domain"

--- SAVE BUTTON ---
Fixed at bottom of page OR at bottom of each tab:
[Save Changes] button (btn-primary style)
  - On click: calls updateConfig() with all 
    current form values
  - Shows loading state during save
  - Shows success toast on completion
  - Shows error toast on failure

--- LIVE PREVIEW PANEL ---
On desktop (lg: breakpoint and above), show a 
side panel (1/3 width) with a scaled-down preview 
of the report card showing:
- The selected template style
- School colors applied
- Sample student data
- Which sections are visible

This preview updates in real-time as settings change.
Use CSS transform: scale(0.5) to shrink an A4 div.
Show dummy data: "Sample Student", "JSS2A", 
"2025/2026 1st Term"

On mobile, replace the preview with a 
[Preview Report Card] button that opens a modal 
showing the preview.

═══════════════════════════════════════════════
PART C — ADD ROUTE
═══════════════════════════════════════════════

In client/src/routes/Routes.tsx, add:

  <Route 
    path="/settings/report-card" 
    element={
      <ProtectedRoute roles={[ROLES.SCHOOL_ADMIN]}>
        <ReportCardSettingsPage />
      </ProtectedRoute>
    } 
  />

In the sidebar/navigation, add under Settings section:
  "Report Card" → /settings/report-card
  Use an icon like FileText or Layout from lucide-react

═══════════════════════════════════════════════
PART D — DOWNLOAD BUTTONS ON RESULTS PAGES
═══════════════════════════════════════════════

Add report card download functionality in 3 places:

--- D1: Student result view page ---
Find the page where a student/admin views one 
student's results (likely 
/results/student/:studentId or similar).

Add a "Download Report Card" button:

  const handleDownloadReportCard = async () => {
    try {
      setDownloading(true);
      const response = await apiClient.get(
        `/v1/results/report-card/${studentId}/${termId}`,
        { responseType: 'blob' }
      );
      
      const url = window.URL.createObjectURL(
        new Blob([response.data])
      );
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute(
        'download', 
        `report-card-${studentName}-${termName}.pdf`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toastStore.getState().addToast(
        'success', 
        'Report card downloaded successfully'
      );
    } catch (error) {
      toastStore.getState().addToast(
        'error', 
        'Failed to download report card'
      );
    } finally {
      setDownloading(false);
    }
  };

Button:
  <button 
    onClick={handleDownloadReportCard}
    disabled={downloading}
    className="btn-primary"
  >
    {downloading ? 'Generating PDF...' : 
      '⬇ Download Report Card'}
  </button>

Only show this button if results are published.
If not published, show greyed button with tooltip:
"Results must be published before downloading"

--- D2: Broadsheet page ---
Find BroadsheetPage.tsx.

Add two buttons in the header area:
1. "Download All Report Cards (ZIP)" 
   - Calls /v1/results/report-cards/class/:classId/:termId
   - Same blob download pattern as above
   - responseType: 'blob'
   - filename: `report-cards-${className}-${termName}.zip`
   - Show loading state: "Generating PDFs..."
   - Only visible to SCHOOL_ADMIN role

2. "Export Broadsheet (CSV)"
   - Already implemented or implement now
   - Downloads the broadsheet as a CSV file

--- D3: Parent portal ---
In the parent's StudentResultsPage.tsx:

Add "Download Report Card" button:
  - Same download pattern
  - Calls /v1/results/report-card/:studentId/:termId
  - Only show if results array is not empty
  - The parent's JWT is used for auth 
    (parentApi interceptor must attach token)

═══════════════════════════════════════════════
PART E — SCHOOL LOGO UPLOAD IN SETTINGS
═══════════════════════════════════════════════
NOTE: before you do anything THIS PAGE EXISTS IN THE PROJECT, CHECK WELL.
Find the existing school settings or profile page.
If it exists, add a logo upload section to it.
If it does not exist, create a basic 
SchoolProfilePage.tsx with:
- School name display (read-only, from registration)
- School address (editable)
- School phone (editable)
- School email (editable)
- Logo upload:
  - Show current logo if exists
  - Upload button → POST /api/v1/schools/upload-logo
  - Preview updates immediately after upload
  - Accepted: image/*, max 2MB

Add route: /settings/school-profile
Add to sidebar under Settings.

═══════════════════════════════════════════════
VERIFICATION
═══════════════════════════════════════════════

After completing all parts:

1. Run: cd client && npm run build
   Zero TypeScript errors required.

2. Verify these routes exist and load without errors:
   /settings/report-card
   /settings/school-profile

3. Verify download buttons appear on:
   - Student result page
   - Broadsheet page
   - Parent results page

4. Verify the Settings sidebar link exists and 
   navigates correctly.

5. Check that all API calls use the correct 
   base URL pattern (/v1/...) consistent with 
   the rest of the codebase.

6. Check that file uploads use FormData correctly 
   and the Content-Type header is set to 
   multipart/form-data.

7. Verify that the showPoweredBy toggle is disabled 
   (not interactive) for non-premium schools 
   with appropriate tooltip.

8. Report all files created or modified.
   Flag any decisions made that were not specified.
   Flag any items that need human input 
   (e.g. actual school logo images for testing).
