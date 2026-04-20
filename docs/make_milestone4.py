"""
Generates docs/milestone4-report.docx
Milestone 4 submission - Team Claudius (Group 61)
Matches Milestone 3 document style exactly.
"""

from docx import Document
from docx.shared import Pt, RGBColor, Inches, Cm
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

doc = Document()

section = doc.sections[0]
section.page_width    = Cm(21)
section.page_height   = Cm(29.7)
section.top_margin    = Cm(2.54)
section.bottom_margin = Cm(2.54)
section.left_margin   = Cm(2.54)
section.right_margin  = Cm(2.54)

styles = doc.styles

# Match M3 heading style (blue #1F497D)
BLUE = (31, 73, 125)
GREEN = (0, 128, 0)

def set_style(name, size, bold=False, color=None, before=0, after=6):
    s = styles[name]
    f = s.font
    f.name = 'Calibri'
    f.size = Pt(size)
    f.bold = bold
    if color:
        f.color.rgb = RGBColor(*color)
    pf = s.paragraph_format
    pf.space_before = Pt(before)
    pf.space_after  = Pt(after)

set_style('Normal',    11, after=4)
set_style('Heading 1', 16, bold=True, color=BLUE, before=14, after=6)
set_style('Heading 2', 13, bold=True, color=BLUE, before=10, after=4)
set_style('Heading 3', 11, bold=True, color=(32, 33, 36), before=8, after=3)


def para(text, bold=False, italic=False, size=11, after=4, color=None, align=None):
    p = doc.add_paragraph()
    p.paragraph_format.space_after = Pt(after)
    if align:
        p.alignment = align
    r = p.add_run(text)
    r.font.name = 'Calibri'
    r.font.size = Pt(size)
    r.bold      = bold
    r.italic    = italic
    if color:
        r.font.color.rgb = RGBColor(*color)
    return p

def bullet(text):
    p = doc.add_paragraph(style='List Bullet')
    p.paragraph_format.space_after = Pt(2)
    r = p.add_run(text)
    r.font.name = 'Calibri'
    r.font.size = Pt(11)
    return p

def shade_cell(cell, hex_color):
    tc   = cell._tc
    tcPr = tc.get_or_add_tcPr()
    shd  = OxmlElement('w:shd')
    shd.set(qn('w:val'),   'clear')
    shd.set(qn('w:color'), 'auto')
    shd.set(qn('w:fill'),  hex_color)
    tcPr.append(shd)

def cell_text(cell, text, bold=False, size=10, align=WD_ALIGN_PARAGRAPH.LEFT, color=None):
    cell.text = ''
    p = cell.paragraphs[0]
    p.alignment = align
    p.paragraph_format.space_after  = Pt(1)
    p.paragraph_format.space_before = Pt(1)
    r = p.add_run(text)
    r.font.name = 'Calibri'
    r.font.size = Pt(size)
    r.bold = bold
    if color:
        r.font.color.rgb = RGBColor(*color)

def make_table(headers, rows, widths, hcolor='BDD7EE'):
    t = doc.add_table(rows=1 + len(rows), cols=len(headers))
    t.style = 'Table Grid'
    t.alignment = WD_TABLE_ALIGNMENT.LEFT
    hr = t.rows[0]
    for i, h in enumerate(headers):
        c = hr.cells[i]
        shade_cell(c, hcolor)
        cell_text(c, h, bold=True, size=10)
    for ri, row in enumerate(rows):
        tr = t.rows[ri + 1]
        if ri % 2 == 1:
            for c in tr.cells:
                shade_cell(c, 'F2F2F2')
        for ci, val in enumerate(row):
            is_pass = str(val) == 'PASS'
            cell_text(tr.cells[ci], str(val), size=9,
                      color=GREEN if is_pass else None)
    for i, w in enumerate(widths):
        for row in t.rows:
            row.cells[i].width = Inches(w)
    doc.add_paragraph()
    return t

# Feedback table (2-col colored rows like M3 bug tables)
def feedback_table(title, rows_dict):
    para(title, bold=True, size=11, after=2)
    t = doc.add_table(rows=len(rows_dict), cols=2)
    t.style = 'Table Grid'
    t.alignment = WD_TABLE_ALIGNMENT.LEFT
    colors = ['FDEBD0', 'FDF2CC', 'E2EFDA']  # orange, yellow, green cycle
    for ri, (label, value) in enumerate(rows_dict.items()):
        c = colors[ri % len(colors)]
        r = t.rows[ri]
        shade_cell(r.cells[0], c)
        shade_cell(r.cells[1], c)
        cell_text(r.cells[0], label, bold=True, size=10)
        cell_text(r.cells[1], value, size=10)
    r0 = t.rows[0]
    r0.cells[0].width = Inches(1.5)
    r0.cells[1].width = Inches(5.0)
    doc.add_paragraph()

# ================================================================
# COVER PAGE
# ================================================================
doc.add_paragraph()
para('Milestone 4', bold=True, size=22, after=4, align=WD_ALIGN_PARAGRAPH.CENTER)
para('A Software Engineering Project', bold=True, size=13, after=16, align=WD_ALIGN_PARAGRAPH.CENTER)
para('Submitted by Team Claudius (61)', size=11, after=8, align=WD_ALIGN_PARAGRAPH.CENTER)

# Team table
t = doc.add_table(rows=5, cols=2)
t.style = 'Table Grid'
t.alignment = WD_TABLE_ALIGNMENT.CENTER
members = [
    ('Team Member Name', 'Team Member Roll Number'),
    ('Arya Agrahari',    '22f3002771@ds.study.iitm.ac.in'),
    ('Akash Mishra',     '22f1001716@ds.study.iitm.ac.in'),
    ('Karram Swatej Reddy', '22f1000024@ds.study.iitm.ac.in'),
    ('Shruti Dutta',     '21f3002888@ds.study.iitm.ac.in'),
]
for ri, (n, r) in enumerate(members):
    is_hdr = ri == 0
    shade_cell(t.rows[ri].cells[0], 'BDD7EE' if is_hdr else 'FFFFFF')
    shade_cell(t.rows[ri].cells[1], 'BDD7EE' if is_hdr else 'FFFFFF')
    cell_text(t.rows[ri].cells[0], n, bold=is_hdr, size=10)
    cell_text(t.rows[ri].cells[1], r, bold=is_hdr, size=10)
for row in t.rows:
    row.cells[0].width = Inches(2.5)
    row.cells[1].width = Inches(3.5)

doc.add_paragraph()
para('IITM Online BS Degree Program,', size=11, after=2, align=WD_ALIGN_PARAGRAPH.CENTER)
para('Indian Institute of Technology, Madras, Chennai', size=11, after=2, align=WD_ALIGN_PARAGRAPH.CENTER)
para('Tamil Nadu, India, 600036', size=11, after=0, align=WD_ALIGN_PARAGRAPH.CENTER)
doc.add_page_break()

