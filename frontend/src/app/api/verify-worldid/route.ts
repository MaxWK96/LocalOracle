import { NextRequest, NextResponse } from "next/server";
import { keccak256, encodeAbiParameters, pad, toHex } from "viem";

/**
 * Replicates IDKit's hashToField(signal):
 *   keccak256(abi.encode(bytes32(signal, right-padded))) >> 8
 * This must match the signal_hash embedded in the ZK proof by the widget.
 */
function hashToField(signal: string): string {
  const signalHex: `0x${string}` = signal.startsWith("0x")
    ? (signal as `0x${string}`)
    : toHex(signal);
  const padded = pad(signalHex, { dir: "right", size: 32 });
  const packed = encodeAbiParameters([{ type: "bytes32" }], [padded]);
  const hash = BigInt(keccak256(packed)) >> BigInt(8);
  return `0x${hash.toString(16).padStart(62, "0")}`;
}

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

    const signal_hash = hashToField(signal || "");

    const payload = {
      nullifier_hash,
      merkle_root,
      proof,
      verification_level,
      action: "localoracleverify",
      signal_hash,
    };

    console.log("[WorldID] Verifying proof", {
      appId,
      action: payload.action,
      signal,
      signal_hash,
      nullifier_hash,
      verification_level,
    });

    console.log("World API payload:", JSON.stringify(payload, null, 2));

    const verifyRes = await fetch(
      `https://developer.worldcoin.org/api/v2/verify/${appId}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );

    const data = await verifyRes.json().catch(() => ({}));

    console.log("[WorldID] Verify response", {
      status: verifyRes.status,
      verification_status: data.verification_status,
      code: data.code,
      detail: data.detail,
    });

    if (!verifyRes.ok || data.verification_status !== "verified") {
      return NextResponse.json(
        {
          success: false,
          detail: data.detail || data.code || `Verification failed (${verifyRes.status})`,
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
