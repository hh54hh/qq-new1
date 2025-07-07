# Deployment Guide

## Netlify Deployment

### Prerequisites

1. Create a Supabase project
2. Get your Supabase URL and anon key

### Environment Variables

Set these in Netlify Dashboard > Site Settings > Environment Variables:

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
JWT_SECRET=your_jwt_secret
NODE_ENV=production
```

### Build Settings

- **Build command**: `npm ci && npm run build:client`
- **Publish directory**: `dist/spa`
- **Functions directory**: `netlify/functions`

### Deployment Steps

1. Push your code to GitHub
2. Connect your repository to Netlify
3. Configure environment variables
4. Deploy

The build process is now optimized and should work without issues.

## Local Development

```bash
npm install
npm run dev
```

## Production Build Test

```bash
npm run build
npm run start
```