# ================================================================
# TABLE OF CONTENT
# ================================================================
doc.add_heading('Table of Content', level=1)
toc_items = [
    ('1.', 'Sprint 2 Changes Based on User Feedback', '3'),
    ('',   'Bug Fixes Carried Forward from Sprint 1', '3'),
    ('',   'User Feedback Addressed in Sprint 2', '4'),
    ('',   'Sprint 2 Planned Items: Status', '5'),
    ('2.', 'Comprehensive Test Cases', '6'),
    ('',   '2.1  Authentication', '6'),
    ('',   '2.2  User Management', '7'),
    ('',   '2.3  Store Configuration', '9'),
    ('',   '2.4  Categories and Price Bands', '11'),
    ('',   '2.5  Inventory Batches', '12'),
    ('',   '2.6  Sales and Returns', '14'),
    ('',   '2.7  Vendors and Reorders', '16'),
    ('',   '2.8  Attendance and GPS Geofencing', '18'),
    ('',   '2.9  Dashboard, Leaderboard, and Audit', '20'),
    ('',   'Test Suite Summary', '21'),
    ('3.', 'Proof of Frontend Modification', '22'),
    ('',   '3.1  API Client Module', '22'),
    ('',   '3.2  Login and Register Pages', '22'),
    ('',   '3.3  Dashboard Page', '23'),
    ('',   '3.4  POS Page', '23'),
    ('',   '3.5  Inventory Page', '23'),
    ('',   '3.6  Procurement Page', '24'),
    ('',   '3.7  Staff Page', '24'),
    ('',   '3.8  Settings Page', '24'),
]
toc_t = doc.add_table(rows=len(toc_items), cols=3)
toc_t.style = 'Table Grid'
for ri, (num, name, pg) in enumerate(toc_items):
    toc_t.rows[ri].cells[0].width = Inches(0.35)
    toc_t.rows[ri].cells[1].width = Inches(5.5)
    toc_t.rows[ri].cells[2].width = Inches(0.5)
    cell_text(toc_t.rows[ri].cells[0], num,  size=10, bold=(num != ''))
    cell_text(toc_t.rows[ri].cells[1], name, size=10, bold=(num != ''))
    cell_text(toc_t.rows[ri].cells[2], pg,   size=10, align=WD_ALIGN_PARAGRAPH.RIGHT)
    for c in toc_t.rows[ri].cells:
        shade_cell(c, 'FFFFFF')
doc.add_paragraph()
doc.add_page_break()

# ================================================================
# SECTION 1: SPRINT 2 CHANGES BASED ON USER FEEDBACK
# ================================================================
doc.add_heading('1. Sprint 2 Changes Based on User Feedback', level=1)
para(
    'This section documents all changes made in Sprint 2 in direct response to the bugs, '
    'user feedback, and planned improvements identified in the Milestone 3 report. '
    'Each item is traced back to its original report entry.'
)

doc.add_heading('Bug Fixes Carried Forward from Sprint 1', level=2)
para(
    'The following 7 bugs were identified during Sprint 1 testing and resolved before '
    'Milestone 3 delivery. They are included here for completeness as part of the '
    'change documentation.'
)

make_table(
    ['Bug ID', 'Title', 'Root Cause', 'Fix Applied'],
    [
        ['BUG-01', 'GPS Geofencing Non-Functional',
         'GPS enforcement flags were stored only in Zustand (browser memory) and never written to the database. The attendance service always read from an empty gps_settings row.',
         'Added gps_require_clock_in and gps_require_clock_out columns to the stores table. PATCH /store/gps-settings persists both flags. The attendance service now reads them from the store row on every request.'],
        ['BUG-02', 'Returns: column "store_id" does not exist',
         'The SQL query in the returns service attempted to read store_id from the sale_items table, which does not have that column.',
         'Changed the query to pass storeId as a bind parameter ($3). The value is already available from the authenticated request context.'],
        ['BUG-03', 'Returns: Inconsistent Types for Parameter $1',
         'The same bind parameter $1 appeared in both an integer comparison and arithmetic multiplication in the same query, causing PostgreSQL type inference to fail.',
         'Added explicit type casts: $1::int for the WHERE clause and $1::numeric for the multiplication expression.'],
        ['BUG-04', 'Vendor Soft-Delete: Second Delete Returns 200',
         'The UPDATE used WHERE id = $1 without checking is_active. PostgreSQL reported rowsAffected = 1 even when setting is_active = FALSE on a row already set to false.',
         'Added AND is_active = TRUE to the WHERE clause. A second delete now returns rowsAffected = 0 and the service correctly responds with 404.'],
        ['BUG-05', 'Inventory Matrix: Hardcoded Stock Assertion Fails',
         'An earlier test in the same suite added 2 units to trigger the low-stock filter. Tests share one database session, so the matrix test saw stock of 22 instead of 20.',
         'Changed expect(stockAt299).toBe(20) to expect(stockAt299).toBeGreaterThanOrEqual(20).'],
        ['BUG-06', 'Jest 30 and ts-jest 29 Version Incompatibility',
         'Jest 30 changed internal module resolution APIs incompatible with ts-jest 29. Wrong relative import paths in test files compounded the issue.',
         'Pinned Jest to 29.7.0. Updated jest.config.ts to use the explicit transform key. Corrected all relative import paths.'],
        ['BUG-07', 'node_modules Directory Committed to Git',
         'No .gitignore file existed at the repository root, so the entire backend/node_modules directory was tracked.',
         'Created a root-level .gitignore excluding node_modules/, dist/, .env, and *.env.local. Ran git rm -r --cached backend/node_modules to untrack the directory.'],
    ],
    widths=[0.7, 1.4, 2.4, 2.0],
)

doc.add_heading('User Feedback Addressed in Sprint 2', level=2)
para(
    'Feedback was collected from the primary user interview with Bombay Fashion and from '
    'internal team review sessions. The following 6 items were reported in Milestone 3 '
    'Section 12.'
)

feedback_table('[Bug Report] GPS Distance Shows Absurd Value on Clock-In Screen (Story 7.1)', {
    'Reported By':        'Internal testing session',
    'Observation':        'The ClockWidget displayed "393191m from store." Store GPS coordinates defaulted to 0, 0 (Gulf of Guinea), so any real device produced a huge haversine distance.',
    'Change Made':        'The ClockWidget component now checks whether gpsLatitude and gpsLongitude are both 0. If they are, it considers GPS as not configured and hides the distance indicator entirely. The condition is: gpsConfigured = store.gpsLatitude !== 0 || store.gpsLongitude !== 0. Distance is only shown when gpsConfigured is true.',
    'Status':             'Resolved in Sprint 2',
})

feedback_table('[Bug Report] GPS Enforcement Toggles Have No Effect on Clock-In (Story 7.1)', {
    'Reported By':        'Internal testing session',
    'Observation':        'Enabling "Require GPS on Clock-In" in Settings did nothing. Staff could clock in from any location regardless of the toggle state.',
    'Change Made':        'Documented as BUG-01 above. The GPS require flags are now persisted to the stores table via PATCH /store/gps-settings. The StaffPage calls this API whenever the toggle is changed. The attendance service reads the flags from the database on every clock-in and clock-out request.',
    'Status':             'Resolved - documented as BUG-01',
})

feedback_table('[UX Feedback] API Documentation Used Emojis Inconsistent with Formal Submission', {
    'Reported By':        'Team review referencing Milestone 1 PDF',
    'Observation':        'The OpenAPI YAML description used emoji section headers inconsistent with the professional tone of the IIT Madras submission.',
    'Change Made':        'The entire OpenAPI description block in docs/api.yaml was rewritten using the exact 8 EPICs and 20 user stories from the Milestone 1 PDF. All emojis were removed. Section headers now match the formal EPIC numbering from the original specification.',
    'Status':             'Resolved in Sprint 2',
})

feedback_table('[Feature Gap] Reorder Message Must Be Sent Manually (Story 5.2)', {
    'Reported By':        'Bombay Fashion interview',
    'Observation':        'The system generates a reorder message but the manager must copy it into WhatsApp manually. The store manages over 100 vendors and this is error-prone at scale.',
    'Change Made':        'The reorder message generation is now more reliable. messageText is computed server-side and stored in the reorders table on creation, so it is always consistent with the actual order items. The frontend displays the message with a "Copy to clipboard" affordance. Full email or SMS dispatch integration requires a third-party gateway and is deferred to Sprint 3 per the Milestone 1 specification.',
    'Status':             'Partial - message generation improved; gateway dispatch deferred to Sprint 3',
})

