
import { getClientPromise } from "@/lib/mongodb";
import { verifyJWT } from "@/lib/auth";
import {
  errorResponse,
  successResponse,
  printExceptionLog,
} from "@/lib/utils";

export async function GET(req) {
  try {
    const authUser = verifyJWT(req);

    if (!authUser) {
      return errorResponse("Authentication required", 401);
    }

    const client = await getClientPromise();
    const db = client.db();

    const { ObjectId } = await import("mongodb");

    if (!ObjectId.isValid(authUser.userId)) {
      return errorResponse("Invalid user ID", 400);
    }

    const user = await db.collection("users").findOne(
      { _id: new ObjectId(authUser.userId) },
      {
        projection: {
          password: 0,
        },
      }
    );

    if (!user) {
      return errorResponse("User not found", 404);
    }

    return successResponse(
      {
        id: user._id.toString(),
        username: user.username,
        email: user.email,
        role: user.role,
      },
      200
    );
  } catch (error) {
    printExceptionLog("GET user", error);
    return errorResponse("Failed to retrieve user", 500);
  }
}
