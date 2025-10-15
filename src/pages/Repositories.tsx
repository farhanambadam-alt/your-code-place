import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GitBranch, ExternalLink, Loader2 } from "lucide-react";

interface Repository {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  description: string | null;
  updated_at: string;
}

const Repositories = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState<string | null>(null);
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        fetchProfile(session.user.id);
        fetchRepositories();
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        navigate("/auth");
      } else if (session) {
        fetchProfile(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("github_username")
      .eq("id", userId)
      .single();

    if (!error && data) {
      setUsername(data.github_username);
    }
  };

  const fetchRepositories = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('list-repos');

      if (error) {
        console.error('Error fetching repositories:', error);
        if (error.message?.includes('token is invalid') || error.message?.includes('expired')) {
          navigate("/auth");
        }
        return;
      }

      if (data?.error) {
        console.error('API Error:', data.error);
        if (data.error.includes('token is invalid') || data.error.includes('expired')) {
          navigate("/auth");
        }
        return;
      }

      if (data?.repositories) {
        setRepositories(data.repositories);
      }
    } catch (err) {
      console.error('Exception fetching repositories:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Header username={username} showNav={true} />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold">My Repositories</h2>
              <p className="text-muted-foreground mt-1">Manage your GitHub projects</p>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {repositories.map((repo) => (
                <Card key={repo.id} className="shadow-elevated gradient-card hover:shadow-glow transition-smooth">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <GitBranch className="h-5 w-5 text-primary" />
                      <Button
                        variant="ghost"
                        size="sm"
                        asChild
                      >
                        <a href={repo.html_url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    </div>
                    <CardTitle className="text-lg">{repo.name}</CardTitle>
                    <CardDescription className="line-clamp-2">
                      {repo.description || "No description"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => navigate(`/repository/${repo.full_name.replace('/', '--')}`)}
                    >
                      Manage Files
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {!isLoading && repositories.length === 0 && (
            <Card className="shadow-elevated gradient-card">
              <CardContent className="py-12 text-center">
                <GitBranch className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-lg font-medium mb-2">No repositories yet</p>
                <p className="text-muted-foreground mb-6">
                  Create your first repository to get started
                </p>
                <Button onClick={() => navigate("/dashboard")}>
                  Create Repository
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
};

export default Repositories;