feedback_table('[UX Feedback] Billing Mode Switch Has No Confirmation Step (Story 3.2)', {
    'Reported By':        'Internal team review',
    'Observation':        'Switching from Structured to Ephemeral mode immediately removes permanent sale retention. No confirmation dialog warned the owner of the consequences.',
    'Change Made':        'The BillingModeToggle component now displays an inline warning note on the Ephemeral card reading "GST-safe: mandatory records are never deleted" and the two mode cards use distinct visual styling so the difference is clear before selection. A full modal confirmation dialog is planned for Sprint 3.',
    'Status':             'Partial - inline warning added; modal confirmation deferred to Sprint 3',
})

feedback_table('[Feature Gap] No Quick Scan Entry for Price Band Selection (Story 3.1)', {
    'Reported By':        'Bombay Fashion interview',
    'Observation':        'Staff must scroll a dropdown to find a price band during billing. A barcode or QR scan shortcut was requested for faster shop-floor entry.',
    'Change Made':        'No change in this sprint. The BarcodeDetector API on Android Chrome is still marked as experimental and has inconsistent availability. Investigation is ongoing. This item remains planned for Sprint 3.',
    'Status':             'Deferred to Sprint 3',
})

doc.add_heading('Sprint 2 Planned Items: Status', level=2)
make_table(
    ['Improvement', 'Category', 'Story', 'Description', 'Sprint 2 Status'],
    [
        ['Frontend API integration', 'Core', 'All', 'Wire all frontend pages to real backend APIs replacing static mock data.', 'Completed'],
        ['GPS toggle persistence (BUG-01)', 'Bug Fix', '7.1', 'GPS require flags written to database and enforced server-side.', 'Completed'],
        ['GPS distance display fix', 'Bug Fix', '7.1', 'Hide distance indicator when store coordinates are not configured.', 'Completed'],
        ['API documentation cleanup', 'UX', 'All', 'Remove emojis from OpenAPI YAML; align with M1 EPICs.', 'Completed'],
        ['Billing mode inline warning', 'UX Safety', '3.2', 'Add a visible note to the Ephemeral card describing the data loss risk.', 'Completed'],
        ['Dashboard response caching', 'Performance', '8.1, 8.2', '5-minute in-process cache for /dashboard/summary and /dashboard/daily-summary.', 'Deferred to Sprint 3'],
        ['Billing mode confirmation modal', 'UX Safety', '3.2', 'Modal confirmation before switching to Ephemeral mode.', 'Deferred to Sprint 3'],
        ['Reorder SMS/email gateway', 'Feature', '5.2', 'Dispatch reorder message directly to vendor without copy-paste.', 'Deferred to Sprint 3'],
        ['Automated end-of-day clock-out', 'Feature', '7.1', 'Scheduled job at 23:59 to force-clock-out any staff still clocked in.', 'Deferred to Sprint 3'],
        ['Barcode scan for price band', 'UX', '3.1', 'BarcodeDetector API investigation for mobile billing screen.', 'Deferred to Sprint 3'],
        ['Rate limiting on auth endpoints', 'Security', '1.1, 1.2', '10 req/min per IP on POST /auth/login and POST /auth/register.', 'Deferred to Sprint 3'],
    ],
    widths=[1.2, 0.9, 0.55, 2.7, 1.1],
)

doc.add_page_break()

# ================================================================
# SECTION 2: COMPREHENSIVE TEST CASES
# ================================================================
doc.add_heading('2. Comprehensive Test Cases', level=1)
para(
    'All tests are integration tests executed against a dedicated PostgreSQL test database '
    'using Jest 29.7.0 and Supertest 7.x. Each test suite calls resetDb() in its beforeAll '
    'block, which drops and recreates all tables and re-seeds a consistent baseline: one '
    'store, one owner, one manager, one staff member, one category, one price band at 299, '
    'one vendor, and one inventory batch of 20 units. Tests are run serially using '
    '--runInBand to prevent concurrent access to the shared test database.'
)

# 5-column test table helper matching M3 exactly
def test_table(rows):
    """rows: list of (id, description, input, expected, status)"""
    make_table(
        ['ID', 'Test Description', 'Input', 'Expected', 'Result'],
        rows,
        widths=[0.55, 2.1, 1.85, 1.45, 0.5],
    )

# 2.1 Authentication
doc.add_heading('2.1  Authentication', level=2)
para('POST /api/auth/register', bold=True)
test_table([
    ('TC-01', 'Create store and owner account', 'Valid shopName, ownerName, email, phone, password, address', '201 + token + user object', 'PASS'),
    ('TC-02', 'Accept optional logo field', 'Valid body with logo URL', '201 + token', 'PASS'),
    ('TC-03', 'Reject duplicate email', 'Email already registered', '400', 'PASS'),
    ('TC-04', 'Reject duplicate shop name', 'shopName already in use', '400', 'PASS'),
    ('TC-05', 'Reject missing shopName', 'Body without shopName', '400', 'PASS'),
    ('TC-06', 'Reject missing ownerName', 'Body without ownerName', '400', 'PASS'),
    ('TC-07', 'Reject missing email', 'Body without email', '400', 'PASS'),
    ('TC-08', 'Reject invalid email format', 'email: "notanemail"', '400', 'PASS'),
    ('TC-09', 'Reject phone not 10 digits', 'phone: "12345"', '400', 'PASS'),
    ('TC-10', 'Reject phone with non-digit chars', 'phone: "999999999a"', '400', 'PASS'),
    ('TC-11', 'Reject password shorter than 6 chars', 'password: "abc"', '400', 'PASS'),
    ('TC-12', 'Reject missing address', 'Body without address', '400', 'PASS'),
    ('TC-13', 'Reject empty body', '{}', '400', 'PASS'),
])

para('POST /api/auth/login', bold=True)
test_table([
    ('TC-14', 'Owner login with email and password', 'Correct email + password', '200 + JWT token', 'PASS'),
    ('TC-15', 'Manager login with email and password', 'Correct credentials', '200 + JWT token', 'PASS'),
    ('TC-16', 'Staff login with phone and PIN', 'Correct phone + 4-digit PIN', '200 + JWT token', 'PASS'),
    ('TC-17', 'Verify token is a valid JWT', 'Any successful login', '3-part dot-separated string', 'PASS'),
    ('TC-18', 'Reject wrong password', 'Correct email, wrong password', '401', 'PASS'),
    ('TC-19', 'Reject wrong PIN', 'Correct phone, wrong PIN', '401', 'PASS'),
    ('TC-20', 'Reject non-existent email', 'Unknown email address', '401', 'PASS'),
    ('TC-21', 'Reject non-existent phone', 'Unknown phone number', '401', 'PASS'),
    ('TC-22', 'Reject missing identifier', 'No email or phone in body', '400', 'PASS'),
    ('TC-23', 'Reject missing credential', 'Email present, no password', '400', 'PASS'),
    ('TC-24', 'Reject empty body', '{}', '400', 'PASS'),
    ('TC-25', 'Reject empty string identifier', 'identifier: ""', '400', 'PASS'),
    ('TC-26', 'Reject empty string credential', 'credential: ""', '400', 'PASS'),
    ('TC-27', 'Staff login via email fails gracefully', 'Staff has no password_hash set', '401 - no crash', 'PASS'),
    ('TC-28', 'Response never exposes password_hash or pin_hash', 'Any successful login', '200 - no sensitive fields', 'PASS'),
])

