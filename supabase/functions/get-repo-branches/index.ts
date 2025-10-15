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
    const { repositoryName } = await req.json();

    if (!repositoryName) {
      return new Response(
        JSON.stringify({ error: 'Repository name is required' }),
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
      .select('github_access_token, github_username')
      .eq('id', user.id)
      .single();

    if (!profile?.github_access_token) {
      return new Response(
        JSON.stringify({ error: 'GitHub token not found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const githubToken = profile.github_access_token;
    const owner = profile.github_username;

    console.log(`Fetching branches for repository: ${owner}/${repositoryName}`);

    const branchesResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repositoryName}/branches`,
      {
        headers: {
          'Authorization': `Bearer ${githubToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'RepoPush',
        },
      }
    );

    if (!branchesResponse.ok) {
      const errorText = await branchesResponse.text();
      console.error('Failed to fetch branches:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch branches from GitHub' }),
        { status: branchesResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const branches = await branchesResponse.json();
    console.log(`Found ${branches.length} branches`);

    return new Response(
      JSON.stringify({ branches }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in get-repo-branches function:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
