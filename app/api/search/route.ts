import { NextResponse } from "next/server"

export async function POST(req: Request) {
  const formData = await req.formData()
  const image = formData.get("image") as File

  if (!image) {
    return NextResponse.json({ error: "No image" }, { status: 400 })
  }

  const sauceForm = new FormData()
  sauceForm.append("file", image)
  sauceForm.append("api_key", process.env.SAUCENAO_API_KEY!)
  sauceForm.append("output_type", "2")
  sauceForm.append("numres", "8")

  const res = await fetch("https://saucenao.com/search.php", {
    method: "POST",
    body: sauceForm
  })

  const data = await res.json()
  return NextResponse.json(data)
}
