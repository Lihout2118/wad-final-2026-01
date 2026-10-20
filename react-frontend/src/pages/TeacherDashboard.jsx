
import { useCallback, useContext, useEffect, useState } from "react";
import { UserContext } from "../context/UserContext";
import "./TeacherDashboard.css";

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:3000/api";

const initialForm = {
  courseName: "",
  duration: "30",
  topics: "",
  price: "0",
  maxStudent: "30",
  status: "Open",
};

export default function TeacherDashboard() {
  const { user } = useContext(UserContext);

  const [courses, setCourses] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [selectedCourse, setSelectedCourse] = useState(null);

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

    if (!response.ok) {
      throw new Error(data.message || `Request failed (${response.status})`);
    }

    return data;
  }, []);

  const loadCourses = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const data = await request("/course");
      setCourses(Array.isArray(data) ? data : data.courses || []);
    } catch (err) {
      setError(err.message || "Unable to load courses.");
    } finally {
      setLoading(false);
    }
  }, [request]);

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  function changeField(event) {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  }

  function resetForm() {
    setForm(initialForm);
    setEditingId(null);
    setMessage("");
    setError("");
  }

  function editCourse(course) {
    setEditingId(course._id);
    setForm({
      courseName: course.courseName || "",
      duration: String(course.duration ?? 30),
      topics: Array.isArray(course.topics)
        ? course.topics.join(", ")
        : "",
      price: String(course.price ?? 0),
      maxStudent: String(course.maxStudent ?? 30),
      status: course.status || "Open",
    });

    setMessage("");
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submitCourse(event) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");

    const payload = {
      courseName: form.courseName.trim(),
      duration: Number(form.duration),
      topics: form.topics
        .split(",")
        .map((topic) => topic.trim())
        .filter(Boolean),
      price: Number(form.price),
      maxStudent: Number(form.maxStudent),
      status: form.status,
    };

    if (!payload.courseName || payload.topics.length === 0) {
      setError("Enter a course name and at least one topic.");
      setSaving(false);
      return;
    }

    if (
      !Number.isFinite(payload.duration) ||
      payload.duration <= 0 ||
      !Number.isFinite(payload.price) ||
      payload.price < 0 ||
      !Number.isInteger(payload.maxStudent) ||
      payload.maxStudent < 1
    ) {
      setError("Please check the duration, price, and student limit.");
      setSaving(false);
      return;
    }

    try {
      const isEditing = Boolean(editingId);

      await request(
        isEditing ? `/course/${editingId}` : "/course",
        {
          method: isEditing ? "PUT" : "POST",
          body: JSON.stringify(payload),
        }
      );

      setMessage(isEditing ? "Course updated successfully." : "Course created successfully.");
      setForm(initialForm);
      setEditingId(null);
      await loadCourses();
    } catch (err) {
      setError(err.message || "Unable to save the course.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteCourse(course) {
    if (
      !window.confirm(
        `Delete "${course.courseName}"? This cannot be undone.`
      )
    ) {
      return;
    }

    setMessage("");
    setError("");

    try {
      await request(`/course/${course._id}`, { method: "DELETE" });
      setMessage("Course deleted successfully.");
      await loadCourses();
    } catch (err) {
      setError(err.message || "Unable to delete the course.");
    }
  }

  async function showDetails(course) {
    setError("");

    try {
      const data = await request(`/course/${course._id}`);
      setSelectedCourse(data.course || data);
    } catch (err) {
      setError(err.message || "Unable to load course details.");
    }
  }

  const openCount = courses.filter((course) => course.status === "Open").length;
  const totalStudents = courses.reduce(
    (total, course) =>
      total +
      (Array.isArray(course.enrolledStudents)
        ? course.enrolledStudents.length
        : 0),
    0
  );

  if (user && user.role !== "Teacher") {
    return (
      <main className="td-page">
        <section className="td-empty">
          <h2>Teacher access only</h2>
          <p>Please sign in with a teacher account.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="td-page">
      <header className="td-header">
        <div>
          <span className="td-eyebrow">INSTRUCTOR WORKSPACE</span>
          <h1>Teacher Dashboard</h1>
          <p>Welcome back, {user?.username || "Teacher"}. Manage your courses in one place.</p>
        </div>
        <button className="td-button td-button-light" onClick={loadCourses} type="button">
          ↻ Refresh
        </button>
      </header>

      {message && <div className="td-alert td-success">{message}</div>}
      {error && <div className="td-alert td-error">{error}</div>}

      <section className="td-stats">
        <article className="td-stat">
          <span className="td-stat-icon">▤</span>
          <div><p>Total courses</p><strong>{courses.length}</strong></div>
        </article>
        <article className="td-stat">
          <span className="td-stat-icon td-green">✓</span>
          <div><p>Open courses</p><strong>{openCount}</strong></div>
        </article>
        <article className="td-stat">
          <span className="td-stat-icon td-purple">♙</span>
          <div><p>Enrolled students</p><strong>{totalStudents}</strong></div>
        </article>
      </section>

      <section className="td-panel">
        <div className="td-panel-heading">
          <div>
            <span className="td-eyebrow">{editingId ? "EDIT COURSE" : "COURSE SETUP"}</span>
            <h2>{editingId ? "Update your course" : "Create a new course"}</h2>
            <p>Provide course details and choose its enrollment status.</p>
          </div>
        </div>

        <form className="td-form" onSubmit={submitCourse}>
          <div className="td-field td-full">
            <label htmlFor="td-courseName">Course name</label>
            <input
              id="td-courseName"
              name="courseName"
              value={form.courseName}
              onChange={changeField}
              placeholder="e.g. Introduction to JavaScript"
              required
            />
          </div>

          <div className="td-field">
            <label htmlFor="td-duration">Duration (days)</label>
            <input
              id="td-duration"
              name="duration"
              type="number"
              min="1"
              value={form.duration}
              onChange={changeField}
              required
            />
          </div>

          <div className="td-field">
            <label htmlFor="td-price">Price</label>
            <input
              id="td-price"
              name="price"
              type="number"
              min="0"
              step="0.01"
              value={form.price}
              onChange={changeField}
              required
            />
          </div>

          <div className="td-field td-full">
            <label htmlFor="td-topics">Topics</label>
            <input
              id="td-topics"
              name="topics"
              value={form.topics}
              onChange={changeField}
              placeholder="HTML, CSS, JavaScript"
              required
            />
            <small>Separate each topic with a comma.</small>
          </div>

          <div className="td-field">
            <label htmlFor="td-maxStudent">Maximum students</label>
            <input
              id="td-maxStudent"
              name="maxStudent"
              type="number"
              min="1"
              value={form.maxStudent}
              onChange={changeField}
              required
            />
          </div>

          <div className="td-field">
            <label htmlFor="td-status">Course status</label>
            <select id="td-status" name="status" value={form.status} onChange={changeField}>
              <option value="Open">Open — enrollment available</option>
              <option value="Close">Close — no enrollment</option>
              <option value="Cancel">Cancel — hidden from students</option>
            </select>
          </div>

          <div className="td-form-actions td-full">
            <button className="td-button td-button-primary" type="submit" disabled={saving}>
              {saving ? "Saving..." : editingId ? "Save changes" : "+ Create course"}
            </button>
            {editingId && (
              <button className="td-button td-button-light" type="button" onClick={resetForm}>
                Cancel edit
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="td-course-section">
        <div className="td-section-heading">
          <div>
            <span className="td-eyebrow">YOUR TEACHING</span>
            <h2>My Courses</h2>
            <p>Manage course details, enrollment, and availability.</p>
          </div>
          <span className="td-count">{courses.length} courses</span>
        </div>

        {loading ? (
          <div className="td-empty">Loading your courses…</div>
        ) : courses.length === 0 ? (
          <div className="td-empty">
            <div className="td-empty-icon">▤</div>
            <h3>No courses yet</h3>
            <p>Create your first course using the form above.</p>
          </div>
        ) : (
          <div className="td-course-grid">
            {courses.map((course) => {
              const enrolled = Array.isArray(course.enrolledStudents)
                ? course.enrolledStudents.length
                : 0;
              const capacity = Number(course.maxStudent) || 0;
              const statusClass = (course.status || "Open").toLowerCase();

              return (
                <article className="td-course-card" key={course._id}>
                  <div className="td-course-top">
                    <span className={`td-status td-status-${statusClass}`}>
                      {course.status}
                    </span>
                    <span className="td-course-duration">{course.duration} days</span>
                  </div>

                  <h3>{course.courseName}</h3>
                  <p className="td-course-topics">
                    {Array.isArray(course.topics)
                      ? course.topics.join(" · ")
                      : course.topics}
                  </p>

                  <div className="td-course-meta">
                    <div><span>Price</span><strong>{Number(course.price).toLocaleString()}</strong></div>
                    <div><span>Students</span><strong>{enrolled} / {capacity}</strong></div>
                  </div>

                  <div className="td-progress">
                    <span style={{ width: `${capacity ? Math.min(100, (enrolled / capacity) * 100) : 0}%` }} />
                  </div>

                  <div className="td-card-actions">
                    <button type="button" className="td-button td-button-light" onClick={() => showDetails(course)}>
                      Details
                    </button>
                    <button type="button" className="td-button td-button-light" onClick={() => editCourse(course)}>
                      Edit
                    </button>
                    <button type="button" className="td-button td-button-danger" onClick={() => deleteCourse(course)}>
                      Delete
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {selectedCourse && (
        <div className="td-modal-backdrop" onClick={() => setSelectedCourse(null)}>
          <section className="td-modal" onClick={(event) => event.stopPropagation()}>
            <button className="td-modal-close" onClick={() => setSelectedCourse(null)} type="button" aria-label="Close details">×</button>
            <span className="td-eyebrow">COURSE DETAILS</span>
            <h2>{selectedCourse.courseName}</h2>
            <p>Teacher: {selectedCourse.teacherName || user?.username}</p>
            <p>Duration: {selectedCourse.duration} days · Price: {selectedCourse.price}</p>
            <p>Topics: {Array.isArray(selectedCourse.topics) ? selectedCourse.topics.join(", ") : selectedCourse.topics}</p>
            <h3>Enrolled students</h3>
            {Array.isArray(selectedCourse.enrolledStudents) && selectedCourse.enrolledStudents.length > 0 ? (
              <ul className="td-student-list">
                {selectedCourse.enrolledStudents.map((student, index) => (
                  <li key={student._id || student.id || index}>
                    {student.username || student.email || student}
                  </li>
                ))}
              </ul>
            ) : (
              <p>No students have enrolled yet.</p>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
