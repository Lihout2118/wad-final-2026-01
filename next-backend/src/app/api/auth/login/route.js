
import { getClientPromise } from "@/lib/mongodb";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";
import corsHeaders from "@/lib/cors";
import { printExceptionLog } from "@/lib/utils";

function jsonResponse(data, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: corsHeaders,
  });
}

// Handle the browser's CORS preflight request.
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { username, password } = body ?? {};

    if (
      typeof username !== "string" ||
      typeof password !== "string" ||
      !username.trim() ||
      !password
    ) {
      return jsonResponse(
        { message: "Username and password are required" },
        400
      );
    }

    const secret = process.env.JWT_SECRET;

    if (!secret) {
      console.error("JWT_SECRET is missing");
      return jsonResponse(
        { message: "Server configuration error" },
        500
      );
    }

    const client = await getClientPromise();
    const db = client.db();

    const loginName = username.trim();

    const user = await db.collection("users").findOne({
      $or: [
        { username: loginName },
        { email: loginName.toLowerCase() },
      ],
    });

    if (!user || !user.password) {
      return jsonResponse(
        { message: "Invalid username or password" },
        401
      );
    }

    const validPassword = await bcrypt.compare(
      password,
      user.password
    );

    if (!validPassword) {
      return jsonResponse(
        { message: "Invalid username or password" },
        401
      );
    }

    if (!["Student", "Teacher"].includes(user.role)) {
      return jsonResponse(
        { message: "Invalid user role" },
        403
      );
    }

    const token = jwt.sign(
      {
        userId: user._id.toString(),
        username: user.username,
        email: user.email,
        role: user.role,
      },
      secret,
      { expiresIn: "1d" }
    );

    const response = jsonResponse(
      {
        message: "Login successful",
        user: {
          id: user._id.toString(),
          userId: user._id.toString(),
          username: user.username,
          email: user.email,
          role: user.role,
        },
      },
      200
    );

    response.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24,
    });

    return response;
  } catch (error) {
    printExceptionLog("POST login", error);

    return jsonResponse(
      { message: "Login failed due to a server error" },
      500
    );
  }
}
