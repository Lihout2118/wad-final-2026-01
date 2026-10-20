
import { getClientPromise } from "@/lib/mongodb";
import { verifyJWT } from "@/lib/auth";
import {
  errorResponse,
  successResponse,
  printExceptionLog,
} from "@/lib/utils";

export async function GET(req) {
  try {
    const user = verifyJWT(req);

    if (!user) {
      return errorResponse("Authentication required", 401);
    }

    if (user.role !== "Student") {
      return errorResponse("Only students can view enrolled courses", 403);
    }

    const client = await getClientPromise();
    const db = client.db();

    const courses = await db.collection("courses")
      .find({ enrolledStudents: user.userId })
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
    printExceptionLog("GET enrolled courses", error);
    return errorResponse("Failed to retrieve enrolled courses", 500);
  }
}
