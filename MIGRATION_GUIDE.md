# Migration Guide: Lovable Cloud to Albert Junior Supabase

This guide walks you through migrating your Albert application from Lovable Cloud to a new Supabase instance (Albert Junior).

## Prerequisites

1. **Supabase CLI** installed globally:
   ```bash
   npm install -g supabase
   ```

2. **New Supabase project** created at https://supabase.com

3. **Project credentials** configured in Lovable Cloud secrets:
   - `JR_URL`: Your new Supabase project URL
   - `JR_ANON_KEY`: Your new Supabase anon key
   - `JR_PUB_KEY`: Your new Supabase publishable key
   - `JR_SECRET_KEY`: Your new Supabase service role key

## Migration Steps

### Step 1: Apply Database Schema Migrations

First, you must apply all schema migrations to create tables, RLS policies, functions, and triggers.

**Option A: Using Supabase CLI (Recommended)**

```bash
# 1. Link to your NEW Supabase project
supabase link --project-ref your-new-project-ref

# 2. Apply all migrations
supabase db push

# This will execute all migration files in supabase/migrations/ in order
```

**Option B: Manual SQL Execution**

1. Go to your new Supabase project dashboard
2. Navigate to SQL Editor
3. Execute each migration file from `supabase/migrations/` in chronological order:
   - Start with `20251027153543_remix_batch_8_migrations.sql`
   - End with `20251114221910_ee1c344b-8fb9-45e3-864a-b3ebb08c2ef9.sql`

### Step 2: Deploy Edge Functions

Deploy all edge functions to your new Supabase project:

```bash
# Deploy all functions
supabase functions deploy

# Or deploy individually
supabase functions deploy migrate-to-new-supabase
supabase functions deploy chat
supabase functions deploy gemini-chat
# ... etc for all functions
```

**Edge functions to deploy:**
- analyze-transcript
- api-call
- brave-search
- chat
- gemini-chat
- gemini-chat-with-images
- gemini-process-images
- generate-agent-image
- generate-conversation-title
- generate-image
- get-elevenlabs-models
- get-elevenlabs-voices
- get-shared-conversation
- google-search
- perplexity-search
- run-agent
- speech-to-text
- text-to-speech
- time
- weather
- web-scrape
- cleanup-conversations
- migrate-to-new-supabase

### Step 3: Configure Secrets

Set up all required secrets in your new Supabase project:

```bash
supabase secrets set GEMINI_API_KEY=your-key
supabase secrets set BRAVE_SEARCH_API_KEY=your-key
supabase secrets set ELEVENLABS_API_KEY=your-key
supabase secrets set PERPLEXITY_API_KEY=your-key
supabase secrets set LOVABLE_API_KEY=your-key
# ... etc for all required secrets
```

**Required secrets:**
- GEMINI_API_KEY
- BRAVE_SEARCH_API_KEY
- ELEVENLABS_API_KEY
- PERPLEXITY_API_KEY
- LOVABLE_API_KEY
- OPENAI_API_KEY (if using OpenAI models)

### Step 4: Configure Storage Buckets

Create storage buckets and set policies:

1. Go to Storage in your new Supabase dashboard
2. Create buckets:
   - `profile-images` (public)
   - `generated-images` (public)
   - `translations` (private)
   - `agent-documents` (private)
3. Apply RLS policies for each bucket (refer to original project)

### Step 5: Run Data Migration

Now you can migrate the actual data:

1. Go to your Albert application landing page (deployed from Lovable)
2. Click "Sync to Albert Junior" button in the footer
3. Confirm the migration in the dialog
4. Wait for migration to complete (may take several minutes)
5. Check results for any errors

The migration will copy:
- All users (with temporary passwords)
- All table data
- File attachments metadata

### Step 6: Configure Authentication

Set up authentication settings in your new Supabase project:

1. Go to Authentication → Settings
2. Configure site URL: `https://your-albert-domain.com`
3. Add redirect URLs:
   - `https://your-albert-domain.com/**`
   - `http://localhost:5173/**` (for development)
4. Enable email provider
5. Configure email templates if needed
6. **Important**: Enable "Confirm email" or "Auto-confirm" based on your needs

### Step 7: Update Application Configuration

Update your application to point to the new Supabase instance:

1. Update environment variables in your deployment:
   ```
   VITE_SUPABASE_URL=your-new-supabase-url
   VITE_SUPABASE_PUBLISHABLE_KEY=your-new-anon-key
   ```

2. If using a custom domain, update DNS settings

3. Redeploy your application with new configuration

### Step 8: Verify Migration

1. **Test Authentication**: Try logging in with an existing user account
2. **Password Reset**: All users will need to reset their passwords
3. **Verify Data**: Check that conversations, agents, workflows, etc. are present
4. **Test Features**: Test each major feature (chat, agents, workflows, image analysis, etc.)
5. **Check Edge Functions**: Verify all edge functions are responding correctly
6. **Review Logs**: Check Supabase logs for any errors

### Step 9: User Communication

Notify your users about the migration:

1. All users will need to reset their passwords
2. Provide password reset instructions
3. Inform about any downtime or temporary issues
4. Test with a small group of users first

## Troubleshooting

### Schema Migration Errors

- **Error**: "relation does not exist"
  - **Fix**: Make sure you ran `supabase db push` or executed all migration files

- **Error**: "column does not exist"
  - **Fix**: Check that all migrations were applied in the correct order

### Data Migration Errors

- **Error**: "duplicate key value violates unique constraint"
  - **Fix**: The migration uses `upsert` to handle duplicates, but if this persists, check for ID conflicts

- **Error**: "foreign key constraint violation"
  - **Fix**: Ensure schema migrations were fully completed before running data migration

### Edge Function Errors

- **Error**: "Function not found"
  - **Fix**: Run `supabase functions deploy` to deploy all functions

- **Error**: "Missing environment variable"
  - **Fix**: Set all required secrets using `supabase secrets set`

### Authentication Issues

- **Error**: Users can't log in
  - **Fix**: Ensure authentication is configured and users have reset their passwords

- **Error**: "Invalid redirect URL"
  - **Fix**: Add all application URLs to allowed redirect URLs in Supabase settings

## Post-Migration Checklist

- [ ] All schema migrations applied successfully
- [ ] All edge functions deployed
- [ ] All secrets configured
- [ ] Storage buckets created with correct policies
- [ ] Data migration completed without errors
- [ ] Authentication configured and tested
- [ ] Application environment variables updated
- [ ] Application redeployed with new configuration
- [ ] Test user accounts verified
- [ ] All features tested and working
- [ ] Users notified about password reset requirement
- [ ] DNS/domain configuration updated (if applicable)
- [ ] Old Lovable Cloud project archived or deleted (when confident)

## Rollback Plan

If issues occur during migration:

1. Keep old Lovable Cloud project active until fully verified
2. Update application to point back to old instance if needed
3. Document any issues encountered
4. Fix issues in new instance
5. Retry migration when ready

## Support

For issues during migration:
- Check Supabase logs in Dashboard → Logs
- Check edge function logs
- Review this migration guide
- Contact your development team

## Important Notes

- **Users must reset passwords**: Password hashes cannot be migrated for security reasons
- **Test thoroughly**: Test all features before decommissioning old instance
- **Backup data**: Ensure you have backups before migrating
- **Incremental approach**: Consider migrating in phases if possible
- **Monitor performance**: New instance may need sizing adjustments based on usage
