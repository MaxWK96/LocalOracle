export type MarketCategory = "Weather" | "Transit" | "Sports" | "Community";

export interface Market {
  id: number;
  creator: string;
  question: string;
  lat: number;  // actual lat (e.g. 59.33)
  lng: number;  // actual lng (e.g. 18.07)
  endTime: number; // unix timestamp
  resolved: boolean;
  outcome: boolean;
  totalYesStake: bigint;
  totalNoStake: bigint;
  category?: MarketCategory;
  location?: string;
}

export interface Position {
  yesAmount: bigint;
  noAmount: bigint;
  claimed: boolean;
}

export interface WorldIDProof {
  merkle_root: string;
  nullifier_hash: string;
  proof: string;
  verification_level: string;
}
