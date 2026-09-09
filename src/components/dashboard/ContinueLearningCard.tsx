import { BookOpen, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Link } from "react-router-dom";

interface Course {
  id: string;
  title: string;
  description: string | null;
  category: string;
  thumbnail: string | null;
}

interface ContinueLearningCardProps {
  course: Course;
  progress: number;
}

export function ContinueLearningCard({ course, progress }: ContinueLearningCardProps) {
  return (
    <Card className="card-glow border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <BookOpen className="h-5 w-5 text-primary" />
          Continue Aprendendo
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4 sm:flex-row">
          <img
            src={course.thumbnail || "/placeholder.svg"}
            alt={course.title}
            className="h-32 w-full rounded-lg object-cover sm:w-48"
          />
          <div className="flex flex-1 flex-col justify-between">
            <div>
              <Badge variant="outline" className="mb-2 text-primary border-primary/30">
                {course.category}
              </Badge>
              <h3 className="font-semibold">{course.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                {course.description}
              </p>
            </div>
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Progresso</span>
                <span className="font-medium text-primary">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          </div>
        </div>
        <Button asChild className="mt-4 w-full rounded-full" variant="outline">
          <Link to={`/formacoes/${course.id}`}>
            Continuar Curso <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
