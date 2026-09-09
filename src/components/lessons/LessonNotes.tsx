import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StickyNote, Save, Loader2 } from "lucide-react";
import { useContentNote, useSaveContentNote } from "@/hooks/useContentNotesAndFavorites";
import { useToast } from "@/hooks/use-toast";

interface LessonNotesProps {
  contentType: "formation_lesson" | "content_item";
  contentId: string;
}

export function LessonNotes({ contentType, contentId }: LessonNotesProps) {
  const { data: existingNote, isLoading } = useContentNote(contentType, contentId);
  const saveNote = useSaveContentNote();
  const { toast } = useToast();
  const [note, setNote] = useState("");
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    setNote(existingNote?.note || "");
    setIsDirty(false);
  }, [existingNote, contentId]);

  const handleSave = useCallback(async () => {
    try {
      await saveNote.mutateAsync({ contentType, contentId, note });
      setIsDirty(false);
      toast({ title: "Anotação salva! 📝" });
    } catch {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    }
  }, [contentType, contentId, note, saveNote, toast]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <StickyNote className="h-4 w-4 text-yellow-500" />
          Minhas Anotações
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <div className="h-24 flex items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <Textarea
              placeholder="Escreva suas anotações sobre esta aula..."
              value={note}
              onChange={(e) => {
                setNote(e.target.value);
                setIsDirty(true);
              }}
              className="min-h-[100px] resize-y text-sm"
            />
            <Button
              size="sm"
              onClick={handleSave}
              disabled={!isDirty || saveNote.isPending}
              className="gap-2"
            >
              {saveNote.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Salvar
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