# 2.2 User Management
doc.add_heading('2.2  User Management', level=2)
test_table([
    ('TC-29', 'List users returns array with correct shape', 'Owner token', '200 + id, name, phone, role, isActive', 'PASS'),
    ('TC-30', 'Manager can list users', 'Manager token', '200', 'PASS'),
    ('TC-31', 'Staff can list users', 'Staff token', '200', 'PASS'),
    ('TC-32', 'No cross-store user data leakage', 'Owner - different store', 'Only own-store users returned', 'PASS'),
    ('TC-33', 'Owner adds staff user with phone and PIN', 'Owner token', '201 + user object', 'PASS'),
    ('TC-34', 'Owner adds manager with email and password', 'Owner token', '201 + user object', 'PASS'),
    ('TC-35', 'Manager can add staff', 'Manager token', '201', 'PASS'),
    ('TC-36', 'Staff cannot add users', 'Staff token', '403', 'PASS'),
    ('TC-37', 'Reject duplicate phone number', 'Owner token', '409', 'PASS'),
    ('TC-38', 'Reject staff PIN that is not 4 digits', 'Owner token', '400', 'PASS'),
    ('TC-39', 'Reject manager creation without password', 'Owner token', '400', 'PASS'),
    ('TC-40', 'Reject missing name field', 'Owner token', '400', 'PASS'),
    ('TC-41', 'Reject phone not 10 digits', 'Owner token', '400', 'PASS'),
    ('TC-42', 'Reject phone with non-digit characters', 'Owner token', '400', 'PASS'),
    ('TC-43', 'Reject invalid role value', 'Owner token', '400', 'PASS'),
    ('TC-44', 'Reject malformed email address', 'Owner token', '400', 'PASS'),
    ('TC-45', 'Owner updates user name', 'Owner token', '200 - name updated', 'PASS'),
    ('TC-46', 'Owner updates phone number', 'Owner token', '200', 'PASS'),
    ('TC-47', 'Manager can update a user', 'Manager token', '200', 'PASS'),
    ('TC-48', 'Staff cannot update users', 'Staff token', '403', 'PASS'),
    ('TC-49', 'Update non-existent user returns 404', 'Owner token', '404', 'PASS'),
    ('TC-50', 'Reject cross-store update attempt', 'Owner - other store', '404', 'PASS'),
    ('TC-51', 'Reject non-numeric user ID', 'Owner token', '400', 'PASS'),
    ('TC-52', 'Empty body returns user unchanged', 'Owner token', '200 - no change', 'PASS'),
    ('TC-53', 'Owner soft-deletes staff user', 'Owner token', '200 + user absent from GET', 'PASS'),
    ('TC-54', 'Owner cannot delete themselves', 'Owner token', '403 - protected', 'PASS'),
    ('TC-55', 'Manager cannot delete users', 'Manager token', '403', 'PASS'),
    ('TC-56', 'Password change requires correct current password', 'Owner token', '401 if current password wrong', 'PASS'),
    ('TC-57', 'Enforce minimum 6-character new password', 'Owner token', '400 if too short', 'PASS'),
    ('TC-58', 'PIN change only valid for staff role', 'Owner token', '400 if applied to manager or owner', 'PASS'),
    ('TC-59', 'Staff can update their own avatar', 'Staff token', '200', 'PASS'),
    ('TC-60', 'Staff cannot update another user avatar', 'Staff token', '403', 'PASS'),
    ('TC-61', 'Unauthenticated requests rejected on all user routes', 'No token', '401', 'PASS'),
])

# 2.3 Store Configuration
doc.add_heading('2.3  Store Configuration', level=2)
test_table([
    ('TC-62', 'Owner updates store name and address', 'Valid PATCH body', '200 + updated store object', 'PASS'),
    ('TC-63', 'Manager cannot update store profile', 'Manager token', '403', 'PASS'),
    ('TC-64', 'Staff cannot update store profile', 'Staff token', '403', 'PASS'),
    ('TC-65', 'GET /store returns correct shape', 'Owner token', 'id, name, address, logo, billingMode, retentionDays, GPS fields', 'PASS'),
    ('TC-66', 'Owner switches billing mode to ephemeral', 'billingMode: "ephemeral"', '200', 'PASS'),
    ('TC-67', 'Owner switches billing mode to structured', 'billingMode: "structured"', '200', 'PASS'),
    ('TC-68', 'Switching to structured clears retentionDays', 'billingMode: "structured"', '200 + retentionDays null', 'PASS'),
    ('TC-69', 'Reject invalid billing mode value', 'billingMode: "unknown"', '400', 'PASS'),
    ('TC-70', 'Reject missing billingMode field', 'Empty body', '400', 'PASS'),
    ('TC-71', 'Manager cannot change billing mode', 'Manager token', '403', 'PASS'),
    ('TC-72', 'Owner sets retentionDays to 7', 'retentionDays: 7', '200', 'PASS'),
    ('TC-73', 'Owner sets retentionDays to 14', 'retentionDays: 14', '200', 'PASS'),
    ('TC-74', 'Owner sets retentionDays to 30', 'retentionDays: 30', '200', 'PASS'),
    ('TC-75', 'Owner sets retentionDays to 90', 'retentionDays: 90', '200', 'PASS'),
    ('TC-76', 'Owner sets retentionDays to null (unlimited)', 'retentionDays: null', '200', 'PASS'),
    ('TC-77', 'Reject retentionDays value of 0', 'retentionDays: 0', '400', 'PASS'),
    ('TC-78', 'Reject retentionDays value of 15', 'retentionDays: 15', '400', 'PASS'),
    ('TC-79', 'Reject retentionDays value of 365', 'retentionDays: 365', '400', 'PASS'),
    ('TC-80', 'Reject string value for retentionDays', 'retentionDays: "weekly"', '400', 'PASS'),
    ('TC-81', 'Manager cannot update retention setting', 'Manager token', '403', 'PASS'),
    ('TC-82', 'Owner sets GPS coordinates and geofence radius', 'Valid lat, lng, radiusM', '200 + persisted values', 'PASS'),
    ('TC-83', 'GPS settings reflected in subsequent GET /store', 'Owner token', '200 + confirmed in DB', 'PASS'),
    ('TC-84', 'gpsRequireClockIn = true persisted to database', 'gpsRequireClockIn: true', '200 + confirmed in DB row', 'PASS'),
    ('TC-85', 'gpsRequireClockOut = true persisted to database', 'gpsRequireClockOut: true', '200 + confirmed in DB row', 'PASS'),
    ('TC-86', 'Reject GPS latitude out of range (> 90)', 'gpsLatitude: 91', '400', 'PASS'),
    ('TC-87', 'Reject GPS latitude out of range (< -90)', 'gpsLatitude: -91', '400', 'PASS'),
    ('TC-88', 'Reject GPS longitude out of range (> 180)', 'gpsLongitude: 181', '400', 'PASS'),
    ('TC-89', 'Reject zero GPS radius', 'gpsRadiusM: 0', '400', 'PASS'),
    ('TC-90', 'Reject string values for GPS coordinates', 'gpsLatitude: "abc"', '400', 'PASS'),
    ('TC-91', 'Manager cannot update GPS settings', 'Manager token', '403', 'PASS'),
    ('TC-92', 'Staff cannot update GPS settings', 'Staff token', '403', 'PASS'),
    ('TC-93', 'Unauthenticated request rejected', 'No token', '401', 'PASS'),
])

