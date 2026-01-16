import { NextRequest, NextResponse } from "next/server";
import pool from "@/db"; // Using your shared pool

export async function GET() {
  try {
    const res = await pool.query("SELECT * FROM categories ORDER BY name ASC");
    return NextResponse.json(res.rows);
  } catch (err) {
    return NextResponse.json({ error: "Failed to fetch categories" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { name } = await req.json();
    const res = await pool.query(
      "INSERT INTO categories (name) VALUES ($1) ON CONFLICT (name) DO NOTHING RETURNING *",
      [name]
    );
    return NextResponse.json(res.rows[0] || { message: "Category exists" });
  } catch (err) {
    return NextResponse.json({ error: "Failed to create category" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    // This will delete the category AND all documents inside it (Cascade)
    await pool.query("DELETE FROM categories WHERE id = $1", [id]);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to delete category" }, { status: 500 });
  }
}