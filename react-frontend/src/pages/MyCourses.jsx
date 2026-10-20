
import { useCallback, useContext, useEffect, useState } from "react";
import { UserContext } from "../context/UserContext";
import "./MyCourses.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

export default function MyCourses() {
  const { user } = useContext(UserContext);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadCourses = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_URL}/course/enrolled`, {
        credentials: "include",
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || "Unable to load enrolled courses");
      }

      setCourses(Array.isArray(data) ? data : data.courses || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  if (user?.role === "Teacher") {
    return <main className="page"><h2>This page is for students.</h2></main>;
  }

  return (
    <main className="page">
      <h1>My Enrolled Courses</h1>
      <p>View the courses you have enrolled in.</p>

      <button type="button" onClick={loadCourses}>Refresh</button>

      {error && <p role="alert" style={{ color: "crimson" }}>{error}</p>}

      {loading ? (
        <p>Loading your courses...</p>
      ) : courses.length === 0 ? (
        <p>You have not enrolled in any courses yet. Browse available courses to get started.</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16, marginTop: 20 }}>
          {courses.map((course) => (
            <article key={course._id} style={{ border: "1px solid #ddd", borderRadius: 6, padding: 18 }}>
              <h3>{course.courseName}</h3>
              <p>Teacher: {course.teacherName}</p>
              <p>Duration: {course.duration} days</p>
              <p>Topics: {Array.isArray(course.topics) ? course.topics.join(", ") : course.topics}</p>
              <p>Price: {course.price}</p>
              <p>Status: {course.status}</p>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
