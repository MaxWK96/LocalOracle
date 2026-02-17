export const WORLDID_APP_ID = process.env.NEXT_PUBLIC_WORLDID_APP_ID || "";
export const WORLDID_ACTION = "place-bet";

export async function verifyWorldIDProof(proof: {
  merkle_root: string;
  nullifier_hash: string;
  proof: string;
  verification_level: string;
}, signal: string) {
  const res = await fetch("/api/verify-worldid", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...proof, signal }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "WorldID verification failed");
  }

  return res.json() as Promise<{ verified: boolean; nullifier_hash: string }>;
}
