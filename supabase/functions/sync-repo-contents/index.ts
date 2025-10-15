import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';
import { getGitHubToken, createOrGetBranch } from '../_shared/github-helper.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sourceRepo, sourceBranch, destRepo, destBranch } = await req.json();

    if (!sourceRepo || !sourceBranch || !destRepo || !destBranch) {
      return new Response(
        JSON.stringify({ error: 'All fields are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const profile = await getGitHubToken(req);
    if (!profile) {
      return new Response(
        JSON.stringify({ error: 'Your GitHub token is invalid or has expired. Please log out and log back in.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const githubToken = profile.github_access_token;
    const owner = profile.github_username;

    console.log(`Syncing ${owner}/${sourceRepo}:${sourceBranch} -> ${owner}/${destRepo}:${destBranch}`);

    // Ensure destination branch exists
    const branchResult = await createOrGetBranch(owner, destRepo, destBranch, githubToken);
    if (!branchResult.success) {
      return new Response(
        JSON.stringify({ error: `Failed to create/access destination branch: ${branchResult.error}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get source repository tree
    const treeResponse = await fetch(
      `https://api.github.com/repos/${owner}/${sourceRepo}/git/trees/${sourceBranch}?recursive=1`,
      {
        headers: {
          'Authorization': `Bearer ${githubToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'RepoPush',
        },
      }
    );

    if (!treeResponse.ok) {
      const errorText = await treeResponse.text();
      console.error('Failed to fetch repository tree:', errorText);
      
      if (treeResponse.status === 401) {
        return new Response(
          JSON.stringify({ error: 'Your GitHub token is invalid or has expired. Please log out and log back in.' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error('Failed to fetch source repository tree. Please verify the branch exists.');
    }

    const treeData = await treeResponse.json();
    const files = treeData.tree.filter((item: any) => item.type === 'blob');

    console.log(`Found ${files.length} files to sync`);

    let syncedCount = 0;
    const MAX_FILES = 100; // Limit to prevent timeouts

    for (const file of files.slice(0, MAX_FILES)) {
      try {
        // Get file content
        const fileResponse = await fetch(
          `https://api.github.com/repos/${owner}/${sourceRepo}/contents/${file.path}?ref=${sourceBranch}`,
          {
            headers: {
              'Authorization': `Bearer ${githubToken}`,
              'Accept': 'application/vnd.github.v3+json',
              'User-Agent': 'RepoPush',
            },
          }
        );

        if (fileResponse.ok) {
          const fileData = await fileResponse.json();
          
          // Push to destination
          // Check if file already exists in destination
          const checkResponse = await fetch(
            `https://api.github.com/repos/${owner}/${destRepo}/contents/${file.path}?ref=${destBranch}`,
            {
              headers: {
                'Authorization': `Bearer ${githubToken}`,
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'RepoPush',
              },
            }
          );
          
          const fileExists = checkResponse.ok;
          const existingFile = fileExists ? await checkResponse.json() : null;
          
          const uploadResponse = await fetch(
            `https://api.github.com/repos/${owner}/${destRepo}/contents/${file.path}`,
            {
              method: 'PUT',
              headers: {
                'Authorization': `Bearer ${githubToken}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json',
                'User-Agent': 'RepoPush',
              },
              body: JSON.stringify({
                message: `Sync: Merged ${file.path} from ${sourceRepo}:${sourceBranch}`,
                content: fileData.content,
                branch: destBranch,
                ...(fileExists && existingFile?.sha ? { sha: existingFile.sha } : {}),
              }),
            }
          );

          if (uploadResponse.ok) {
            syncedCount++;
            console.log(`Synced: ${file.path}`);
          } else {
            const errorText = await uploadResponse.text();
            console.error(`Failed to sync ${file.path}:`, errorText);
          }
        }
      } catch (err) {
        console.error(`Error syncing ${file.path}:`, err);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        files_synced: syncedCount,
        total_files: files.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in sync-repo-contents function:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