# 2.4 Categories and Price Bands
doc.add_heading('2.4  Categories and Price Bands', level=2)
para('5.1  Categories', bold=True)
test_table([
    ('TC-94',  'Owner lists categories including seeded data', 'Owner token', '200 + array', 'PASS'),
    ('TC-95',  'Category response has correct shape', 'Owner token', 'id, name, storeId, createdAt present', 'PASS'),
    ('TC-96',  'No cross-store category leakage', 'Different store', 'Only own-store categories', 'PASS'),
    ('TC-97',  'Owner creates category', 'Valid name', '201 + created object', 'PASS'),
    ('TC-98',  'Manager creates category', 'Manager token', '201', 'PASS'),
    ('TC-99',  'Staff cannot create category', 'Staff token', '403', 'PASS'),
    ('TC-100', 'Reject empty category name', 'name: ""', '400', 'PASS'),
    ('TC-101', 'Reject duplicate category name in same store', 'Name already used', '409', 'PASS'),
    ('TC-102', 'New category visible in subsequent GET', 'POST then GET', 'Category in list', 'PASS'),
    ('TC-103', 'Category with active price bands protected from deletion', 'Delete with bands', 'Category still exists after attempt', 'PASS'),
])

para('5.2  Price Bands', bold=True)
test_table([
    ('TC-104', 'Owner creates price band under category', 'Valid categoryId and price', '201 + band object', 'PASS'),
    ('TC-105', 'Reject zero or negative price', 'price: 0', '400', 'PASS'),
    ('TC-106', 'Reject categoryId from another store', 'Foreign categoryId', '404', 'PASS'),
    ('TC-107', 'GET /price-bands/with-stock shows correct totals', 'Owner token', '200 + totalStock per band', 'PASS'),
    ('TC-108', 'Staff can read price bands', 'Staff token', '200', 'PASS'),
    ('TC-109', 'Staff cannot create price bands', 'Staff token', '403', 'PASS'),
    ('TC-110', 'Accept decimal prices', 'price: 149.5', '201', 'PASS'),
    ('TC-111', 'Reject categoryId that is a float', 'categoryId: 1.5', '400', 'PASS'),
    ('TC-112', 'Reject missing categoryId', 'Body without categoryId', '400', 'PASS'),
    ('TC-113', 'New band appears in GET /price-bands/with-stock with totalStock 0', 'POST then GET', 'totalStock is 0', 'PASS'),
    ('TC-114', 'price field is a number, not a string', 'Owner token', 'type: number', 'PASS'),
])

# 2.5 Inventory Batches
doc.add_heading('2.5  Inventory Batches', level=2)
test_table([
    ('TC-115', 'Owner adds batch of 20 units', 'Valid priceBandId, quantityAdded', '201 + quantityRemaining = quantityAdded', 'PASS'),
    ('TC-116', 'Manager adds batch', 'Manager token', '201', 'PASS'),
    ('TC-117', 'Staff cannot add batch', 'Staff token', '403', 'PASS'),
    ('TC-118', 'Batch without optional fields succeeds', 'No vendor, cost, or notes', '201 with nullable optional fields', 'PASS'),
    ('TC-119', 'Reject quantityAdded of zero', 'quantityAdded: 0', '400', 'PASS'),
    ('TC-120', 'Reject negative quantityAdded', 'quantityAdded: -5', '400', 'PASS'),
    ('TC-121', 'Reject float quantityAdded', 'quantityAdded: 1.5', '400 (integer required)', 'PASS'),
    ('TC-122', 'Reject priceBandId from another store', 'Foreign priceBandId', '404', 'PASS'),
    ('TC-123', 'Reject zero or negative costPrice', 'costPrice: 0', '400', 'PASS'),
    ('TC-124', 'Newly added batch appears in GET response', 'POST then GET', 'Batch visible in list', 'PASS'),
    ('TC-125', 'filter=low_stock returns batches below qty 10', '?filter=low_stock', '200 filtered array', 'PASS'),
    ('TC-126', 'filter=aging returns batches older than 60 days', '?filter=aging', '200 (empty for fresh test data)', 'PASS'),
    ('TC-127', 'filter=new_arrivals returns last 7 days', '?filter=new_arrivals', '200 including seeded batch', 'PASS'),
    ('TC-128', 'Reject invalid filter value', '?filter=invalid', '400', 'PASS'),
    ('TC-129', 'Margin computed when costPrice and price present', 'Batch with costPrice', 'margin field not null', 'PASS'),
    ('TC-130', 'Adjust quantity upward', 'Action adjust, higher qty', '200 + increased quantity', 'PASS'),
    ('TC-131', 'Adjust quantity downward', 'Action adjust, lower qty', '200 + decreased quantity', 'PASS'),
    ('TC-132', 'Adjust to zero depletes batch', 'Action adjust, quantity 0', '200 + quantity is 0', 'PASS'),
    ('TC-133', 'Reject negative quantity for adjust action', 'quantity: -1', '400', 'PASS'),
    ('TC-134', 'Staff cannot adjust batch', 'Staff token', '403', 'PASS'),
    ('TC-135', 'Adjustment reflected in subsequent GET', 'PATCH then GET', 'Updated quantity visible', 'PASS'),
    ('TC-136', 'Close batch sets quantityRemaining to zero', 'Action close', '200 + quantityRemaining is 0', 'PASS'),
    ('TC-137', 'Staff cannot close batch', 'Staff token', '403', 'PASS'),
    ('TC-138', 'Defective flag appends [DEFECTIVE] to notes', 'Action defective', '200 + notes contains [DEFECTIVE]', 'PASS'),
    ('TC-139', 'Defective flag appends to existing notes text', 'Batch with existing notes', '[DEFECTIVE] added to existing text', 'PASS'),
    ('TC-140', 'Defective on null notes sets notes to [DEFECTIVE]', 'Batch with null notes', 'notes becomes "[DEFECTIVE]"', 'PASS'),
    ('TC-141', 'Defective action does not change quantityRemaining', 'Action defective', 'Quantity unchanged after action', 'PASS'),
    ('TC-142', 'Reject invalid action value', 'action: "unknown"', '400', 'PASS'),
    ('TC-143', 'Non-existent batch ID returns 404', 'Invalid batch ID', '404', 'PASS'),
    ('TC-144', 'Stock matrix has correct category and band structure', 'Owner token', '200 + band "299" shows stock 20', 'PASS'),
    ('TC-145', 'Stock matrix values are non-negative integers', 'Owner token', 'All values >= 0', 'PASS'),
])

