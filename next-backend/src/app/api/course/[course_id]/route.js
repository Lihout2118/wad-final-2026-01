import { NextResponse } from "next/server";
import corsHeaders from "@/lib/cors";
import { ObjectId } from "mongodb";
import { getClientPromise } from "@/lib/mongodb";
import { verifyJWT } from "@/lib/auth";
import {
  errorResponse,
  successResponse,
  printExceptionLog,
} from "@/lib/utils";

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}
// GET: View course details
export async function GET(req, { params }) {
  try {
    const user = verifyJWT(req);

    if (!user) {
      return errorResponse("Authentication required", 401);
    }

    const { course_id } = await params;

    if (!ObjectId.isValid(course_id)) {
      return errorResponse("Invalid course ID", 400);
    }

    const client = await getClientPromise();
    const db = client.db();

    const course = await db.collection("courses").findOne({
      _id: new ObjectId(course_id),
    });

    if (!course) {
      return errorResponse("Course not found", 404);
    }

    if (user.role === "Teacher" && course.teacherId !== user.userId) {
      return errorResponse("You can only view your own courses", 403);
    }

    if (user.role === "Student" && course.status === "Cancel") {
      return errorResponse("Course not found", 404);
    }

    let result = {
      ...course,
      _id: course._id.toString(),
    };

    // Teachers can see the enrolled students in their courses.
    if (user.role === "Teacher") {
      const studentIds = (course.enrolledStudents || [])
        .map((id) => String(id))
        .filter((id) => ObjectId.isValid(id));

      const students = await db.collection("users")
        .find(
          { _id: { $in: studentIds.map((id) => new ObjectId(id)) } },
          { projection: { password: 0 } }
        )
        .toArray();

      result.enrolledStudents = students.map((student) => ({
        id: student._id.toString(),
        username: student.username,
        email: student.email,
      }));
    } else {
      result.enrolledStudents = undefined;
    }

    return successResponse(result, 200);
  } catch (error) {
    printExceptionLog("GET course details", error);
    return errorResponse("Failed to retrieve course", 500);
  }
}

// PUT: Update a course owned by the teacher
export async function PUT(req, { params }) {
  try {
    const user = verifyJWT(req);

    if (!user) {
      return errorResponse("Authentication required", 401);
    }

    if (user.role !== "Teacher") {
      return errorResponse("Only teachers can update courses", 403);
    }

    const { course_id } = await params;

    if (!ObjectId.isValid(course_id)) {
      return errorResponse("Invalid course ID", 400);
    }

    const client = await getClientPromise();
    const db = client.db();
    const courses = db.collection("courses");

    const course = await courses.findOne({
      _id: new ObjectId(course_id),
    });

    if (!course) {
      return errorResponse("Course not found", 404);
    }

    if (course.teacherId !== user.userId) {
      return errorResponse("You can only update your own courses", 403);
    }

    const body = await req.json();

    const courseName = body.courseName ?? course.courseName;
    const duration = Number(body.duration ?? course.duration);
    const topics = body.topics ?? course.topics;
    const price = Number(body.price ?? course.price);
    const maxStudent = Number(body.maxStudent ?? course.maxStudent);
    const status = body.status ?? course.status;

    if (
      typeof courseName !== "string" ||
      !courseName.trim() ||
      !Number.isFinite(duration) ||
      duration <= 0 ||
      !Array.isArray(topics) ||
      topics.length === 0 ||
      topics.some((topic) => typeof topic !== "string" || !topic.trim()) ||
      !Number.isFinite(price) ||
      price < 0 ||
      !Number.isInteger(maxStudent) ||
      maxStudent <= 0 ||
      !["Open", "Close", "Cancel"].includes(status)
    ) {
      return errorResponse("Invalid course information", 400);
    }

    if (maxStudent < (course.enrolledStudents || []).length) {
      return errorResponse(
        "Maximum students cannot be fewer than current enrollments",
        400
      );
    }

    const updatedCourse = {
      courseName: courseName.trim(),
      duration,
      topics: topics.map((topic) => topic.trim()),
      price,
      maxStudent,
      status,
      updatedAt: new Date(),
    };

    await courses.updateOne(
      { _id: new ObjectId(course_id) },
      { $set: updatedCourse }
    );

    return successResponse(
      {
        message: "Course updated successfully",
        course: {
          ...course,
          ...updatedCourse,
          _id: course_id,
        },
      },
      200
    );
  } catch (error) {
    printExceptionLog("PUT course", error);
    return errorResponse("Failed to update course", 500);
  }
}

