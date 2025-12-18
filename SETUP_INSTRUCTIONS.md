# Setup Instructions

This document provides a complete, step-by-step guide to set up and run the **Expense Management Ecosystem** application on your local machine.

## Prerequisites

Before you begin, ensure you have the following installed on your system:

1.  **Node.js** (v18.x or later)
    -   Download and install from [https://nodejs.org/](https://nodejs.org/)
    -   Verify installation: `node --version`

2.  **npm** (v9.x or later)
    -   npm is included with Node.js.
    -   Verify installation: `npm --version`

3.  **MongoDB**
    -   **Option 1: Local Installation**
        -   Download MongoDB Community Server from [https://www.mongodb.com/try/download/community](https://www.mongodb.com/try/download/community)
        -   Follow the installation instructions for your operating system.
        -   Start the MongoDB service.
    -   **Option 2: MongoDB Atlas (Cloud)**
        -   Sign up for a free account at [https://www.mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
        -   Create a new cluster and obtain your connection string.

## Step 1: Extract the Project

1.  Extract the `expense-management-ecosystem.zip` file to a location of your choice.
2.  Open a terminal and navigate to the extracted directory:
    ```bash
    cd /path/to/expense-management-ecosystem
    ```

## Step 2: Backend Setup

### 2.1 Install Backend Dependencies

1.  Navigate to the `backend` directory:
    ```bash
    cd backend
    ```

2.  Install all required npm packages:
    ```bash
    npm install
    ```

### 2.2 Configure Environment Variables

1.  In the `backend` directory, you will find a `.env.example` file. Copy this file and rename it to `.env`:
    ```bash
    cp .env.example .env
    ```

2.  Open the `.env` file in a text editor and update the following values:

    ```env
    # Server Configuration
    NODE_ENV=development
    PORT=5000

    # Database Configuration
    # For local MongoDB:
    MONGODB_URI=mongodb://localhost:27017/expense-management
    # For MongoDB Atlas:
    # MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-url>/expense-management?retryWrites=true&w=majority

    # JWT Configuration
    JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
    JWT_EXPIRE=30d
    SUPER_ADMIN_SETUP_KEY=define-a-one-time-setup-key

    # Email Configuration (Nodemailer)
    EMAIL_HOST=smtp.gmail.com
    EMAIL_PORT=587
    EMAIL_USER=your-email@gmail.com
    EMAIL_PASSWORD=your-app-password
    EMAIL_FROM=Expense Management <your-email@gmail.com>

    # Currency API (Optional - defaults to fixed rates if not provided)
    CURRENCY_API_KEY=your-api-key-from-exchangerate-api.com

    # Notification Settings
    RENEWAL_NOTIFICATION_DAYS=5
    AUTO_DELETE_REJECTED_DAYS=3
    ```

    **Important Notes:**
    -   **Email Configuration**: For Gmail, you need to use an **App Password** instead of your regular password. Follow these steps:
        1.  Go to your Google Account settings.
        2.  Navigate to Security > 2-Step Verification.
        3.  At the bottom, click on **App passwords**.
        4.  Generate a new app password for "Mail" and copy it.
        5.  Use this app password in the `EMAIL_PASSWORD` field.
    -   **JWT Secret**: Change the `JWT_SECRET` to a long, random string for production use.
    -   **SUPER_ADMIN_SETUP_KEY**: Choose a long, unique value. It is required exactly once when hitting `/setup` to create the initial Super Admin. Rotate or remove it from the environment after onboarding.

### 2.3 Seed Initial Data or Bootstrap the First Super Admin

A ready-to-use seeding script is included so every role has demo credentials and the dashboards are populated automatically.

```bash
cd backend
npm run seed
```

The script wipes the existing users/expenses collections, inserts a Super Admin, MIS Manager, Business Unit Admin/SPOC/Service Handler pairs for every unit, and loads sample expense entries. The console output lists every credential that was created.

If you prefer to start with a clean database, keep the seed script skipped and instead create the first Super Admin through the dedicated setup screen:

1. Start both backend (`npm run dev`) and frontend (`npm run dev`) servers.
2. Browse to `http://localhost:5173/setup`.
3. Provide the Super Admin name/email/password plus the `SUPER_ADMIN_SETUP_KEY` you configured in the backend `.env`.
4. Submit the form to create the account, then immediately rotate/delete the setup key so it cannot be reused.
5. Log in via `http://localhost:5173/login` with the freshly created credentials and invite other roles from the **Users** module.

### 2.4 Start the Backend Server

1.  Make sure you are in the `backend` directory.
2.  Run the development server:
    ```bash
    npm run dev
    ```
3.  You should see output similar to:
    ```
    Server running in development mode on port 5000
    MongoDB Connected: localhost
    Initializing cron jobs...
    Cron jobs initialized successfully
    ```

The backend API is now running at `http://localhost:5000`.

## Step 3: Frontend Setup

### 3.1 Install Frontend Dependencies

1.  Open a **new terminal window** and navigate to the `frontend` directory:
    ```bash
    cd /path/to/expense-management-ecosystem/frontend
    ```

2.  Install all required npm packages:
    ```bash
    npm install
    ```

### 3.2 Configure Environment Variables

1.  The `frontend/.env` file is already pre-configured to connect to the backend at `http://localhost:5000/api`. If your backend is running on a different port, update this file:
    ```env
    VITE_API_URL=http://localhost:5000/api
    ```

### 3.3 Start the Frontend Development Server

1.  Make sure you are in the `frontend` directory.
2.  Run the development server:
    ```bash
    npm run dev
    ```
3.  You should see output similar to:
    ```
    VITE v5.x.x  ready in xxx ms

    ➜  Local:   http://localhost:5173/
    ➜  Network: use --host to expose
    ```

The frontend application is now running at `http://localhost:5173`.

## Step 4: Access the Application

1.  Open your web browser and navigate to `http://localhost:5173`.
2.  You will be redirected to the login page.
3.  Use the Super Admin credentials you created in Step 2.3:
    -   **Email**: `admin@expensemanagement.com`
    -   **Password**: `password123`

## Step 5: Create Additional Users

1.  Once logged in as the Super Admin, navigate to the **Manage Users** page from the sidebar.
2.  Click **Add User** and create accounts for:
    -   MIS Manager
    -   Business Unit Admins
    -   SPOCs
    -   Service Handlers

## Troubleshooting

-   **Backend won't start**:
    -   Ensure MongoDB is running.
    -   Check that the `MONGODB_URI` in your `.env` file is correct.
    -   Verify that port 5000 is not already in use.

-   **Frontend won't connect to backend**:
    -   Ensure the backend server is running on port 5000.
    -   Check the `VITE_API_URL` in `frontend/.env`.

-   **Email notifications not working**:
    -   Verify your email credentials in the backend `.env` file.
    -   Ensure you are using an App Password for Gmail.

## Building for Production

### Backend

To run the backend in production mode:

1.  Set `NODE_ENV=production` in your `.env` file.
2.  Start the server:
    ```bash
    npm start
    ```

### Frontend

To build the frontend for production:

1.  Navigate to the `frontend` directory.
2.  Run the build command:
    ```bash
    npm run build
    ```
3.  The production-ready files will be in the `frontend/dist` directory.
4.  You can serve these files using a web server like **Nginx** or **Apache**, or deploy them to a hosting service like **Vercel** or **Netlify**.

## Next Steps

-   Review the [USER_GUIDE.md](USER_GUIDE.md) to understand how to use the application from the perspective of each user role.
-   Review the [TECHNICAL_DOCUMENTATION.md](TECHNICAL_DOCUMENTATION.md) for a deep dive into the system architecture and API.