# 2.6 Sales and Returns
doc.add_heading('2.6  Sales and Returns', level=2)
para('7.1  Sales', bold=True)
test_table([
    ('TC-146', 'Staff creates a sale', 'Valid sale body', '201 + id + createdAt', 'PASS'),
    ('TC-147', 'Owner creates sale with UPI payment', 'paymentMethod: "upi"', '201', 'PASS'),
    ('TC-148', 'Manager creates sale with store credit', 'paymentMethod: "store_credit"', '201', 'PASS'),
    ('TC-149', 'FIFO deducts from oldest batch first then spills to newer', 'Qty exceeds oldest batch', '201 + oldest batch depleted first', 'PASS'),
    ('TC-150', 'Insufficient stock returns error with item name', 'Qty exceeds all stock', '400 with item name in error', 'PASS'),
    ('TC-151', 'Band with zero batches reports insufficient stock', 'Band exists, no batches', '400', 'PASS'),
    ('TC-152', 'Custom item with priceBandId 0 skips stock deduction', 'priceBandId: 0', '201 + stock unchanged', 'PASS'),
    ('TC-153', 'Custom item mixed with normal item deducts only normal', 'Mixed items array', '201 + only normal stock deducted', 'PASS'),
    ('TC-154', 'New customer created when phone first seen', 'New customerPhone', '201 + customer record in DB', 'PASS'),
    ('TC-155', 'Existing customer name updated on second sale', 'Same phone, different name', '201 + name updated', 'PASS'),
    ('TC-156', 'Sale without customerPhone creates no customer record', 'No customerPhone field', '201 + no customer inserted', 'PASS'),
    ('TC-157', 'discountAmount defaults to zero when omitted', 'No discountAmount in body', '201 + discountAmount is 0', 'PASS'),
    ('TC-158', 'Reject negative discountAmount', 'discountAmount: -10', '400', 'PASS'),
    ('TC-159', 'Reject invalid paymentMethod', 'paymentMethod: "crypto"', '400', 'PASS'),
    ('TC-160', 'Reject empty items array', 'items: []', '400', 'PASS'),
    ('TC-161', 'Reject item missing categoryName', 'Item without categoryName', '400', 'PASS'),
    ('TC-162', 'Reject item quantity less than 1', 'quantity: 0', '400', 'PASS'),
    ('TC-163', 'Reject non-10-digit customerPhone', 'customerPhone: "123"', '400', 'PASS'),
    ('TC-164', 'Reject unauthenticated request', 'No token', '401', 'PASS'),
])

para('7.2  Returns and Exchanges', bold=True)
test_table([
    ('TC-165', 'Owner creates return for existing sale', 'Valid saleId and items', '201', 'PASS'),
    ('TC-166', 'Manager creates return', 'Manager token', '201', 'PASS'),
    ('TC-167', 'Staff creates return (no role restriction)', 'Staff token', '201', 'PASS'),
    ('TC-168', 'Exchange type is accepted', 'type: "exchange"', '201', 'PASS'),
    ('TC-169', 'Full quantity return accepted', 'Return all sold units', '201', 'PASS'),
    ('TC-170', 'Stock restored to inventory after return', 'Partial return', 'quantityRemaining increases', 'PASS'),
    ('TC-171', 'Full return fully restores stock to original level', 'Return all units', 'Stock back to original level', 'PASS'),
    ('TC-172', 'Reject return quantity exceeding sold quantity', 'Return qty > sale qty', '400', 'PASS'),
    ('TC-173', 'Non-existent saleId returns 404', 'Invalid saleId', '404', 'PASS'),
    ('TC-174', 'Non-existent saleItemId returns 404', 'Invalid saleItemId', '404', 'PASS'),
    ('TC-175', 'Returns list ordered newest first', 'GET /api/returns', 'createdAt descending', 'PASS'),
    ('TC-176', 'Staff cannot list returns', 'Staff token', '403', 'PASS'),
    ('TC-177', 'Reject missing type field', 'Body without type', '400', 'PASS'),
    ('TC-178', 'Reject invalid type value', 'type: "unknown"', '400', 'PASS'),
    ('TC-179', 'Reject quantity of zero', 'quantity: 0', '400', 'PASS'),
])

# 2.7 Vendors and Reorders
doc.add_heading('2.7  Vendors and Reorders', level=2)
para('8.1  Vendors', bold=True)
test_table([
    ('TC-180', 'Owner creates vendor with name, phone, city', 'Full vendor body', '201 + vendor object', 'PASS'),
    ('TC-181', 'Vendor with name only (optional fields omitted)', 'Name only', '201 with nullable optional fields', 'PASS'),
    ('TC-182', 'Manager creates vendor', 'Manager token', '201', 'PASS'),
    ('TC-183', 'Staff cannot create vendor', 'Staff token', '403', 'PASS'),
    ('TC-184', 'Reject vendor name shorter than 2 characters', 'name: "A"', '400', 'PASS'),
    ('TC-185', 'Two vendors with same phone are allowed', 'Duplicate phone', '201 (no unique constraint)', 'PASS'),
    ('TC-186', 'Owner updates vendor name', 'Valid patch body', '200 + updated vendor', 'PASS'),
    ('TC-187', 'Manager updates vendor', 'Manager token', '200', 'PASS'),
    ('TC-188', 'Staff cannot update vendor', 'Staff token', '403', 'PASS'),
    ('TC-189', 'Owner soft-deletes vendor', 'Owner token', '200 + vendor absent from GET', 'PASS'),
    ('TC-190', 'Deleting already-deleted vendor returns 404', 'Second delete attempt', '404 not 200', 'PASS'),
    ('TC-191', 'Manager cannot delete vendor', 'Manager token', '403', 'PASS'),
    ('TC-192', 'Suggest-order returns per-band quantities', 'GET /vendors/:id/suggest-order', '200 + suggestedQty array', 'PASS'),
    ('TC-193', 'suggestedQty = max(0, ceil(dailyAvg x 14) - stock)', 'Vendor with sales history', 'Correct computed value', 'PASS'),
    ('TC-194', 'Suggest-order for non-existent vendor returns 404', 'Invalid vendorId', '404', 'PASS'),
])

para('8.2  Reorders', bold=True)
test_table([
    ('TC-195', 'Owner creates reorder with vendorId and items', 'Valid reorder body', '201 + reorder object', 'PASS'),
    ('TC-196', 'Manager creates reorder', 'Manager token', '201', 'PASS'),
    ('TC-197', 'Staff cannot create reorder', 'Staff token', '403', 'PASS'),
    ('TC-198', 'messageText generated with vendor name and items', 'Valid reorder', 'Non-empty formatted string', 'PASS'),
    ('TC-199', 'Items with finalQty 0 excluded from messageText', 'Item with finalQty: 0', 'Zero-qty items absent from text', 'PASS'),
    ('TC-200', 'messageText preserved and accessible via GET', 'GET after creation', 'Same text available later', 'PASS'),
    ('TC-201', 'Status updated to acknowledged', 'status: "acknowledged"', '200 + updated status', 'PASS'),
    ('TC-202', 'Status updated to fulfilled', 'status: "fulfilled"', '200 + updated status', 'PASS'),
    ('TC-203', 'Status updated to draft', 'status: "draft"', '200 + updated status', 'PASS'),
    ('TC-204', 'Reject invalid status value', 'status: "shipped"', '400', 'PASS'),
    ('TC-205', 'Non-existent reorder ID returns 404', 'Invalid reorderId', '404', 'PASS'),
    ('TC-206', 'Non-existent vendorId returns 404', 'Foreign vendorId', '404', 'PASS'),
    ('TC-207', 'Reorders list ordered by createdAt descending', 'GET /api/reorders', 'Newest reorder appears first', 'PASS'),
])

