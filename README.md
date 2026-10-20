# How to Test the App

## Student Information

- **Student Name:** Lihout Van
- **Student ID:** 6712118

## Test Credentials

### Teacher Account
- **Username / Email:** `teacher1` / `teacher1@example.com`
- **Password:** `Teacher123!`

### Student Account
- **Username / Email:** `student1` / `student1@example.com`
- **Password:** `Student123!`

## Prerequisites

- Node.js and npm installed
- MongoDB database configured
- Internet connection for the deployed application

## How to Run & Test

### 1. Backend Setup (`next-backend/`)

1. Open a terminal in the `next-backend/` folder.
2. Install dependencies:

   ```bash
   npm install
   ```

3. Create a `.env.local` file with the following variables:

   ```env
   MONGODB_URI=mongodb+srv://vanlyhout123_db_user:T6jy113cEUP1eTng@work-01.dzacccj.mongodb.net/
   JWT_SECRET=supersecretjwtkeyforfinalexam
   FRONTEND_URL=http://localhost:5173
   ```

4. Start the backend:

   ```bash
   npm run dev
   ```

5. The backend will run at `http://localhost:3000`.

### 2. Frontend Setup (`react-frontend/`)

1. Open another terminal in the `react-frontend/` folder.
2. Install dependencies:

   ```bash
   npm install
   ```

3. Create a `.env` file with:

   ```env
   VITE_API_URL=http://localhost:3000/api
   ```

4. Start the frontend:

   ```bash
   npm run dev
   ```

5. Open the local URL shown in the terminal, usually `http://localhost:5173`.

### 3. Testing Walkthrough

#### A. Student Testing

1. Log in using the student test account.
2. Browse the available courses.
3. Search by course name or teacher name.
4. Open a course to view its details.
5. Enroll in an Open course with available seats.
6. Try enrolling in the same course again to verify duplicate enrollment is prevented.
7. Open **My Courses** to verify the enrolled course appears.
8. Log out.

#### B. Teacher Testing

1. Log in using the teacher test account.
2. Create a new course with a course name, duration, topics, price, maximum students, and status.
3. View the courses owned by the logged-in teacher.
4. Update a course.
5. Try deleting a course with enrolled students and verify deletion is prevented.
6. Delete a course without enrolled students.
7. Log out.

#### C. Access Control Testing

1. Log in as a student and verify teacher-only operations are restricted.
2. Log in as a teacher and verify the teacher can manage only their own courses.
3. Verify students cannot enroll in Closed or Cancelled courses.
4. Verify students cannot enroll when a course has reached its maximum capacity.

## Deployed Application

- **Frontend:** https://wad-final-2026-01-one.vercel.app
- **Backend:** https://wad-final-backend-beta.vercel.app
- **GitHub Repository:** https://github.com/Lihout2118/wad-final-2026-01
