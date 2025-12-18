# User Guide

This guide provides instructions on how to use the Expense Management Ecosystem application for each of the five user roles.

## 1. Super Admin

The Super Admin has the highest level of access and can manage all aspects of the system.

### Key Responsibilities:
-   Create and manage all user accounts.
-   Oversee the global expense sheet.
-   Ensure data accuracy by editing or deleting entries.

### How to:

-   **Log In**: Use the Super Admin credentials to log in.
-   **Create a User**:
    1.  Navigate to the **Manage Users** page from the sidebar.
    2.  Click the **Add User** button.
    3.  Fill in the user's details (name, email, password), select their role, and assign a business unit if applicable.
    4.  Click **Create**.
-   **View Global Expenses**:
    -   Navigate to the **Global Expense Sheet** page to view, filter, and search all expense entries from all business units.
-   **Edit an Expense**:
    1.  On the expense sheet, click the **Edit** icon on any entry.
    2.  Modify the details in the modal that appears.
    3.  Click **Update** to save the changes.
-   **Bulk Upload Expenses**:
    1.  Navigate to the **Bulk Upload** page.
    2.  Download the template to ensure your data is in the correct format.
    3.  Choose your file and click **Upload**.

## 2. MIS - Expense Manager

The MIS Manager is responsible for the integrity and management of the global expense data.

### Key Responsibilities:
-   Maintain the global expense sheet.
-   Perform bulk uploads of expense data.
-   Correct discrepancies in expense entries.

### How to:

-   **Log In**: Use your MIS Manager credentials.
-   **View Global Expenses**: The dashboard will display the global expense sheet. You can use the filters and search bar to find specific entries.
-   **Add a New Entry Manually**:
    -   Click the **Add New Entry** button and fill in the details. Entries you create are automatically approved.
-   **Bulk Upload Data**:
    1.  Go to the **Bulk Upload** page.
    2.  Download the template file.
    3.  Fill the template with your expense data.
    4.  Upload the file. The system will process it and show you which entries were unique and which were merged (duplicates).
-   **Edit an Entry**: Click the **Edit** icon on any row in the expense sheet to correct information.

## 3. Business Unit Admin

The Business Unit Admin manages the expenses and users for their own business unit.

### Key Responsibilities:
-   Approve or reject expense entries from their SPOCs.
-   Create user accounts for SPOCs and Service Handlers within their business unit.
-   Monitor their business unit's expenses.

### How to:

-   **Log In**: Use your Business Unit Admin credentials.
-   **Approve/Reject Expenses**:
    1.  When a SPOC submits an expense, you will receive an email.
    2.  Click the **Approve** or **Reject** button directly in the email.
    3.  The entry status will be updated automatically.
-   **View Your Business Unit's Expenses**: Navigate to the **Expense Sheet** page to see all entries for your business unit.
-   **Create a User**:
    1.  Go to the **Manage Users** page.
    2.  Click **Add User** and fill in the details. You can only create SPOC and Service Handler accounts for your own business unit.

## 4. Business Unit SPOC

The SPOC (Single Point of Contact) is responsible for entering the day-to-day expenses for their business unit.

### Key Responsibilities:
-   Create new expense entries for their business unit.
-   Submit entries for approval.
-   Track the status of their submitted entries.

### How to:

-   **Log In**: Use your SPOC credentials.
-   **Add a New Expense**:
    1.  Navigate to the **Add New Entry** page.
    2.  Fill out all the required fields for the expense.
    3.  Click **Submit for Approval**. An email will be sent to your Business Unit Admin.
-   **Track Entry Status**:
    -   Go to the **Expense Sheet** page. The `Entry Status` column will show whether your entry is `Pending`, `Accepted`, or `Rejected`.

## 5. Service Handler

The Service Handler is the end-user of a purchased tool or service.

### Key Responsibilities:
-   View the services and tools assigned to them.
-   Request the cancellation of services they no longer need.
-   Respond to renewal notifications.

### How to:

-   **Log In**: Use your Service Handler credentials.
-   **View Your Services**: Navigate to the **My Services** page to see a list of all services assigned to you.
-   **Request Service Cancellation**:
    1.  On the **My Services** page, find the service you want to cancel.
    2.  Click the **Disable** button.
    3.  A confirmation will appear. Confirm that you have manually canceled the subscription (if applicable) and click **Yes**.
    4.  An email will be sent to the MIS Manager to update the global sheet.
-   **Respond to Renewal Notifications**:
    -   Five days before a service is set to renew, you will receive an email and an in-app notification. Follow the instructions to indicate whether you want to continue or cancel the service.
