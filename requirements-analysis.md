# Expense Management Ecosystem - Requirements Analysis

## Project Overview

A comprehensive expense management ecosystem application with role-based access control, featuring 5 distinct user types with specialized dashboards and workflows.

## User Roles & Permissions

### 1. Super Admin
- **Highest Level Access**: Complete system control
- **Capabilities**:
  - Create accounts for all user types (Business Unit Admins, SPOCs, MIS Managers, Service Handlers)
  - View and manage global expense sheet
  - Edit/update any entry in global expense sheet
  - Apply advanced filters (by business unit, date, card, status, amount, etc.)
  - Export filtered data
  - Add new entries manually or bulk upload

### 2. MIS - Expense Manager
- **Global Data Management**
- **Capabilities**:
  - View global expense sheet from all business units
  - Add new entries manually
  - Bulk upload expense data with duplicate detection
  - Edit/update any entry in global expense sheet
  - Advanced filtering (by business unit, date, card, status, etc.)
  - Export filtered data
  - Receive email notifications for:
    - New SPOC entries approved by Business Unit Admin
    - Service cancellation requests from Service Handlers
  - Duplicate detection: System marks entries as "Merged" or "Unique"

### 3. Business Unit Admin
- **Business Unit Level Management**
- **Capabilities**:
  - View only their business unit's expense sheet
  - Create SPOC accounts for their business unit
  - Create Service Handler accounts for their business unit
  - Approve/Reject SPOC expense entries via email
  - Apply filters (date, card, status, month, amount, etc.)
  - Export their business unit data
  - Profile shows which business unit they manage

### 4. Business Unit SPOC (Single Point of Contact)
- **Expense Entry & Card Management**
- **Capabilities**:
  - Enter expense entries for their business unit only
  - Submit entries for Business Unit Admin approval
  - View only their business unit's expenses
  - Entry status tracking: Pending → Accepted/Rejected
  - Rejected entries auto-delete after 2-3 days
  - Profile shows which business unit they belong to

### 5. Service Handler
- **Service Usage & Subscription Management**
- **Capabilities**:
  - View services assigned to them (filtered by their name in "Tool or Service Handler" column)
  - Disable services they no longer need
  - Receive renewal notifications 5 days before subscription renewal
  - Respond to renewal notifications (Yes/No with reason)
  - Profile shows business unit and assigned services

## Business Units

Fixed list of business units:
- DWSG
- Signature
- Collabx
- Wytlabs
- Smegoweb

## Global Expense Sheet Schema

| Column | Description | Type |
|--------|-------------|------|
| Card Number/Payment from | Card identifier | String |
| Card Assigned To | Cardholder name | String |
| Date | Transaction date | Date |
| Month | Transaction month | String (e.g., "Jan-2025") |
| Status | Active/Declined | Dropdown |
| Particulars | Service name from CC statement | String |
| Narration | Description from statement | String |
| Currency | USD/Euro/Other | Dropdown |
| Bill Status | Payment status | String |
| Amount | Original currency amount | Number |
| XE (Current Conversion Rate to INR) | Real-time conversion rate | Number (Auto-updated) |
| Amount in INR | Converted amount | Number (Auto-calculated) |
| Types of Tools or Service | Category | Dropdown |
| Business Unit | Business unit name | Dropdown |
| Cost Center | Cost allocation | Dropdown |
| Approved By | Approver name | Dropdown |
| Tool or Service Handler | User assigned to service | String |
| Recurring/One-time | Subscription type | Dropdown |
| Edit/Update details | Action button | Button |
| Merged/Unique | (MIS only) Duplicate status | System-generated |

## Dropdown Values

### Types of Expense
- Domain
- Google
- Google Adwords Expense
- Hosting
- Proxy
- Server
- Service
- Tool

### Cost Center
- Ops
- FE
- OH Exps
- Support
- Management EXPS

### Approved By
- Vaibhav
- Marc
- Dawood
- Raghav
- Tarun
- Yulia
- Sarthak
- Harshit

### Recurring
- Monthly
- Yearly
- One-time

## Key Workflows

