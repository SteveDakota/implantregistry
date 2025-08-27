# Vercel Deployment Rules

## ESLint Rule: Unescaped Apostrophes

**CRITICAL**: Before every commit/deployment, check for unescaped apostrophes in JSX.

### The Rule
ESLint rule `react/no-unescaped-entities` requires all apostrophes in JSX text to be escaped.

### Common Errors
- `Don't` → should be `Don&apos;t`  
- `you'll` → should be `you&apos;ll`
- `can't` → should be `can&apos;t`
- `won't` → should be `won&apos;t`

### How to Fix
Replace any `'` in JSX text content with `&apos;`

### Files to Always Check
- `src/app/dentist/page.tsx`
- `src/app/patient/page.tsx` 
- `src/app/patient/register/page.tsx`
- Any new JSX files with text content

### Before Every Commit
1. Search codebase for unescaped apostrophes in JSX
1.5 wrap useSearchParams in a
  Suspense boundary.
2. Replace `'` with `&apos;` in text content
3. Test build: `npm run build`
4. Only commit if build succeeds

**Remember: This error ALWAYS causes Vercel deployment failures!**

## Smart Contract Status
- **Production Contract**: `0xa9C5551E057631c94AE6c46368843acA8f95a1ba` (Clean, no old data)
- **Deployed**: August 27, 2025