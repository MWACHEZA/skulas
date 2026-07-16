# ACADEX Enterprise SaaS Platform

This is the full-stack, multi-tenant version of ACADEX, designed to support millions of concurrent users with Google Gemini AI integration.

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Node.js**: v18 or later
- **Docker Desktop**: Recommended for the database
- **Google Gemini API Key**: [Get one here](https://aistudio.google.com/app/apikey)

---

### 2. Database Setup (Local PostgreSQL)
1. Open the [backend/.env](file:///c:/Users/ICT-OFFICE/Desktop/skulas/backend/.env) file.
2. Replace `YOUR_POSTGRES_PASSWORD_HERE` with your actual PostgreSQL password.
3. Ensure your local PostgreSQL service is running.

---

### 3. Backend Setup (Node.js API)
Navigate to the `backend` folder:
```bash
cd backend
npm install
npx prisma db push
npx prisma db seed
npm run dev
```
The API will be available at `http://localhost:5000`

---

### 4. Frontend Setup (React + TypeScript)
Navigate to the `frontend` folder:
```bash
cd frontend
npm install
npm run dev
```
The application will be available at `http://localhost:5173`

---

## 🏗️ Architecture
- **Frontend**: React + TypeScript (Vite)
- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **AI**: Google Gemini 1.5 (Multilingual Santa Chatbot)

## 📁 Key Directories
- `/backend`: Core API, AI services, and database schema.
- `/frontend`: React source code and components.
- `/frontend/legacy`: **Safe backup** of your original static HTML/JS files.

## 🌍 Multi-Tenancy
Access specifically branded school pages by adding the school code to the URL:
- `http://localhost:5173/[SCHOOL_CODE]` (e.g., `http://localhost:5173/AX-123456`)

---

**Built with ❤️ for ACADEX**

## 📝 Developer Guidelines
- **Compile Constraints**: Avoid using `.js` extensions in imports in the backend to maintain `ts-node-dev` compilation constraints.
- **Error Handling**: Ensure error messages presented to the user are friendly and non-technical. Avoid raw `res.status(500).json({ error: 'Failed to ...' })` without providing actionable, warm guidance for non-technical users.
