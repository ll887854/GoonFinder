import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("image") as File;

    if (!file) {
      return NextResponse.json(
        { error: "No image uploaded" },
        { status: 400 }
      );
    }

    const saucenaoForm = new FormData();
    saucenaoForm.append("file", file);
    saucenaoForm.append("api_key", process.env.SAUCENAO_API_KEY!);
    saucenaoForm.append("output_type", "2");
    saucenaoForm.append("numres", "6");

    const response = await fetch("https://saucenao.com/search.php", {
      method: "POST",
      body: saucenaoForm,
    });

    const data = await response.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}