### SPOC Entry Workflow
1. SPOC logs in and adds new expense entry
2. SPOC fills all columns and clicks "Save/Update"
3. System sends email to Business Unit Admin with entry details and Approve/Reject buttons
4. Business Unit Admin clicks Approve/Reject in email
5. Entry status updates in SPOC dashboard:
   - **Accepted**: Entry added to global expense sheet
   - **Rejected**: Entry marked rejected, auto-deleted after 2-3 days
   - **Pending**: No action taken yet
6. If approved, system sends email to MIS Manager with entry details

### MIS Bulk Upload Workflow
1. MIS uploads expense sheet (CSV/Excel)
2. System maps columns to global sheet schema
3. System detects duplicates by comparing all column values
4. Duplicate entries marked as "Merged"
5. New entries marked as "Unique"
6. All entries displayed in MIS dashboard with status

### Service Handler Renewal Workflow
1. System sends email notification 5 days before renewal
2. Service Handler receives in-app notification
3. Service Handler responds Yes/No with reason
4. If No:
   - Email sent to MIS Manager with service details
   - Service Handler manually cancels subscription
   - Service Handler clicks "Disable" button
   - System prompts: "Did you cancel subscription?"
   - If Yes, email sent to MIS
   - MIS updates service status to "Deactive" in global sheet

### Service Handler Disable Workflow
1. Service Handler clicks "Disable" on service row
2. System prompts: "Did you cancel subscription?"
3. If Yes, email sent to MIS Manager with service details
4. MIS searches service in global sheet
5. MIS clicks Edit/Update, changes status to "Deactive"
6. Entry updated globally

## Features

### Currency Conversion
- Real-time XE conversion rate to INR
- Auto-updates for all currencies (USD, Euro, etc.)
- Auto-calculates "Amount in INR" based on current rate

### Duplicate Detection
- Compares all column values (Date, Service name, Business Unit, Card, etc.)
- Marks duplicates as "Merged" (MIS view only)
- Marks new entries as "Unique" (MIS view only)
- Prevents duplicate entries in global sheet

### Search & Filters
- **Search**: By Card No, Date, Service name, Business Unit
- **Filters**:
  - By Date
  - By Month
  - By Card Number
  - By Business Unit (Super Admin & MIS only)
  - By Status (Active/Deactive)
  - By Amount (e.g., > $100)
  - By Types of Tool/Service
  - Combinational filters supported

### Export
- Export current sheet view
- Export filtered data
- Select number of rows to export

### Notifications
- In-app notification panel
- Email notifications for:
  - SPOC entry approval requests (to Business Unit Admin)
  - Approved entries (to MIS)
  - Service renewal reminders (to Service Handler)
  - Service cancellation requests (to MIS)

### Email Functionality
- Approval/Rejection buttons embedded in email
- Entry details included in email body
- Reason logging for renewals/cancellations

## Technical Requirements

### Frontend
- React + Vite with JSX
- Tailwind CSS for styling
- Modern, responsive UI/UX
- Role-based dashboard views
- Data tables with inline editing
- Real-time notifications
- Modal dialogs for confirmations

### Backend
- Node.js + Express.js
- MVC architecture
- JWT authentication
- Role-based access control (RBAC)
- Nodemailer for email functionality
- Real-time currency conversion API integration
- Scheduled jobs for renewal notifications
- File upload handling (CSV/Excel parsing)

### Database
- MongoDB with Mongoose ODM
- Collections:
  - Users (with role field)
  - ExpenseEntries
  - BusinessUnits
  - Notifications
  - AuditLogs

### Security
- Password hashing (bcrypt)
- JWT token-based authentication
- Role-based middleware
- Input validation and sanitization
- CORS configuration

### Additional Features
- Automated email notifications
- Scheduled cron jobs for renewal reminders
- CSV/Excel parsing for bulk uploads
- Real-time currency conversion
- Audit logging for all actions
- Data export functionality

## Deliverables

1. Complete source code (frontend + backend)
2. Full technical documentation
3. Setup and installation guide
4. Database schema documentation
5. API documentation
6. User guide for each role
7. Configuration files (.env templates)
8. Downloadable ZIP file with complete project
9. Out-of-the-box runnable application
