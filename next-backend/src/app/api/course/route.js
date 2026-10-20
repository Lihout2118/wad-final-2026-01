
import { getClientPromise } from "@/lib/mongodb";
import { verifyJWT } from "@/lib/auth";
import {
  errorResponse,
  successResponse,
  printExceptionLog,
} from "@/lib/utils";
import corsHeaders from "@/lib/cors";

// Handle browser CORS preflight requests.
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
}

export async function GET(req) {
  try {
    const user = verifyJWT(req);

    if (!user) {
      return errorResponse("Authentication required", 401);
    }

    if (!["Student", "Teacher"].includes(user.role)) {
      return errorResponse("Invalid user role", 403);
    }

    const { searchParams } = new URL(req.url);
    const name = searchParams.get("name") || "";
    const teacher = searchParams.get("teacher") || "";

    const client = await getClientPromise();
    const db = client.db();

    const filter = {};

    if (user.role === "Teacher") {
      filter.teacherId = user.userId;
    } else {
      filter.status = { $ne: "Cancel" };
    }

    if (name.trim()) {
      filter.courseName = {
        $regex: name.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        $options: "i",
      };
    }

    if (teacher.trim()) {
      filter.teacherName = {
        $regex: teacher.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        $options: "i",
      };
    }

    const courses = await db
      .collection("courses")
      .find(filter)
      .sort({ _id: -1 })
      .toArray();

    return successResponse(
      courses.map((course) => ({
        ...course,
        _id: course._id.toString(),
      })),
      200
    );
  } catch (error) {
    printExceptionLog("GET courses", error);
    return errorResponse("Failed to retrieve courses", 500);
  }
}

export async function POST(req) {
  try {
    const user = verifyJWT(req);

    if (!user) {
      return errorResponse("Authentication required", 401);
    }

    if (user.role !== "Teacher") {
      return errorResponse("Only teachers can create courses", 403);
    }

    const body = await req.json();

    const {
      courseName,
      duration,
      topics,
      price,
      maxStudent,
      status = "Open",
    } = body;

    if (
      typeof courseName !== "string" ||
      !courseName.trim() ||
      !Number.isFinite(Number(duration)) ||
      Number(duration) <= 0 ||
      !Array.isArray(topics) ||
      topics.length === 0 ||
      topics.some(
        (topic) => typeof topic !== "string" || !topic.trim()
      ) ||
      !Number.isFinite(Number(price)) ||
      Number(price) < 0 ||
      !Number.isInteger(Number(maxStudent)) ||
      Number(maxStudent) <= 0 ||
      !["Open", "Close", "Cancel"].includes(status)
    ) {
      return errorResponse("Invalid course information", 400);
    }

    const client = await getClientPromise();
    const db = client.db();

    const course = {
      courseName: courseName.trim(),
      duration: Number(duration),
      topics: topics.map((topic) => topic.trim()),
      price: Number(price),
      maxStudent: Number(maxStudent),
      status,
      teacherId: user.userId,
      teacherName: user.username,
      enrolledStudents: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection("courses").insertOne(course);

    return successResponse(
      {
        message: "Course created successfully",
        course: {
          ...course,
          _id: result.insertedId.toString(),
        },
      },
      201
    );
  } catch (error) {
    printExceptionLog("POST course", error);
    return errorResponse("Failed to create course", 500);
  }
}
