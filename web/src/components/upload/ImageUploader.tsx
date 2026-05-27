import { useState, useCallback } from "react";
import { gql } from "@apollo/client";
import { getApolloClient } from "../../libs/apollo";
import { Spinner } from "../custom/Spinner";
import { addToast } from "../custom/Toast";

const GET_CLOUDINARY_SIGNATURE = gql`
  query getCloudinarySignature($publicId: String!, $timestamp: Int!) {
    getCloudinarySignature(publicId: $publicId, timestamp: $timestamp) {
      signature
      timestamp
      apiKey
      cloudName
      publicId
    }
  }
`;

interface ImageUploaderProps {
  onUpload: (url: string) => void;
  currentImage?: string;
}

export function ImageUploader({ onUpload, currentImage }: ImageUploaderProps) {
  const [preview, setPreview] = useState(currentImage || "");
  const [uploading, setUploading] = useState(false);

  const handleFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      addToast("La imagen no debe superar 5MB", "error");
      return;
    }

    setUploading(true);
    try {
      const timestamp = Math.floor(Date.now() / 1000);
      const publicId = `upload_${timestamp}`;

      const client = getApolloClient();
      const { data } = await client.query({
        query: GET_CLOUDINARY_SIGNATURE,
        variables: { publicId, timestamp },
        fetchPolicy: "network-only",
      });

      if (!data?.getCloudinarySignature) {
        addToast("Error al obtener firma de Cloudinary", "error");
        return;
      }

      const { signature, apiKey, cloudName } = data.getCloudinarySignature;

      const formData = new FormData();
      formData.append("file", file);
      formData.append("public_id", publicId);
      formData.append("signature", signature);
      formData.append("timestamp", String(timestamp));
      formData.append("api_key", apiKey);

      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        { method: "POST", body: formData }
      );
      const result = await res.json();

      if (result.secure_url) {
        setPreview(result.secure_url);
        onUpload(result.secure_url);
        addToast("Imagen subida exitosamente", "success");
      } else {
        addToast("Error al subir imagen a Cloudinary", "error");
      }
    } catch {
      addToast("Error de conexión al subir imagen", "error");
    } finally {
      setUploading(false);
    }
  }, [onUpload]);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-4">
        <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-background hover:bg-muted text-sm font-medium transition-colors">
          {uploading ? <Spinner size="sm" /> : "Subir imagen"}
          <input type="file" accept="image/*" onChange={handleFile} className="hidden" disabled={uploading} />
        </label>
        {preview && (
          <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-border">
            <img src={preview} alt="Preview" className="w-full h-full object-cover" />
          </div>
        )}
      </div>
    </div>
  );
}
