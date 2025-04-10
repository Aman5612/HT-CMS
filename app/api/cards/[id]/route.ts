import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest, { params }: any) {
  const { id } = params;

  // Mock data (replace with your actual API call)
  const cardData = {
    title: "Family Fun: Universal",
    description: "Resorts • Clubs • Beach",
    price: "₹29,000",
    image: "https://example.com/image.jpg",
    link: "https://example.com/explore",
  };

  return NextResponse.json(cardData);
}
