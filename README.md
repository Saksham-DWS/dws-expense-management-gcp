> [!NOTE]
> The user has been provided with a `pasted_content.txt` file that contains the project requirements. I have analyzed this file and built the application based on the detailed specifications for an **Expense Management Ecosystem**, not an online learning platform as initially misinterpreted. The following documentation and the application itself reflect the correct project goal.

# Expense Management Ecosystem - Full-Stack Application

This repository contains the complete source code for a production-ready, full-stack **Expense Management Ecosystem**. The application is built with a modern technology stack and features a clean, scalable architecture designed to handle complex, role-based expense workflows.

## Table of Contents

- [Project Overview](#project-overview)
- [Features](#features)
- [Technology Stack](#technology-stack)
- [Folder Structure](#folder-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Backend Setup](#backend-setup)
  - [Frontend Setup](#frontend-setup)
- [Running the Application](#running-the-application)
- [User Roles & Credentials](#user-roles--credentials)
- [Technical Documentation](#technical-documentation)
- [User Guide](#user-guide)

## Project Overview

The Expense Management Ecosystem is a comprehensive platform designed to streamline expense tracking and approval processes across multiple business units. It provides distinct dashboards and functionalities for five different user roles:

- **Super Admin**: Global oversight and user management.
- **MIS - Expense Manager**: Manages the global expense sheet, handles bulk uploads, and ensures data integrity.
- **Business Unit Admin**: Manages expenses and users for their specific business unit.
- **Business Unit SPOC**: Enters expense data for their business unit and submits it for approval.
- **Service Handler**: Views and manages the services assigned to them.

The application facilitates a seamless workflow from expense entry by a SPOC to approval by a Business Unit Admin, and finally, to reconciliation by the MIS Manager. It includes features like automated email notifications, real-time currency conversion, and role-based access control to ensure data security and process efficiency.

## Features

- **Role-Based Access Control (RBAC)**: Five distinct user roles with tailored dashboards and permissions.
- **Global Expense Sheet**: A centralized, real-time view of all expenses for authorized users.
- **Approval Workflow**: Email-based approval/rejection system for new expense entries.
- **Email Notifications**: Automated emails for approvals, renewals, and cancellations using Nodemailer.
- **Bulk Upload**: MIS and Super Admins can upload expense data from Excel/CSV files.
- **Duplicate Detection**: The system intelligently identifies and flags duplicate entries during bulk uploads.
- **Real-Time Currency Conversion**: Automatically converts amounts to INR using a live exchange rate API.
- **Advanced Filtering & Search**: Powerful filtering and search capabilities on the expense sheet.
- **Data Export**: Export filtered expense data to Excel format.
- **Responsive UI/UX**: A modern, responsive frontend built with React and Tailwind CSS.
- **Scheduled Tasks**: Cron jobs for sending renewal reminders and cleaning up rejected entries.

## Technology Stack

| Category      | Technology                                       |
|---------------|--------------------------------------------------|
| **Frontend**  | React, Vite, Tailwind CSS, React Router, Axios   |
| **Backend**   | Node.js, Express.js, Mongoose, JWT, Bcrypt.js    |
| **Database**  | MongoDB                                          |
| **Email**     | Nodemailer                                       |
| **File Upload**| Multer                                           |
| **Scheduled Jobs** | node-cron                                        |

## Folder Structure

```
/expense-management-ecosystem
├── backend/
│   ├── src/
│   │   ├── config/         # Database, Multer config
│   │   ├── controllers/    # Request handlers (MVC)
│   │   ├── middleware/     # Auth, error handling
│   │   ├── models/         # Mongoose schemas
│   │   ├── routes/         # API routes
│   │   ├── services/       # Email, currency, cron jobs
│   │   └── utils/          # JWT helpers
│   ├── uploads/          # Directory for file uploads
│   ├── .env              # Environment variables
│   ├── package.json
│   └── server.js         # Main server entry point
├── frontend/
│   ├── src/
│   │   ├── components/     # Reusable React components
│   │   ├── context/        # AuthContext for state management
│   │   ├── hooks/          # Custom React hooks
│   │   ├── pages/          # Page components
│   │   ├── services/       # API service wrappers
│   │   └── utils/          # Constants, formatters
│   ├── .env              # Frontend environment variables
│   ├── package.json
│   └── vite.config.js
├── README.md
└── requirements-analysis.md
```

## Getting Started

Follow these instructions to set up and run the project on your local machine.

### Prerequisites

- [Node.js](https://nodejs.org/) (v18.x or later)
- [npm](https://www.npmjs.com/) (v9.x or later)
- [MongoDB](https://www.mongodb.com/try/download/community) (running locally or on a cloud service)

### Backend Setup

1.  **Navigate to the backend directory:**
    ```bash
    cd expense-management-ecosystem/backend
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Set up environment variables:**
    -   Create a `.env` file in the `backend` directory by copying the `.env.example` file.
    -   Update the following variables in your `.env` file:
        ```env
        # Your MongoDB connection string
        MONGODB_URI=mongodb://localhost:27017/expense-management

        # JWT / Auth
        JWT_SECRET=super-secret-key
        JWT_EXPIRE=7d
        SUPER_ADMIN_SETUP_KEY=generate-a-one-time-bootstrap-key

        # Your email credentials for Nodemailer (use an app password for Gmail)
        EMAIL_HOST=smtp.gmail.com
        EMAIL_PORT=587
        EMAIL_USER=your-email@gmail.com
        EMAIL_PASSWORD=your-app-password
        ```
    -   The `SUPER_ADMIN_SETUP_KEY` is required exactly once while visiting `/setup` in the frontend to create the first Super Admin. Rotate or remove it afterwards so no one else can reuse it.

### Frontend Setup

1.  **Navigate to the frontend directory:**
    ```bash
    cd expense-management-ecosystem/frontend
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Set up environment variables:**
    -   The `frontend/.env` file is pre-configured to connect to the backend at `http://localhost:5000/api`. No changes are needed if you are running the backend on the default port.

## Running the Application

1.  **Start the Backend Server:**
    -   From the `backend` directory, run:
        ```bash
        npm run dev
        ```
    -   The backend server will start on `http://localhost:5000`.

2.  **Start the Frontend Development Server:**
    -   From the `frontend` directory, run:
        ```bash
        npm run dev
        ```
    -   The frontend application will be available at `http://localhost:5173`.

3.  **Access the Application:**
    -   Open your browser and navigate to `http://localhost:5173`.

### First-Time Super Admin Setup

-   **Option 1: Seed demo data**
    -   Run `npm run seed` inside the `backend` folder to create all five role types plus sample expenses. This also provisions a Super Admin you can use immediately (credentials are printed to the terminal).
-   **Option 2: Bootstrap manually**
    -   Start both servers and visit `http://localhost:5173/setup`.
    -   Enter the Super Admin details together with the `SUPER_ADMIN_SETUP_KEY` you configured in the backend `.env`.
    -   After creation, rotate or delete the setup key from the environment and continue with the standard login at `/login`.

### Seed Demo Data

Run the following command to populate MongoDB with representative users (all five roles across the required business units) and ready-to-review expense entries:

```bash
cd backend
npm run seed
```

The script prints every set of credentials to the console so you can log in quickly without manual setup.

### Testing

- **Backend API tests**

  ```bash
  cd backend
  npm test
  ```

- **Frontend UI tests**

  ```bash
  cd frontend
  npm test
  ```

## User Roles & Credentials

If you executed `npm run seed`, the terminal output lists the exact credentials for every role (Super Admin, MIS, Business Unit Admin, SPOC, Service Handler). Use any of those to explore their dashboards.

If you bootstrapped the platform manually via `/setup`, log in with the account you just created, then open the **Users** page to invite the remaining roles.

## Technical Documentation

For a deep dive into the system architecture, database schema, API endpoints, and code structure, please refer to the [TECHNICAL_DOCUMENTATION.md](TECHNICAL_DOCUMENTATION.md) file.

## User Guide

For a step-by-step guide on how to use the application from the perspective of each user role, please refer to the [USER_GUIDE.md](USER_GUIDE.md) file.
