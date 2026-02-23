import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { merkle_root, nullifier_hash, proof, verification_level, signal } = body;

    const appId = process.env.NEXT_PUBLIC_WORLDID_APP_ID;
    if (!appId) {
      console.error("[WorldID] NEXT_PUBLIC_WORLDID_APP_ID is not set");
      return NextResponse.json(
        { success: false, detail: "WorldID app_id not configured" },
        { status: 500 }
      );
    }

    console.log("[WorldID] Verifying proof", {
      appId,
      action: "localoracleverify",
      signal,
      nullifier_hash,
      verification_level,
    });

    const verifyRes = await fetch(
      "https://developer.worldcoin.org/api/v2/verify",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          app_id: appId,
          action: "localoracleverify",
          signal,
          proof,
          nullifier_hash,
          merkle_root,
          verification_level,
        }),
      }
    );

    const data = await verifyRes.json().catch(() => ({}));

    console.log("[WorldID] Verify response", {
      status: verifyRes.status,
      verification_status: data.verification_status,
      detail: data.detail,
    });

    if (!verifyRes.ok || data.verification_status !== "verified") {
      return NextResponse.json(
        {
          success: false,
          detail: data.detail || `Verification failed (${verifyRes.status})`,
        },
        { status: verifyRes.status || 400 }
      );
    }

    return NextResponse.json({ success: true, nullifier_hash });
  } catch (e) {
    console.error("[WorldID] Internal error:", e);
    return NextResponse.json(
      { success: false, detail: "Internal server error" },
      { status: 500 }
    );
  }
}
