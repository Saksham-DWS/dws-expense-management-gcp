# Technical Documentation

This document provides a detailed technical overview of the Expense Management Ecosystem application, including its architecture, database schema, API endpoints, and key implementation details.

## 1. System Architecture

The application follows a classic client-server architecture:

-   **Frontend (Client)**: A single-page application (SPA) built with **React** and **Vite**. It handles the user interface and all client-side logic. It communicates with the backend via a RESTful API.
-   **Backend (Server)**: A **Node.js** and **Express.js** application that exposes a RESTful API. It is responsible for business logic, data processing, database interactions, and user authentication.
-   **Database**: A **MongoDB** database is used for data persistence, with **Mongoose** as the Object Data Modeling (ODM) library.

### Backend Architecture

The backend is structured using a modern, scalable approach inspired by the Model-View-Controller (MVC) pattern:

-   **`server.js`**: The main entry point of the application. It initializes the Express server, connects to the database, sets up middleware, and mounts the API routes.
-   **`src/config`**: Contains configuration files for the database (`database.js`) and file uploads (`multer.js`).
-   **`src/models`**: Defines the Mongoose schemas for all database collections (`User.js`, `ExpenseEntry.js`, `Notification.js`).
-   **`src/controllers`**: Contains the business logic for handling API requests. Each controller corresponds to a specific resource (e.g., `authController.js`, `expenseController.js`).
-   **`src/routes`**: Defines the API endpoints and maps them to the appropriate controller functions.
-   **`src/middleware`**: Includes custom middleware for authentication (`auth.js`) and error handling (`errorHandler.js`).
-   **`src/services`**: Contains services for external interactions (e.g., sending emails with `emailService.js`, fetching currency rates with `currencyService.js`) and scheduled tasks (`cronJobs.js`).
-   **`src/utils`**: Includes utility functions, such as JWT generation (`jwt.js`).

### Frontend Architecture

The frontend is organized into a modular and maintainable structure:

-   **`main.jsx`**: The entry point of the React application.
-   **`App.jsx`**: The root component that sets up the router and global context providers.
-   **`src/pages`**: Contains the main page components, each corresponding to a specific route (e.g., `Login.jsx`, `Dashboard.jsx`).
-   **`src/components`**: Contains reusable UI components, categorized into `common`, `layout`, and `dashboard`.
-   **`src/context`**: Includes React Context providers for global state management, such as `AuthContext.jsx`.
-   **`src/services`**: Contains functions that interact with the backend API (e.g., `authService.js`, `expenseService.js`).
-   **`src/utils`**: Includes utility functions (`formatters.js`) and application-wide constants (`constants.js`).
-   **`src/hooks`**: For custom React hooks.

## 2. Database Schema

The application uses three main collections in MongoDB.

### `users` Collection

Stores user information and their roles.

| Field          | Type       | Description                                           |
|----------------|------------|-------------------------------------------------------|
| `name`         | String     | User's full name.                                     |
| `email`        | String     | User's unique email address (used for login).         |
| `password`     | String     | Hashed password.                                      |
| `role`         | String     | User's role (`super_admin`, `mis_manager`, etc.).      |
| `businessUnit` | String     | The business unit the user belongs to (if applicable).|
| `isActive`     | Boolean    | Whether the user account is active.                   |
| `createdBy`    | ObjectId   | Reference to the user who created this account.       |
| `timestamps`   | Timestamps | `createdAt` and `updatedAt` fields.                   |

### `expenseEntries` Collection

Stores all expense records.

| Field                     | Type       | Description                                                              |
|---------------------------|------------|--------------------------------------------------------------------------|
| `cardNumber`              | String     | The card number used for the transaction.                                |
| `date`                    | Date       | The date of the transaction.                                             |
| `status`                  | String     | The status of the service (`Active`, `Deactive`).                        |
| `particulars`             | String     | The name of the service or tool.                                         |
| `amount`                  | Number     | The amount in the original currency.                                     |
| `currency`                | String     | The currency of the transaction (e.g., `USD`).                           |
| `amountInINR`             | Number     | The calculated amount in INR.                                            |
| `businessUnit`            | String     | The business unit associated with the expense.                           |
| `serviceHandler`          | String     | The name of the person using the service.                                |
| `recurring`               | String     | The recurrence of the expense (`Monthly`, `Yearly`, `One-time`).         |
| `entryStatus`             | String     | The approval status of the entry (`Pending`, `Accepted`, `Rejected`).    |
| `duplicateStatus`         | String     | `Unique` or `Merged` (for MIS bulk uploads).                             |
| `createdBy`               | ObjectId   | Reference to the user who created the entry.                             |
| `approvalToken`           | String     | JWT used for email-based approval.                                       |
| `nextRenewalDate`         | Date       | The date of the next renewal for recurring services.                     |
| `renewalNotificationSent` | Boolean    | Flag to check if a renewal reminder has been sent.                       |
| `timestamps`              | Timestamps | `createdAt` and `updatedAt` fields.                                      |