// DELETE: Delete your course only if no students are enrolled
export async function DELETE(req, { params }) {
  try {
    const user = verifyJWT(req);

    if (!user) {
      return errorResponse("Authentication required", 401);
    }

    if (user.role !== "Teacher") {
      return errorResponse("Only teachers can delete courses", 403);
    }

    const { course_id } = await params;

    if (!ObjectId.isValid(course_id)) {
      return errorResponse("Invalid course ID", 400);
    }

    const client = await getClientPromise();
    const db = client.db();
    const courses = db.collection("courses");

    const course = await courses.findOne({
      _id: new ObjectId(course_id),
    });

    if (!course) {
      return errorResponse("Course not found", 404);
    }

    if (course.teacherId !== user.userId) {
      return errorResponse("You can only delete your own courses", 403);
    }

    if ((course.enrolledStudents || []).length > 0) {
      return errorResponse(
        "Cannot delete a course with enrolled students",
        400
      );
    }

    await courses.deleteOne({ _id: new ObjectId(course_id) });

    return successResponse(
      { message: "Course deleted successfully" },
      200
    );
  } catch (error) {
    printExceptionLog("DELETE course", error);
    return errorResponse("Failed to delete course", 500);
  }
}

// POST: Enroll the logged-in student in this course
export async function POST(req, { params }) {
  try {
    const user = verifyJWT(req);

    if (!user) {
      return errorResponse("Authentication required", 401);
    }

    if (user.role !== "Student") {
      return errorResponse("Only students can enroll in courses", 403);
    }

    const { course_id } = await params;

    if (!ObjectId.isValid(course_id) || !ObjectId.isValid(user.userId)) {
      return errorResponse("Invalid ID", 400);
    }

    const client = await getClientPromise();
    const db = client.db();
    const courses = db.collection("courses");

    const course = await courses.findOne({
      _id: new ObjectId(course_id),
    });

    if (!course) {
      return errorResponse("Course not found", 404);
    }

    if (course.status !== "Open") {
      return errorResponse("This course is not open for enrollment", 400);
    }

    const enrolledStudents = (course.enrolledStudents || []).map(String);

    if (enrolledStudents.includes(user.userId)) {
      return errorResponse("You are already enrolled in this course", 409);
    }

    if (enrolledStudents.length >= course.maxStudent) {
      return errorResponse("This course is full", 400);
    }

    // Atomic update prevents over-enrollment when requests happen together.
    const result = await courses.updateOne(
      {
        _id: new ObjectId(course_id),
        status: "Open",
        $expr: {
          $lt: [
            { $size: { $ifNull: ["$enrolledStudents", []] } },
            "$maxStudent",
          ],
        },
        enrolledStudents: { $ne: user.userId },
      },
      {
        $addToSet: { enrolledStudents: user.userId },
        $set: { updatedAt: new Date() },
      }
    );

    if (result.modifiedCount !== 1) {
      return errorResponse(
        "Enrollment failed: the course may be full or you may already be enrolled",
        409
      );
    }

    return successResponse(
      { message: "Enrolled successfully" },
      200
    );
  } catch (error) {
    printExceptionLog("POST course enrollment", error);
    return errorResponse("Failed to enroll in course", 500);
  }
}
