import { useCallback } from "react";
import { IoQrCode, IoRestaurant } from "react-icons/io5";
import { QRScanner } from "./QRScanner";
import { Card, CardContent } from "../custom/Card";

export default function QRScannerPage() {
  const handleScan = useCallback((data: string) => {
    try {
      const url = new URL(data);
      const restaurantId = url.searchParams.get("restaurant");
      const table = url.searchParams.get("table");
      if (restaurantId) {
        localStorage.setItem("qr_table_number", table || "1");
        window.location.href = `/restaurants/${restaurantId}`;
        return;
      }
    } catch {}
    window.location.href = data;
  }, []);

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <div className="text-center mb-8">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
          <IoQrCode className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-2xl font-bold">Escanea el código QR</h1>
        <p className="mt-2 text-muted-foreground">
          Apunta la cámara al código QR de tu mesa para ver el menú
        </p>
      </div>

      <Card>
        <CardContent className="p-6">
          <QRScanner
            onScan={handleScan}
            trigger={
              <button className="w-full py-8 flex flex-col items-center gap-3 rounded-lg border-2 border-dashed border-primary/50 hover:border-primary transition-colors bg-secondary/50">
                <IoQrCode className="h-12 w-12 text-primary" />
                <span className="text-sm font-medium">Abrir cámara</span>
              </button>
            }
          />
        </CardContent>
      </Card>

      <div className="mt-6 text-center">
        <p className="text-xs text-muted-foreground">
          También puedes ingresar manualmente el número de mesa en el restaurante
        </p>
      </div>
    </div>
  );
}