# 2.8 Attendance and GPS
doc.add_heading('2.8  Attendance and GPS Geofencing', level=2)
test_table([
    ('TC-208', 'Staff clocks in successfully', 'Valid lat and lng', '200 + clockedIn: true + checkInAt', 'PASS'),
    ('TC-209', 'Reject duplicate clock-in on same day', 'Staff already clocked in', '400 already clocked in', 'PASS'),
    ('TC-210', 'Owner clocks in without GPS requirement', 'GPS not required by default', '200', 'PASS'),
    ('TC-211', 'GPS required + coords within radius succeeds', 'gpsRequireClockIn: true, inside', '200', 'PASS'),
    ('TC-212', 'GPS required + coords outside radius rejected', 'gpsRequireClockIn: true, outside', '400 geofence error', 'PASS'),
    ('TC-213', 'GPS not required accepts coords outside radius', 'gpsRequireClockIn: false, outside', '200', 'PASS'),
    ('TC-214', 'Reject missing lat and lng fields', 'Body without coordinates', '400', 'PASS'),
    ('TC-215', 'Staff clocks out successfully after clock-in', 'Valid lat and lng', '200 + clockedIn: false + checkOutAt', 'PASS'),
    ('TC-216', 'Reject clock-out without prior clock-in', 'No clock-in record', '400', 'PASS'),
    ('TC-217', 'Reject second clock-out after already clocked out', 'Already has checkOutAt', '400', 'PASS'),
    ('TC-218', 'GPS not required allows clock-out from remote location', 'gpsRequireClockOut: false', '200', 'PASS'),
    ('TC-219', 'Attendance row records lat and lng in database', 'Clock-in then clock-out', 'check_in_lat and check_out_lat saved', 'PASS'),
    ('TC-220', 'Staff cannot view today roster', 'Staff token', '403', 'PASS'),
    ('TC-221', 'Owner can view today roster', 'Owner token', '200 + array', 'PASS'),
    ('TC-222', 'Manager can view today roster', 'Manager token', '200', 'PASS'),
    ('TC-223', 'Manager can force clock-out a staff member', 'Manager token + userId', '200', 'PASS'),
    ('TC-224', 'Unauthenticated clock-in rejected', 'No token', '401', 'PASS'),
    ('TC-225', 'Unauthenticated clock-out rejected', 'No token', '401', 'PASS'),
    ('TC-226', 'Roster entry has userId, name, clockedIn, checkInAt, checkOutAt', 'Owner token', 'Correct shape', 'PASS'),
    ('TC-227', 'Force clock-out sets checkOutAt timestamp', 'Manager token + userId', '200 + checkOutAt present', 'PASS'),
])

# 2.9 Dashboard, Leaderboard, Audit
doc.add_heading('2.9  Dashboard, Leaderboard, and Audit', level=2)
para('10.1  Dashboard', bold=True)
test_table([
    ('TC-228', 'Owner receives KPI summary', 'Owner token', '200 + KPI object', 'PASS'),
    ('TC-229', 'Manager receives KPI summary', 'Manager token', '200', 'PASS'),
    ('TC-230', 'activeVendors count includes seeded vendor', 'Owner token', 'count >= 1', 'PASS'),
    ('TC-231', 'Staff cannot access dashboard', 'Staff token', '403', 'PASS'),
    ('TC-232', 'Daily summary with range=weekly', '?range=weekly', '200 + array of rows', 'PASS'),
    ('TC-233', 'Daily summary with range=monthly', '?range=monthly', '200 + array of rows', 'PASS'),
    ('TC-234', 'Daily summary rows have correct shape', 'Owner token', 'bandPrice, totalQtySold, totalRevenue', 'PASS'),
    ('TC-235', 'Reject invalid range value', '?range=yearly', '400', 'PASS'),
])

para('10.2  Staff Leaderboard', bold=True)
test_table([
    ('TC-236', 'Owner receives leaderboard array', 'Owner token', '200 + array', 'PASS'),
    ('TC-237', 'All active seeded users appear in leaderboard', 'Owner token', '3 entries for owner, manager, staff', 'PASS'),
    ('TC-238', 'Leaderboard sorted by revenueToday descending', 'Owner token', 'Correct descending sort order', 'PASS'),
    ('TC-239', 'salesCountToday defaults to zero with no sales', 'No sales today', 'salesCountToday is 0', 'PASS'),
    ('TC-240', 'Staff can access leaderboard', 'Staff token', '200', 'PASS'),
    ('TC-241', 'Only active users from same store included', 'Owner token', 'No cross-store or inactive entries', 'PASS'),
])

para('10.3  Audit Log and Ephemeral Wipe', bold=True)
test_table([
    ('TC-242', 'Owner views audit log (empty on fresh database)', 'Owner token', '200 + empty array', 'PASS'),
    ('TC-243', 'Manager cannot view audit log', 'Manager token', '403', 'PASS'),
    ('TC-244', 'Staff cannot view audit log', 'Staff token', '403', 'PASS'),
    ('TC-245', 'Wipe with correct password prunes ephemeral sales', 'Correct owner password', '200 + recordsPruned > 0', 'PASS'),
    ('TC-246', 'Wipe with no ephemeral sales reports 0 pruned', 'No ephemeral sales', '200 + recordsPruned = 0', 'PASS'),
    ('TC-247', 'Reject wipe with wrong password', 'Wrong password', '401', 'PASS'),
    ('TC-248', 'Wipe entry appears in audit log afterwards', 'GET /audit/log', 'Log entry with type and timestamp', 'PASS'),
    ('TC-249', 'Manager cannot trigger wipe', 'Manager token', '403', 'PASS'),
    ('TC-250', 'Staff cannot trigger wipe', 'Staff token', '403', 'PASS'),
    ('TC-251', 'Reject wipe with missing password field', 'Body without password', '400', 'PASS'),
])

# Summary
doc.add_heading('Test Suite Summary', level=2)
make_table(
    ['Test Suite', 'File', 'Tests', 'Coverage Area', 'Status'],
    [
        ['Authentication',      'auth.test.ts',        '28',  'Registration, login, JWT validation', 'PASS'],
        ['User Management',     'users.test.ts',       '67',  'User CRUD, passwords, PINs, avatars, role access', 'PASS'],
        ['Store Configuration', 'store.test.ts',       '56',  'Store profile, billing mode, retention, GPS settings', 'PASS'],
        ['Categories',          'categories.test.ts',  '23',  'Category management, uniqueness constraints', 'PASS'],
        ['Price Bands',         'priceBands.test.ts',  '36',  'Price band management, stock queries', 'PASS'],
        ['Inventory Batches',   'inventory.test.ts',   '62',  'Batches, matrix, adjust, defective, close', 'PASS'],
        ['Sales',               'sales.test.ts',       '22',  'FIFO stock deduction, customers, custom items', 'PASS'],
        ['Returns',             'returns.test.ts',     '30',  'Returns, exchanges, stock restoration', 'PASS'],
        ['Vendors',             'vendors.test.ts',     '43',  'Vendor directory, soft-delete, suggest-order', 'PASS'],
        ['Reorders',            'reorders.test.ts',    '38',  'Create reorder, status lifecycle, message text', 'PASS'],
        ['Attendance and GPS',  'attendance.test.ts',  '30',  'Clock-in/out, GPS geofencing enforcement, roster', 'PASS'],
        ['Staff Leaderboard',   'staff.test.ts',       '12',  'Leaderboard rankings, RBAC, sort order', 'PASS'],
        ['Dashboard',           'dashboard.test.ts',   '15',  'KPI summary, daily chart data, role access', 'PASS'],
        ['Audit Log and Wipe',  'audit.test.ts',       '19',  'Audit log, ephemeral data wipe, password verification', 'PASS'],
        ['Total',               '',                    '481', 'All 33 API endpoints covered', '481 PASS'],
    ],
    widths=[1.3, 1.5, 0.55, 2.6, 0.55],
)

doc.add_page_break()

# ================================================================
# SECTION 3: PROOF OF FRONTEND MODIFICATION
# ================================================================
doc.add_heading('3. Proof of Frontend Modification', level=1)
para(
    'The original frontend (commit 4bf5465 "frontend code") used entirely static data: '
    'src/data/store.json for shop details, src/data/credentials.json for login, and '
    'src/lib/mock.ts for all product, category, vendor, and staff data. '
    'Following integration, all pages now call the live backend through a centralised '
    'HTTP client. This section documents each change.'
)

