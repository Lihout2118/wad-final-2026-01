
import { useCallback, useContext, useEffect, useState } from "react";
import { UserContext } from "../context/UserContext";
import "./Courses.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

export default function Courses() {
  const { user } = useContext(UserContext);
  const [courses, setCourses] = useState([]);
  const [name, setName] = useState("");
  const [teacher, setTeacher] = useState("");
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const request = useCallback(async (path, options = {}) => {
    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      credentials: "include",
      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...options.headers,
      },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || "Request failed");
    return data;
  }, []);

  const loadCourses = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (name.trim()) params.set("name", name.trim());
      if (teacher.trim()) params.set("teacher", teacher.trim());
      const query = params.toString();
      const data = await request(`/course${query ? `?${query}` : ""}`);
      setCourses(Array.isArray(data) ? data : data.courses || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [request, name, teacher]);

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  async function showDetails(course) {
    setError("");
    setMessage("");
    try {
      const data = await request(`/course/${course._id}`);
      setSelected(data.course || data);
    } catch (err) {
      setError(err.message);
    }
  }

  async function enroll(course) {
    setError("");
    setMessage("");
    try {
      const data = await request(`/course/${course._id}`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      setMessage(data.message || `Successfully enrolled in ${course.courseName}.`);
      await loadCourses();
    } catch (err) {
      setError(err.message);
    }
  }

  if (user?.role === "Teacher") {
    return <main className="page"><h2>Please use the Teacher Dashboard.</h2></main>;
  }

  return (
    <main className="page courses-page">
      <div className="courses-heading">
        <div>
          <h1>Available Courses</h1>
          <p>Discover courses and start learning.</p>
        </div>
        <button className="secondary-btn" onClick={loadCourses}>Refresh</button>
      </div>

      {message && <div className="notice success">{message}</div>}
      {error && <div className="notice error">{error}</div>}

      <form className="course-search" onSubmit={e => {
        e.preventDefault();
        loadCourses();
      }}>
        <input
          placeholder="Search course name..."
          value={name}
          onChange={e => setName(e.target.value)}
        />
        <input
          placeholder="Search teacher name..."
          value={teacher}
          onChange={e => setTeacher(e.target.value)}
        />
        <button type="submit">Search</button>
        <button
          type="button"
          className="secondary-btn"
          onClick={() => {
            setName("");
            setTeacher("");
            request("/course")
              .then(data => setCourses(Array.isArray(data) ? data : data.courses || []))
              .catch(err => setError(err.message));
          }}
        >
          Clear
        </button>
      </form>

      <div className="course-count">
        {loading ? "Loading courses..." : `${courses.length} course(s) found`}
      </div>

      {loading ? (
        <div className="empty-state">Loading courses...</div>
      ) : courses.length === 0 ? (
        <div className="empty-state">
          <h3>No courses found</h3>
          <p>Try another search or check back later.</p>
        </div>
      ) : (
        <div className="course-grid">
          {courses.map(course => {
            const enrolled = Array.isArray(course.enrolledStudents)
              ? course.enrolledStudents.length : 0;
            const full = enrolled >= Number(course.maxStudent);

            return (
              <article className="course-card" key={course._id}>
                <div className="course-card-top">
                  <span className={`status status-${String(course.status).toLowerCase()}`}>
                    {course.status}
                  </span>
                  <span className="course-price">{course.price}</span>
                </div>
                <h3>{course.courseName}</h3>
                <p className="teacher-label">Instructor: {course.teacherName}</p>
                <div className="course-info">
                  <span>Duration</span><strong>{course.duration} days</strong>
                  <span>Students</span><strong>{enrolled} / {course.maxStudent}</strong>
                </div>
                <p className="topics">
                  <strong>Topics:</strong>{" "}
                  {Array.isArray(course.topics) ? course.topics.join(", ") : course.topics}
                </p>
                <div className="course-actions">
                  <button className="secondary-btn" onClick={() => showDetails(course)}>
                    View Details
                  </button>
                  {course.status === "Open" && !full ? (
                    <button onClick={() => enroll(course)}>Enroll Now</button>
                  ) : (
                    <button disabled>{full ? "Course Full" : "Unavailable"}</button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {selected && (
        <div className="modal-backdrop" onClick={() => setSelected(null)}>
          <section className="course-modal" onClick={e => e.stopPropagation()}>
            <button className="modal-close secondary-btn" onClick={() => setSelected(null)}>
              Close
            </button>
            <span className={`status status-${String(selected.status).toLowerCase()}`}>
              {selected.status}
            </span>
            <h2>{selected.courseName}</h2>
            <p>Instructor: {selected.teacherName}</p>
            <p>Duration: {selected.duration} days</p>
            <p>Price: {selected.price}</p>
            <p>Maximum students: {selected.maxStudent}</p>
            <p>Topics: {Array.isArray(selected.topics)
              ? selected.topics.join(", ") : selected.topics}</p>
          </section>
        </div>
      )}
    </main>
  );
}
