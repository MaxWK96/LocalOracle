import { Market } from "./types";

// Only Weather markets — the CRE oracle workflow fetches rain-probability
// from OpenWeatherMap + WeatherAPI. Sports, Transit, and Community markets
// that require different data sources are not supported yet.
export const MOCK_MARKETS: Market[] = [
  // ── Stockholm, Sweden ───────────────────────────────────────────────────────
  {
    id: 0,
    creator: "0xA11CE000000000000000000000000000000000000",
    question: "Will Strandvägen flood this spring?",
    lat: 59.3308,
    lng: 18.0828,
    endTime: Math.floor(Date.now() / 1000) + 7 * 24 * 3600,
    resolved: false,
    outcome: false,
    totalYesStake: BigInt(150e6),
    totalNoStake: BigInt(80e6),
    category: "Weather",
    location: "Strandvägen, Stockholm",
  },
  {
    id: 1,
    creator: "0xDEAD000000000000000000000000000000000000",
    question: "Snow before March 15 in Södermalm?",
    lat: 59.3150,
    lng: 18.0710,
    endTime: Math.floor(Date.now() / 1000) + 14 * 24 * 3600,
    resolved: false,
    outcome: false,
    totalYesStake: BigInt(200e6),
    totalNoStake: BigInt(100e6),
    category: "Weather",
    location: "Södermalm, Stockholm",
  },

  // ── Warsaw, Poland ──────────────────────────────────────────────────────────
  {
    id: 2,
    creator: "0xE1E1000000000000000000000000000000000000",
    question: "Will the Vistula river exceed flood-warning level (550 cm) this week?",
    lat: 52.2297,
    lng: 21.0122,
    endTime: Math.floor(Date.now() / 1000) + 7 * 24 * 3600,
    resolved: false,
    outcome: false,
    totalYesStake: BigInt(180e6),
    totalNoStake: BigInt(95e6),
    category: "Weather",
    location: "Vistula Embankment, Warsaw",
  },

  // ── Gothenburg, Sweden ──────────────────────────────────────────────────────
  {
    id: 3,
    creator: "0xA3A3000000000000000000000000000000000000",
    question: "Will it snow in central Gothenburg before Sunday?",
    lat: 57.7089,
    lng: 11.9746,
    endTime: Math.floor(Date.now() / 1000) + 4 * 24 * 3600,
    resolved: false,
    outcome: false,
    totalYesStake: BigInt(140e6),
    totalNoStake: BigInt(210e6),
    category: "Weather",
    location: "Avenyn, Gothenburg",
  },
];