doc.add_heading('3.1  API Client Module (src/lib/api.ts)', level=2)
para('A new file was created as the single point of contact between the frontend and backend.')
make_table(
    ['Feature', 'Implementation'],
    [
        ['Base URL',       'Read from the VITE_API_URL environment variable, with fallback to http://localhost:3001/api'],
        ['Authentication', 'JWT read from localStorage ("sb_token") and attached as Authorization: Bearer on every authenticated request'],
        ['Token helpers',  'setToken(), clearToken(), and cacheUser() manage session state across page reloads'],
        ['Error handling', 'If res.ok is false, throws Error with the message from the server response body'],
        ['Typed methods',  'api.get<T>(path), api.post<T>(path, body), api.patch<T>(path, body), api.del<T>(path)'],
    ],
    widths=[1.5, 5.0],
)

doc.add_heading('3.2  Login and Register Pages', level=2)
para('LoginPage.tsx', bold=True)
para('Before: Credentials matched against src/data/credentials.json, a static file bundled with the app.', italic=True)
para('After:', bold=True)
bullet('Staff: POST /api/auth/login with { identifier: phone, credential: pin }')
bullet('Owner/Manager: POST /api/auth/login with { identifier: email, credential: password }')
bullet('JWT and user object saved to localStorage on success. Errors surfaced from server response.')
doc.add_paragraph()
para('RegisterPage.tsx', bold=True)
para('Before: No registration existed. Store data came from src/data/store.json.', italic=True)
para('After:', bold=True)
bullet('Submits POST /api/auth/register. On success, stores JWT and navigates to dashboard.')
doc.add_paragraph()

doc.add_heading('3.3  Dashboard Page (src/pages/DashboardPage.tsx)', level=2)
para('Before: KPI cards showed hardcoded numbers. Charts used fixed arrays.', italic=True)
para('After:', bold=True)
bullet('GET /api/dashboard/summary fetches live KPIs: totalRevenue, unitsSold, topBand, agingBatchCount, activeVendors.')
bullet('GET /api/dashboard/daily-summary?range=weekly|monthly drives the revenue and band performance charts.')
bullet('The weekly/monthly toggle triggers a new API call each time it changes.')
doc.add_paragraph()

doc.add_heading('3.4  POS Page (src/pages/POSPage.tsx)', level=2)
para('Before: Product grid and category tabs populated from mock.ts static arrays.', italic=True)
para('After:', bold=True)
bullet('GET /api/price-bands/with-stock loads live price bands with current stock levels.')
bullet('GET /api/categories populates the category tab bar.')
bullet('POST /api/sales submits the cart with items, customer details, payment method, and discount.')
bullet('Price bands with totalStock of 0 are visually disabled based on live data.')
doc.add_paragraph()

doc.add_heading('3.5  Inventory Page (src/pages/InventoryPage.tsx)', level=2)
para('Before: Batch list was a static array. Mutations only changed local state.', italic=True)
para('After:', bold=True)
bullet('GET /api/inventory/matrix loads the stock matrix view.')
bullet('GET /api/inventory/batches?filter=<value> loads the filtered batch list (all, low_stock, new_arrivals, aging).')
bullet('GET /api/vendors, /categories, /price-bands populate add-batch form dropdowns.')
bullet('POST /api/inventory/batches saves a new batch.')
bullet('PATCH /api/inventory/batches/:id sends close, adjust, or defective actions to the server.')
doc.add_paragraph()

doc.add_heading('3.6  Procurement Page (src/pages/ProcurementPage.tsx)', level=2)
para('Before: Vendor list and order history were mock arrays with no backend.', italic=True)
para('After:', bold=True)
bullet('GET /api/vendors loads vendors with outstanding-due amounts.')
bullet('GET /api/reorders loads all purchase orders.')
bullet('GET /api/vendors/:id/suggest-order fetches quantity suggestions computed from sales and stock data.')
bullet('POST /api/reorders creates the order and returns a generated WhatsApp message.')
bullet('POST /api/vendors adds a new vendor.')
doc.add_paragraph()

doc.add_heading('3.7  Staff Page (src/pages/StaffPage.tsx)', level=2)
para('Before: Roster was a hardcoded list. Clock-in button toggled a local boolean only.', italic=True)
para('After:', bold=True)
bullet('GET /api/staff/leaderboard loads today\'s sales leaderboard.')
bullet('GET /api/users loads the full staff roster.')
bullet('GET /api/store loads the GPS geofence configuration.')
bullet('POST /api/attendance/clock-in and /clock-out submit GPS coordinates; geofence enforcement runs server-side.')
bullet('PATCH /api/attendance/force-clockout/:userId closes open shifts for any staff member.')
bullet('POST /api/users adds a new manager or staff member.')
bullet('PATCH /api/users/:id updates name or phone. PATCH /:id/pin updates staff PIN.')
bullet('DELETE /api/users/:id soft-deletes a user.')
bullet('PATCH /api/users/:id/avatar uploads a new avatar as a base64 data URL.')
bullet('PATCH /api/store/gps-settings saves updated geofence coordinates and radius.')
doc.add_paragraph()

doc.add_heading('3.8  Settings Page (src/pages/SettingsPage.tsx)', level=2)
para('Before: Form saved to local state only. No audit log existed.', italic=True)
para('After:', bold=True)
bullet('GET /api/store loads current store name, address, logo, billingMode, and retentionDays.')
bullet('PATCH /api/store saves changes to name, address, and logo.')
bullet('PATCH /api/users/:id updates current user profile (name, phone, email).')
bullet('PATCH /api/users/:id/password changes password with server-side current-password verification.')
bullet('PATCH /api/users/:id/avatar and PATCH /api/store upload updated avatar and logo images.')
bullet('PATCH /api/store/billing-mode and PATCH /api/store/retention configure the data retention policy.')
bullet('POST /api/audit/wipe triggers an ephemeral data wipe after the owner confirms their password.')
bullet('GET /api/audit/log loads the complete wipe history into the audit log panel.')
doc.add_paragraph()

para('Frontend API Call Summary', bold=True)
make_table(
    ['Page', 'Endpoints Called', 'Methods'],
    [
        ['LoginPage',       '/auth/login',                                                                'POST'],
        ['RegisterPage',    '/auth/register',                                                             'POST'],
        ['DashboardPage',   '/dashboard/summary, /dashboard/daily-summary',                               'GET'],
        ['POSPage',         '/price-bands/with-stock, /categories, /sales',                               'GET, POST'],
        ['InventoryPage',   '/inventory/matrix, /inventory/batches, /vendors, /categories, /price-bands, /inventory/batches/:id', 'GET, POST, PATCH'],
        ['ProcurementPage', '/vendors, /reorders, /vendors/:id/suggest-order',                            'GET, POST'],
        ['StaffPage',       '/staff/leaderboard, /users, /store, /attendance/clock-in, /attendance/clock-out, /attendance/force-clockout/:id, /users/:id, /users/:id/pin, /users/:id/avatar, /store/gps-settings', 'GET, POST, PATCH, DELETE'],
        ['SettingsPage',    '/store, /audit/log, /users/:id, /users/:id/password, /users/:id/avatar, /store/billing-mode, /store/retention, /audit/wipe', 'GET, PATCH, POST'],
    ],
    widths=[1.3, 3.7, 1.5],
)

# Save
out = '/home/unolo/code/SE-Project---Claudius/docs/milestone4-report.docx'
doc.save(out)
print(f'Saved: {out}')
