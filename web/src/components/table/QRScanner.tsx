import { useState, useRef, useCallback, useEffect } from "react";
import { IoCamera, IoClose, IoQrCode } from "react-icons/io5";
import { Button } from "../custom/Button";
import { Modal, ModalHeader, ModalBody } from "../custom/Modal";
import { addToast } from "../custom/Toast";

interface QRScannerProps {
  onScan: (data: string) => void;
  trigger?: React.ReactNode;
}

export function QRScanner({ onScan, trigger }: QRScannerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState("");
  const [scanning, setScanning] = useState(false);

  const startCamera = useCallback(async () => {
    setError("");
    setScanning(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        scanFrame();
      }
    } catch {
      setError("No se pudo acceder a la cámara. Verifica los permisos.");
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  const scanFrame = useCallback(async () => {
    if (!videoRef.current || !isOpen) return;

    if ("BarcodeDetector" in window) {
      try {
        const detector = new (window as any).BarcodeDetector({
          formats: ["qr_code"],
        });
        const barcodes = await detector.detect(videoRef.current);
        if (barcodes.length > 0) {
          const rawValue = barcodes[0].rawValue;
          stopCamera();
          setIsOpen(false);
          onScan(rawValue);
          return;
        }
      } catch {
        // BarcodeDetector not supported or failed
      }
    }

    requestAnimationFrame(scanFrame);
  }, [isOpen, onScan, stopCamera]);

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [isOpen, startCamera, stopCamera]);

  const handleManualInput = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const value = formData.get("qrInput") as string;
    if (value.trim()) {
      stopCamera();
      setIsOpen(false);
      onScan(value.trim());
    }
  };

  return (
    <>
      {trigger ? (
        <span onClick={() => setIsOpen(true)}>{trigger}</span>
      ) : (
        <Button onClick={() => setIsOpen(true)}>
          <IoQrCode className="mr-1" /> Escanear QR
        </Button>
      )}

      <Modal isOpen={isOpen} onClose={() => { stopCamera(); setIsOpen(false); }}>
        <ModalHeader onClose={() => { stopCamera(); setIsOpen(false); }}>
          Escanear Código QR
        </ModalHeader>
        <ModalBody>
          <div className="space-y-4">
            {error ? (
              <div className="text-center space-y-3">
                <p className="text-sm text-destructive">{error}</p>
                <p className="text-sm text-muted-foreground">
                  También puedes ingresar el código manualmente:
                </p>
                <form onSubmit={handleManualInput} className="flex gap-2">
                  <input
                    name="qrInput"
                    className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
                    placeholder="Ingresa el código QR"
                  />
                  <Button type="submit" size="sm">Enviar</Button>
                </form>
              </div>
            ) : (
              <div className="relative">
                <video
                  ref={videoRef}
                  className="w-full rounded-lg bg-black"
                  playsInline
                />
                <div className="absolute inset-0 border-2 border-primary/50 rounded-lg pointer-events-none" />
                {scanning && (
                  <div className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded">
                    Escaneando...
                  </div>
                )}
              </div>
            )}
          </div>
        </ModalBody>
      </Modal>
    </>
  );
}
