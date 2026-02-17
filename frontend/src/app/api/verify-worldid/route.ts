import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { merkle_root, nullifier_hash, proof, verification_level, signal } = body;

    const appId = process.env.NEXT_PUBLIC_WORLDID_APP_ID;
    if (!appId) {
      return NextResponse.json(
        { detail: "WorldID app_id not configured" },
        { status: 500 }
      );
    }

    const verifyRes = await fetch(
      `https://developer.worldcoin.org/api/v2/verify/${appId}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          merkle_root,
          nullifier_hash,
          proof,
          verification_level,
          action: "place-bet",
          signal,
        }),
      }
    );

    if (!verifyRes.ok) {
      const err = await verifyRes.json();
      return NextResponse.json(
        { detail: err.detail || "Verification failed" },
        { status: verifyRes.status }
      );
    }

    return NextResponse.json({
      verified: true,
      nullifier_hash,
    });
  } catch {
    return NextResponse.json(
      { detail: "Internal server error" },
      { status: 500 }
    );
  }
}
