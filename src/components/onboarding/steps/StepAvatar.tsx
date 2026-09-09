import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Camera, Loader2, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface StepAvatarProps {
  onComplete: (avatarUrl?: string) => void;
  onBack: () => void;
  isLoading: boolean;
}

export function StepAvatar({ onComplete, onBack, isLoading }: StepAvatarProps) {
  const { user } = useAuth();
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Preview
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);

    // Upload to Supabase Storage
    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `${user.id}/avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
      setAvatarUrl(data.publicUrl);
    } catch (error) {
      console.error("Error uploading avatar:", error);
    } finally {
      setUploading(false);
    }
  };

  const handleComplete = () => {
    onComplete(avatarUrl || undefined);
  };

  const handleSkip = () => {
    onComplete();
  };

  return (
    <div className="space-y-8">
      <div className="text-center">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Camera className="w-6 h-6 text-lime" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">
          Adicione uma foto de perfil
        </h2>
        <p className="text-muted-foreground">
          Opcional - ajuda outros membros a te reconhecer
        </p>
      </div>

      <div className="flex flex-col items-center gap-6">
        <div
          onClick={() => fileInputRef.current?.click()}
          className="w-32 h-32 rounded-full bg-surface border-2 border-dashed border-border hover:border-lime transition-colors cursor-pointer flex items-center justify-center overflow-hidden"
        >
          {uploading ? (
            <Loader2 className="w-8 h-8 text-lime animate-spin" />
          ) : preview ? (
            <img
              src={preview}
              alt="Preview"
              className="w-full h-full object-cover"
            />
          ) : (
            <User className="w-12 h-12 text-muted-foreground" />
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />

        <Button
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="border-lime text-lime hover:bg-lime hover:text-black"
        >
          <Camera className="w-4 h-4 mr-2" />
          {preview ? "Trocar foto" : "Escolher foto"}
        </Button>
      </div>

      <div className="flex flex-col gap-3 pt-4">
        <Button
          onClick={handleComplete}
          disabled={isLoading || uploading}
          className="w-full bg-lime text-black hover:bg-lime/90"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Finalizando...
            </>
          ) : (
            "Concluir configuração"
          )}
        </Button>

        <div className="flex gap-4">
          <Button
            variant="outline"
            onClick={onBack}
            disabled={isLoading}
            className="flex-1 border-border"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <Button
            variant="ghost"
            onClick={handleSkip}
            disabled={isLoading}
            className="flex-1 text-muted-foreground"
          >
            Pular por agora
          </Button>
        </div>
      </div>
    </div>
  );
}
