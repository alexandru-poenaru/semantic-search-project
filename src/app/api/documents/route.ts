import { NextRequest, NextResponse } from "next/server";
import pool from "@/db";

// GET: List files (Grouped by name)
export async function GET() {
  try {
    // We group by filename and category to show 1 row per file
    const res = await pool.query(`
      SELECT 
        MIN(d.id) as id, -- Just take the first ID as a reference
        d.metadata->>'filename' as filename,
        d.category_id,
        c.name as category_name,
        MAX(d.created_at) as created_at, -- Show the most recent date
        COUNT(*) as chunk_count -- Optional: show how many chunks it has
      FROM documents d
      LEFT JOIN categories c ON d.category_id = c.id
      GROUP BY d.metadata->>'filename', d.category_id, c.name
      ORDER BY MAX(d.created_at) DESC
    `);
    
    return NextResponse.json(res.rows);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch docs" }, { status: 500 });
  }
}

// PATCH: Move a file (Update ALL chunks with this filename)
export async function PATCH(req: NextRequest) {
  try {
    const { filename, currentCategoryId, newCategoryId } = await req.json();
    
    await pool.query(
      `UPDATE documents 
       SET category_id = $1 
       WHERE metadata->>'filename' = $2 AND category_id = $3`, 
      [newCategoryId, filename, currentCategoryId]
    );
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to move doc" }, { status: 500 });
  }
}

// DELETE: Remove a file (Delete ALL chunks with this filename)
export async function DELETE(req: NextRequest) {
  try {
    const { filename, categoryId } = await req.json();
    
    await pool.query(
      `DELETE FROM documents 
       WHERE metadata->>'filename' = $1 AND category_id = $2`, 
      [filename, categoryId]
    );
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to delete doc" }, { status: 500 });
  }
}