### `notifications` Collection

Stores in-app notifications for users.

| Field          | Type       | Description                                           |
|----------------|------------|-------------------------------------------------------|
| `user`         | ObjectId   | The user who receives the notification.               |
| `type`         | String     | The type of notification (e.g., `renewal_reminder`).  |
| `title`        | String     | The title of the notification.                        |
| `message`      | String     | The notification message.                             |
| `relatedEntry` | ObjectId   | Reference to the related expense entry.               |
| `isRead`       | Boolean    | Whether the user has read the notification.           |
| `timestamps`   | Timestamps | `createdAt` and `updatedAt` fields.                   |

## 3. API Endpoints

The backend exposes the following RESTful API endpoints. All protected routes require a `Bearer` token in the `Authorization` header.

### Authentication (`/api/auth`)

-   `POST /login`: Login a user and get a JWT.
-   `POST /register`: Register a new user (Super Admin, BU Admin only).
-   `GET /me`: Get the profile of the currently logged-in user.
-   `GET /users`: Get a list of all users.
-   `PUT /users/:id`: Update a user's details (Super Admin only).
-   `DELETE /users/:id`: Delete a user (Super Admin only).

### Expenses (`/api/expenses`)

-   `POST /`: Create a new expense entry.
-   `GET /`: Get a list of expense entries with filtering and search.
-   `GET /:id`: Get a single expense entry by its ID.
-   `PUT /:id`: Update an expense entry (MIS, Super Admin only).
-   `DELETE /:id`: Delete an expense entry (Super Admin only).
-   `GET /stats`: Get expense statistics.
-   `GET /approve/:token`: Approve an expense entry via an email link.
-   `GET /reject/:token`: Reject an expense entry via an email link.

### Bulk Operations (`/api/expenses`)

-   `POST /bulk-upload`: Upload a CSV/Excel file of expenses (MIS, Super Admin only).
-   `GET /template`: Download an Excel template for bulk uploads.
-   `GET /export`: Export expense data to an Excel file.

### Notifications (`/api/notifications`)

-   `GET /`: Get all notifications for the current user.
-   `PUT /:id/read`: Mark a single notification as read.
-   `PUT /read-all`: Mark all notifications as read.
-   `DELETE /:id`: Delete a notification.

### Service Handler (`/api/service-handler`)

-   `GET /my-services`: Get all services assigned to the current service handler.
-   `POST /renewal-response/:entryId`: Respond to a service renewal notification.
-   `POST /disable/:entryId`: Request to disable a service.

## 4. Key Implementation Details

### Authentication and Authorization

-   **JWT (JSON Web Tokens)** are used for authentication. The `generateToken` utility creates a token upon successful login, which is then sent with every subsequent request.
-   The `protect` middleware verifies the JWT and attaches the user object to the request (`req.user`).
-   The `authorize` middleware checks if the user's role is permitted to access a specific route.

### Email Workflow

-   When a SPOC creates an expense, a unique `approvalToken` is generated and stored with the entry.
-   The `sendApprovalEmail` service uses **Nodemailer** to send an email to the Business Unit Admin containing `Approve` and `Reject` links.
-   These links point to public API endpoints (`/api/expenses/approve/:token`) that validate the token and update the entry's `entryStatus`.

### Scheduled Tasks (Cron Jobs)

-   The `node-cron` package is used to schedule automated tasks.
-   **Renewal Reminders**: A cron job runs daily to find services due for renewal and sends email notifications to the respective Service Handlers.
-   **Cleanup**: Another cron job runs daily to automatically delete rejected expense entries that are older than a configured number of days.

### Frontend State Management

-   **React Context (`AuthContext`)** is used for global state management of the authenticated user.
-   The `useAuth` hook provides easy access to the user's data and authentication status throughout the application.
-   For local component state, the `useState` and `useEffect` hooks are used.
