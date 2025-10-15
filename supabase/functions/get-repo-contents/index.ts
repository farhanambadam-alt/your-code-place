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
    const { owner, repo, path = '', ref } = await req.json();

    if (!owner || !repo) {
      return new Response(
        JSON.stringify({ error: 'Owner and repo are required' }),
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

    const url = ref 
      ? `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${ref}`
      : `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
    console.log('Fetching contents from:', url);

    const githubResponse = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${profile.github_access_token}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'RepoPush',
      },
    });

    if (!githubResponse.ok) {
      const error = await githubResponse.text();
      console.error('GitHub API error:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch repository contents' }),
        { status: githubResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const contents = await githubResponse.json();
    console.log('Successfully fetched contents');

    return new Response(
      JSON.stringify({ contents }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        } 
      }
    );

  } catch (error) {
    console.error('Error in get-repo-contents function:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
