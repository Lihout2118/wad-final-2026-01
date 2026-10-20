import { Link } from "react-router-dom";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { useContext } from "react";
import { UserContext } from "./context/UserContext";
import Login from "./pages/Login.jsx";
import Courses from "./pages/Courses";
import TeacherDashboard from "./pages/TeacherDashboard";
import MyCourses from "./pages/MyCourses";

function ProtectedRoute({ children, role }) {
  const { user, loading } = useContext(UserContext);

  if (loading) return <p>Loading...</p>;
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to="/courses" replace />;

  return children;
}

export default function App() {
  const { user, logout, loading } = useContext(UserContext);

  if (loading) return <p>Loading application...</p>;

  return (
    <HashRouter>
      <nav className="navbar">
        <Link to="/courses">Courses</Link>

        {user?.role === "Teacher" && (
          <Link to="/teacher">Teacher Dashboard</Link>
        )}

        {user?.role === "Student" && (
          <Link to="/my-courses">My Courses</Link>
        )}

        {user ? (
          <button
            onClick={async () => {
              await logout();
            }}
          >
            Logout ({user.username})
          </button>
        ) : (
          <Link to="/login">Login</Link>
        )}
      </nav>

      <Routes>
        <Route
          path="/"
          element={<Navigate to={user ? "/courses" : "/login"} replace />}
        />

        <Route
          path="/login"
          element={user ? <Navigate to="/courses" replace /> : <Login />}
        />

        <Route
          path="/courses"
          element={
            <ProtectedRoute>
              <Courses />
            </ProtectedRoute>
          }
        />

        <Route
          path="/teacher"
          element={
            <ProtectedRoute role="Teacher">
              <TeacherDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/my-courses"
          element={
            <ProtectedRoute role="Student">
              <MyCourses />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}


