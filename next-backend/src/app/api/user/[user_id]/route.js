
import { ObjectId } from "mongodb";
import { getClientPromise } from "@/lib/mongodb";
import { verifyJWT } from "@/lib/auth";
import {
  errorResponse,
  successResponse,
  printExceptionLog,
} from "@/lib/utils";

export async function GET(req, { params }) {
  try {
    const authUser = verifyJWT(req);

    if (!authUser) {
      return errorResponse("Authentication required", 401);
    }

    const { user_id } = await params;

    if (!ObjectId.isValid(user_id)) {
      return errorResponse("Invalid user ID", 400);
    }

    // Users may view only their own profile.
    if (authUser.userId !== user_id) {
      return errorResponse("You can only view your own profile", 403);
    }

    const client = await getClientPromise();
    const db = client.db();

    const user = await db.collection("users").findOne(
      { _id: new ObjectId(user_id) },
      { projection: { password: 0 } }
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
    printExceptionLog("GET user by ID", error);
    return errorResponse("Failed to retrieve user", 500);
  }
}
