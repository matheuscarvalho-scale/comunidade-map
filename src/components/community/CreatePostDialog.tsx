import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreatePost } from "@/hooks/usePosts";
import { useToast } from "@/hooks/use-toast";

const categories = ["Geral", "Suporte", "Implementação", "Feedback"] as const;

export function CreatePostDialog() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newPost, setNewPost] = useState({ title: "", content: "", category: "Geral" });
  const createPost = useCreatePost();

  const handleCreatePost = () => {
    if (!newPost.title.trim() || !newPost.content.trim()) return;

    createPost.mutate(
      {
        title: newPost.title,
        content: newPost.content,
        category: newPost.category,
      },
      {
        onSuccess: () => {
          toast({
            title: "Tópico criado! 🎉",
            description: "Seu tópico foi publicado na comunidade.",
          });
          setNewPost({ title: "", content: "", category: "Geral" });
          setIsDialogOpen(false);
        },
        onError: () => {
          toast({
            title: "Erro ao criar tópico",
            description: "Tente novamente.",
            variant: "destructive",
          });
        },
      }
    );
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button className="rounded-full gap-2">
          <Plus className="h-4 w-4" />
          Criar Tópico
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Criar Novo Tópico</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Título</label>
            <Input
              placeholder="Digite o título do seu tópico..."
              value={newPost.title}
              onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Categoria</label>
            <Select
              value={newPost.category}
              onValueChange={(value) => setNewPost({ ...newPost, category: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Conteúdo</label>
            <Textarea
              placeholder="Escreva o conteúdo do seu tópico..."
              value={newPost.content}
              onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
              rows={5}
            />
          </div>
          <Button
            className="w-full rounded-full"
            onClick={handleCreatePost}
            disabled={!newPost.title.trim() || !newPost.content.trim() || createPost.isPending}
          >
            {createPost.isPending ? "Publicando..." : "Publicar Tópico"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
