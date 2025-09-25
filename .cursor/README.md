# Cursor IDE Configuration

This directory contains configuration files for Cursor IDE with MCP (Model Context Protocol) servers.

## Setup

1. Copy `.cursor/mcp.json.template` to `.cursor/mcp.json`
2. Replace all placeholder values with your actual API keys:
   - `your_anthropic_api_key_here` - Your Anthropic API key
   - `your_perplexity_api_key_here` - Your Perplexity API key
   - `your_supabase_access_token_here` - Your Supabase access token
   - `your_github_personal_access_token_here` - Your GitHub personal access token
   - `your_exa_api_key_here` - Your Exa API key
   - Update the memory path to your local path

## Security Note

The `.cursor/mcp.json` file contains sensitive API keys and is intentionally excluded from git via `.gitignore`. Only the template file is tracked in the repository.
