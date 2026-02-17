"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Market } from "@/lib/types";

// Dynamic imports to avoid SSR issues with Leaflet
const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import("react-leaflet").then((mod) => mod.Marker),
  { ssr: false }
);
const Popup = dynamic(
  () => import("react-leaflet").then((mod) => mod.Popup),
  { ssr: false }
);

interface MapViewProps {
  markets: Market[];
  onSelectMarket: (market: Market) => void;
  selectedMarket: Market | null;
}

function formatUSDC(amount: bigint): string {
  return `$${(Number(amount) / 1e6).toFixed(0)}`;
}

export default function MapView({ markets, onSelectMarket, selectedMarket }: MapViewProps) {
  const [isClient, setIsClient] = useState(false);
  const [userPos, setUserPos] = useState<[number, number]>([59.33, 18.07]); // Stockholm default

  useEffect(() => {
    setIsClient(true);

    // Fix Leaflet default icon issue in Next.js
    import("leaflet").then((L) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });
    });

    // Get user location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserPos([pos.coords.latitude, pos.coords.longitude]),
        () => {} // silently use default
      );
    }
  }, []);

  if (!isClient) {
    return (
      <div className="w-full h-full bg-gray-800 flex items-center justify-center text-gray-500">
        Loading map...
      </div>
    );
  }

  return (
    <MapContainer
      center={userPos}
      zoom={13}
      className="w-full h-full"
      style={{ background: "#1a1a2e" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {markets.map((market) => (
        <Marker
          key={market.id}
          position={[market.lat, market.lng]}
          eventHandlers={{
            click: () => onSelectMarket(market),
          }}
        >
          <Popup>
            <div className="text-sm">
              <p className="font-medium mb-1">{market.question}</p>
              <p className="text-gray-600">
                Pool: {formatUSDC(market.totalYesStake + market.totalNoStake)}
              </p>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
