import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { owner, repo, files, message, branch } = await req.json();

    if (!owner || !repo || !files || !Array.isArray(files)) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (files.length > 100) {
      return new Response(
        JSON.stringify({ error: 'Too many files. Maximum 100 files per batch.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('github_access_token')
      .eq('id', user.id)
      .single();

    if (!profile?.github_access_token) {
      return new Response(
        JSON.stringify({ error: 'GitHub token not found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Uploading ${files.length} files...`);

    const results = await Promise.all(
      files.map(async (file: { path: string; content: string }) => {
        try {
          const url = `https://api.github.com/repos/${owner}/${repo}/contents/${file.path}`;
          
          const githubResponse = await fetch(url, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${profile.github_access_token}`,
              'Accept': 'application/vnd.github.v3+json',
              'Content-Type': 'application/json',
              'User-Agent': 'RepoPush',
            },
            body: JSON.stringify({
              message: message || `Upload ${file.path}`,
              content: file.content,
              branch: branch || 'main',
            }),
          });

          if (!githubResponse.ok) {
            const error = await githubResponse.text();
            console.error(`Failed to upload ${file.path}:`, error);
            return {
              path: file.path,
              success: false,
              error: error,
            };
          }

          console.log(`Successfully uploaded ${file.path}`);
          return {
            path: file.path,
            success: true,
          };
        } catch (err) {
          console.error(`Exception uploading ${file.path}:`, err);
          return {
            path: file.path,
            success: false,
            error: err instanceof Error ? err.message : 'Unknown error',
          };
        }
      })
    );

    const successCount = results.filter(r => r.success).length;
    console.log(`Upload complete: ${successCount}/${files.length} successful`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        results,
        summary: {
          total: files.length,
          successful: successCount,
          failed: files.length - successCount,
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in upload-files function:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
