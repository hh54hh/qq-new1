# Netlify Deployment Debug Guide

## Current Issues

Your app is showing HTTP 502 errors when deployed to Netlify. This typically means the serverless functions aren't working properly.

## Steps to Fix

### 1. Check Environment Variables in Netlify Dashboard

Go to your Netlify site dashboard → Site configuration → Environment variables

Ensure these variables are set:

```
VITE_SUPABASE_URL=https://yrsvksgkxjiogjuaeyvd.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlyc3Zrc2dreGppb2dqdWFleXZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE4MDMzMDMsImV4cCI6MjA2NzM3OTMwM30.-haPW80fiZMWYCm83TXvwZ2kHHBhcvhWAc6jPYdlUXM
```

### 2. Test Debug Endpoints

After deployment, test these URLs in your browser:

- `https://686bbd2d0c0a3e00089457ac--qq-new.netlify.app/.netlify/functions/api/debug`
- `https://686bbd2d0c0a3e00089457ac--qq-new.netlify.app/.netlify/functions/api/ping`
- `https://686bbd2d0c0a3e00089457ac--qq-new.netlify.app/.netlify/functions/api/health`

### 3. Check Build Logs

In Netlify dashboard → Deploys → [Latest deploy] → Deploy log

Look for:

- Build errors
- Missing dependencies
- Environment variable issues

### 4. Check Function Logs

In Netlify dashboard → Functions → api → View logs

Look for:

- Runtime errors
- Import failures
- Database connection issues

### 5. Manual Testing

Open browser console (F12) on your deployed site and run:

```javascript
// Test direct API call
fetch("/.netlify/functions/api/ping")
  .then((r) => r.json())
  .then(console.log)
  .catch(console.error);

// Test health endpoint
fetch("/.netlify/functions/api/health")
  .then((r) => r.json())
  .then(console.log)
  .catch(console.error);
```

## Common Issues and Solutions

### Issue: "Module not found" errors

**Solution**: Check netlify.toml external_node_modules list includes all dependencies

### Issue: Environment variables not available

**Solution**: Set them in Netlify dashboard under Site configuration → Environment variables

### Issue: Database connection fails

**Solution**: Verify Supabase credentials and RLS policies

### Issue: Build fails

**Solution**: Check package.json scripts and dependencies match development environment

## After Making Changes

1. Redeploy from Netlify dashboard or push new commit
2. Check the debug endpoints again
3. Monitor function logs for any new errors

## Next Steps if Still Failing

If issues persist:

1. Check Supabase dashboard for connection/usage issues
2. Verify RLS policies allow access from your domain
3. Consider using Netlify Edge Functions instead of regular functions
4. Test with a minimal API endpoint first
