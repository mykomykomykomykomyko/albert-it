import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  repoUrl: string;
  branch?: string;
  path?: string;
  filePath?: string;
  operation: 'tree' | 'file' | 'commits' | 'readme';
  count?: number;
}

function parseGitHubUrl(url: string): { owner: string; repo: string } | null {
  // Handle various GitHub URL formats
  const patterns = [
    /github\.com\/([^\/]+)\/([^\/\?#]+)/,
    /^([^\/]+)\/([^\/]+)$/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return { owner: match[1], repo: match[2].replace(/\.git$/, '') };
    }
  }
  return null;
}

async function fetchFromGitHub(
  endpoint: string,
  headers: Record<string, string>
): Promise<Response> {
  const response = await fetch(`https://api.github.com${endpoint}`, {
    headers: {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'ALBERT-IT-Agent',
      ...headers,
    },
  });
  return response;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: RequestBody = await req.json();
    const { repoUrl, branch = 'main', path = '', filePath, operation, count = 10 } = body;

    const parsed = parseGitHubUrl(repoUrl);
    if (!parsed) {
      return new Response(
        JSON.stringify({ error: "Invalid GitHub repository URL" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { owner, repo } = parsed;
    const headers: Record<string, string> = {};
    
    // Optional: Use GitHub token if available for higher rate limits
    const githubToken = Deno.env.get("GITHUB_TOKEN");
    if (githubToken) {
      headers['Authorization'] = `token ${githubToken}`;
    }

    let result: unknown;

    switch (operation) {
      case 'tree': {
        // Get repository tree
        const treeResponse = await fetchFromGitHub(
          `/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`,
          headers
        );
        
        if (!treeResponse.ok) {
          const errorText = await treeResponse.text();
          throw new Error(`GitHub API error: ${treeResponse.status} - ${errorText}`);
        }
        
        const treeData = await treeResponse.json();
        
        // Filter by path if specified
        let files = treeData.tree || [];
        if (path) {
          files = files.filter((f: { path: string }) => f.path.startsWith(path));
        }
        
        // Limit results and format
        result = {
          repository: `${owner}/${repo}`,
          branch,
          path: path || '/',
          totalFiles: files.length,
          files: files.slice(0, 100).map((f: { path: string; type: string; size?: number }) => ({
            path: f.path,
            type: f.type,
            size: f.size,
          })),
          truncated: files.length > 100,
        };
        break;
      }

      case 'file': {
        if (!filePath) {
          return new Response(
            JSON.stringify({ error: "filePath is required for file operation" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const fileResponse = await fetchFromGitHub(
          `/repos/${owner}/${repo}/contents/${filePath}?ref=${branch}`,
          headers
        );
        
        if (!fileResponse.ok) {
          if (fileResponse.status === 404) {
            return new Response(
              JSON.stringify({ error: `File not found: ${filePath}` }),
              { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
          const errorText = await fileResponse.text();
          throw new Error(`GitHub API error: ${fileResponse.status} - ${errorText}`);
        }
        
        const fileData = await fileResponse.json();
        
        // Decode base64 content
        let content = '';
        if (fileData.content) {
          try {
            content = atob(fileData.content.replace(/\n/g, ''));
          } catch {
            content = '[Binary file - cannot display content]';
          }
        }
        
        result = {
          repository: `${owner}/${repo}`,
          branch,
          path: filePath,
          name: fileData.name,
          size: fileData.size,
          sha: fileData.sha,
          content,
          encoding: fileData.encoding,
        };
        break;
      }

      case 'commits': {
        const commitsResponse = await fetchFromGitHub(
          `/repos/${owner}/${repo}/commits?sha=${branch}&per_page=${count}`,
          headers
        );
        
        if (!commitsResponse.ok) {
          const errorText = await commitsResponse.text();
          throw new Error(`GitHub API error: ${commitsResponse.status} - ${errorText}`);
        }
        
        const commits = await commitsResponse.json();
        
        result = {
          repository: `${owner}/${repo}`,
          branch,
          totalCommits: commits.length,
          commits: commits.map((c: {
            sha: string;
            commit: {
              message: string;
              author: { name: string; email: string; date: string };
            };
            author?: { login: string; avatar_url: string };
          }) => ({
            sha: c.sha.slice(0, 7),
            fullSha: c.sha,
            message: c.commit.message,
            author: c.commit.author.name,
            email: c.commit.author.email,
            date: c.commit.author.date,
            authorLogin: c.author?.login,
            avatarUrl: c.author?.avatar_url,
          })),
        };
        break;
      }

      case 'readme': {
        const readmeResponse = await fetchFromGitHub(
          `/repos/${owner}/${repo}/readme?ref=${branch}`,
          headers
        );
        
        if (!readmeResponse.ok) {
          if (readmeResponse.status === 404) {
            return new Response(
              JSON.stringify({ error: "README not found in repository" }),
              { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
          const errorText = await readmeResponse.text();
          throw new Error(`GitHub API error: ${readmeResponse.status} - ${errorText}`);
        }
        
        const readmeData = await readmeResponse.json();
        
        let content = '';
        if (readmeData.content) {
          try {
            content = atob(readmeData.content.replace(/\n/g, ''));
          } catch {
            content = '[Could not decode README content]';
          }
        }
        
        result = {
          repository: `${owner}/${repo}`,
          branch,
          name: readmeData.name,
          path: readmeData.path,
          size: readmeData.size,
          content,
        };
        break;
      }

      default:
        return new Response(
          JSON.stringify({ error: `Unknown operation: ${operation}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("GitHub fetch error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
