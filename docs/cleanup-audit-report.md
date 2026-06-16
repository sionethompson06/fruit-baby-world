# Fruit Baby World — Safe Codebase Cleanup Audit

**Date:** 2026-06-16  
**Branch:** `main` (up to date with `origin/main`)  
**Audit type:** Read-only inspection — no files were deleted, moved, or modified.

---

## 1. Build Status

### npm run build

```
✅ PASSING — Build completed with zero errors or warnings.
```

All routes compiled. Verified output:

```
/stories          ƒ (Dynamic)
/stories/[slug]   ● (SSG — 3 stories)
/stories/animated/[slug]  ƒ (Dynamic)
/characters       ƒ (Dynamic)
/characters/[slug] ƒ (Dynamic)
/shop             ƒ (Dynamic)
/admin/**         ƒ (Dynamic)
Proxy (Middleware) — proxy.ts active
```

### git status

```
On branch main
Your branch is up to date with 'origin/main'.
nothing to commit, working tree clean
```

---

## 2. Executive Summary

| Category | Count |
|---|---|
| High-confidence safe cleanup candidates | 8 |
| Medium-confidence candidates (need human review) | 9 |
| Uncertain / possibly dynamic | 4 |
| Do-not-touch systems | All admin routes, API routes, content JSON, character/product/story assets |

**Top-line observations:**
- The `public/` directory is **245 MB** — almost entirely uncompressed PNG files for characters (174 MB) and backgrounds (62 MB). These are the dominant performance concern.
- No zip archives, no leftover `.next` or `node_modules` were committed.
- One log file (`build-output.log`) is committed and not gitignored.
- Five default Next.js scaffold SVGs in `public/` are never referenced by any app code.
- Several early-iteration pineapple-baby PNG/SVG files appear superseded by higher-quality variants.
- Four admin pages are explicitly labeled "Developer / Legacy" in the AdminNav and exist as real routes.

---

## 3. Safe-to-Review Cleanup Candidates

Items below appear safe to remove in a future cleanup phase. **Nothing was deleted.**

### 3.1 Committed log file

| File | Size | Reason | Risk |
|---|---|---|---|
| `build-output.log` | 3.7 KB | Build log accidentally committed; not in `.gitignore`; contains no app logic | Very Low |

**Evidence:** `git ls-files build-output.log` confirms it is tracked. `.gitignore` does not list it.  
**Recommendation:** Add `build-output.log` to `.gitignore` and remove from tracking.

---

### 3.2 Default Next.js scaffold SVGs

These five files are created by `create-next-app` and are never imported or referenced anywhere in `src/`:

| File | Size | Referenced? |
|---|---|---|
| `public/file.svg` | 4 KB | No |
| `public/globe.svg` | 4 KB | No |
| `public/next.svg` | 4 KB | No |
| `public/vercel.svg` | 4 KB | No |
| `public/window.svg` | 4 KB | No |

**Evidence:** `grep -r "file.svg\|globe.svg\|next.svg\|vercel.svg\|window.svg" src/` returned zero results.  
**Recommendation:** Safe to delete in Phase Cleanup 1.

---

### 3.3 Early-iteration pineapple-baby images (small, superseded)

These small 16 KB PNG files and two SVG files appear to be early-iteration placeholder images, now replaced by higher-resolution equivalents (1.6–1.7 MB each) in the same folder:

| File | Size | Referenced? |
|---|---|---|
| `public/characters/pineapple-baby/pineapple_baby_happy.png` | 16 KB | No |
| `public/characters/pineapple-baby/pineapple_baby_sad.png` | 16 KB | No |
| `public/characters/pineapple-baby/pineapple_baby_sleepy.png` | 16 KB | No |
| `public/characters/pineapple-baby/pineapple_baby_sparkle_joy.png` | 16 KB | No |
| `public/characters/pineapple-baby/pineapple_baby_classic.svg` | 4 KB | No |
| `public/characters/pineapple-baby/pineapple_baby_surprised.svg` | 4 KB | No |

**Evidence:** Zero grep matches for these filenames in `src/`. High-res equivalents (e.g. `pineapple happy_smile_fun_playing.png` at 1.6 MB) are referenced in `StoriesPageClient.tsx` and `characterPowerData.ts`.  
**Recommendation:** Confirm visually, then remove in Phase Cleanup 2.

---

### 3.4 Misplaced / unreferenced character folder images

Two images appear to be environmental/product assets stored inside a character image folder, with no code references:

| File | Size | Issue | Referenced? |
|---|---|---|---|
| `public/characters/dragon-fruit-baby/Dragon Fruit Haven waterfall_bridge_river.png` | 2.3 MB | Background/environment image filed under character portraits | No |
| `public/characters/mango-baby/mango mockup.png` | 1.8 MB | Appears to be an early product mockup; filed under character poses | No |

**Evidence:** Zero grep matches in `src/` for these filenames. All other character image references in code use specific pose filenames.  
**Recommendation:** Move to correct folder (backgrounds or products) or remove after confirming with creator. Phase Cleanup 2.

---

## 4. Uncertain / Needs Human Review

### 4.1 Legacy episode content

| File | Size | Status | Note |
|---|---|---|---|
| `src/content/episodes/sample-episode.json` | 56 KB | `draft` | Slug is `sample-episode`; directly imported in `content.ts`. Filtered out of public because `status=draft`. Appears to be an early development scaffold. **Largest episode file by far.** |
| `src/content/episodes/pineapple-baby-and-the-tanglevine-challenge.json` | 4 KB | `draft` | Appears superseded by `pineapple-baby-and-the-tanglevine-challenge-2.json` (24 KB, `status=published`). Same story, likely an abandoned first draft. |
| `src/content/episodes/words-have-consequences-.json` | 8 KB | `draft` | Note the trailing dash in the filename — possible malformed slug. Title is "Words Have Consequences ". Status is draft. |

**Risk if removed:** These are loaded via `savedEpisodes.ts` (`fs.readdirSync`) and through static imports in `content.ts`. Removing them from disk would make `content.ts` fail to compile (for `sample-episode.json`) unless the import is also removed. The other two are loaded dynamically and would simply disappear from the admin episode list.

**Recommendation:** Do not delete without also updating `content.ts` imports. Review with creator before removing.

---

### 4.2 Legacy static product JSON files

These four product files are directly imported by `content.ts` into a static `products[]` array. Their visibility is controlled by the `status` field (currently all `concept`), which is filtered before public display:

| File | Size | Status |
|---|---|---|
| `src/content/products/sample-product.json` | 4 KB | `concept` |
| `src/content/products/fruit-baby-sticker-pack.json` | 4 KB | `concept` |
| `src/content/products/tiki-trouble-collectible.json` | 4 KB | `concept` |
| `src/content/products/ube-baby-squish.json` | 4 KB | `concept` |

**Note:** A newer `product-concepts.json` and `collectables.json` system appears to be the active CMS path. These four static files may be early-iteration stubs.  
**Risk if removed:** `content.ts` imports them directly — removing files without removing imports would cause a build error.  
**Recommendation:** Review with creator; if superseded by CMS, remove imports from `content.ts` and then the files. Defer to Phase Cleanup 4.

---

### 4.3 Brand reference images

| File | Size | Referenced in code? |
|---|---|---|
| `public/brand-references/fruit-baby-universe-title-reference.png` | 88 KB | Only in `src/content/site/brand-style-references.json` (AI reference data) |
| `public/brand-references/pineapple-baby-title-reference.png` | 360 KB | Only in `src/content/site/brand-style-references.json` (AI reference data) |

**Note:** These are used as brand style reference images sent to AI generation APIs, not rendered on the public site. They are intentional but invisible to end users.  
**Recommendation:** Keep — they serve a purpose in the AI pipeline.

---

### 4.4 `.gitkeep` files in character directories

Six character folders contain `.gitkeep` placeholders:

```
public/characters/coconut-baby/.gitkeep
public/characters/kiwi-baby/.gitkeep
public/characters/mango-baby/.gitkeep
public/characters/pineapple-baby/.gitkeep
public/characters/tiki/.gitkeep
public/characters/ube-baby/.gitkeep
```

**Note:** All these directories now contain real image files, so `.gitkeep` is no longer functionally necessary. However, removing them is harmless zero-risk work.  
**Recommendation:** Safe to delete in Phase Cleanup 1, but very low priority.

---

## 5. Do Not Touch

The following systems and files must not be modified in any cleanup phase without full verification:

| System | Path(s) | Why |
|---|---|---|
| All episode content JSON | `src/content/episodes/*.json` | Loaded by savedEpisodes.ts and content.ts; public stories depend on them |
| All character JSON | `src/content/characters/*.json` | Used by character pages, admin, story builder |
| All product content | `src/content/products/*.json` | Imported directly in content.ts; removing without updating imports breaks the build |
| Reference assets | `src/content/reference-assets/character-reference-assets.json` | 156 uploaded assets; used by AI generation pipeline |
| Animated stories | `src/content/animated-stories/animated-stories.json` | Powers `/stories/animated/[slug]` public viewer |
| Homepage showcase | `src/content/site/homepage-showcase.json` | Drives public homepage hero |
| Cover page | `src/content/site/cover-page.json` | Controls the cover gate |
| Shop collectables | `src/content/shop/collectables.json` | Powers the `/shop` page |
| All character images | `public/characters/*/*.png` | Used by character pages, stories, admin, story builder |
| All background images | `public/backgrounds/*.png` | Used as selectable backgrounds in story panel admin and on public pages |
| Cover effects | `public/cover-effects/` | Used by `CoverMagicEffects.tsx` in the cover page gate |
| Power profiles | `public/characters/power-profiles/` | Referenced in `characterPowerData.ts` |
| All admin routes | `src/app/admin/**` | Admin CMS — all pages are accessible and functional |
| All API routes | `src/app/api/**` | GitHub save, media upload, generation routes |
| proxy.ts | `src/proxy.ts` | Replaces Next.js middleware; required for auth on all protected routes |
| All lib helpers | `src/lib/**` | Shared business logic; highly cross-referenced |
| All public page routes | `src/app/(page.tsx, stories, characters, shop)` | Public-facing pages |

---

## 6. Large Files

No single file exceeds 5 MB. However, by category:

| Category | Total Size | Count | Note |
|---|---|---|---|
| `public/characters/` | **174 MB** | ~90 PNG files | 1.5–3.2 MB each; all active character pose images |
| `public/backgrounds/` | **62 MB** | 27 PNG files | 1.8–2.9 MB each; used as selectable scene backgrounds |
| `public/cover-effects/` | **8.6 MB** | 11 PNG files | Used by cover page gate |
| `public/brand-references/` | **448 KB** | 2 PNG files | AI reference images |

### Largest individual files

| File | Size |
|---|---|
| `public/backgrounds/trouble-island-area.png` | 2.9 MB |
| `public/backgrounds/Kiwi_Canopy_Cove_Playground.png` | 2.6 MB |
| `public/backgrounds/Kiwi_canopy_cove_marketplace.png` | 2.6 MB |
| `public/characters/tiki/Tiki Profile.png` | 3.2 MB |
| `public/characters/tiki/tiki trouble character profile .png` | 3.2 MB |
| `public/characters/dragon-fruit-baby/Dragon Fruit Character Profile_.png` | 2.1 MB |
| `src/content/episodes/sample-episode.json` | 56 KB |
| `src/content/reference-assets/character-reference-assets.json` | 136 KB |
| `build-output.log` *(committed)* | 3.7 KB |

---

## 7. Duplicate or Similar Files

### 7.1 Duplicate Tiki profile images

```
public/characters/tiki/Tiki Profile.png             (3.2 MB)
public/characters/tiki/tiki trouble character profile .png  (3.2 MB)
```

Both appear to be Tiki's character profile sheet. Identical file sizes suggest they may be duplicates. No code references found for either filename — they may be portfolio/reference assets only.  
**Recommendation:** Compare visually and remove the duplicate in Phase Cleanup 3.

### 7.2 Dragon Fruit waterfall background in character folder

```
public/characters/dragon-fruit-baby/Dragon Fruit Haven waterfall_bridge_river.png  (2.3 MB)
```

This is a background/environment image (not a character pose) stored in the dragon-fruit-baby character folder. The same scene type (Dragon Fruit Haven) already has multiple entries in `public/backgrounds/`:
```
public/backgrounds/Dragon_Fruit_Haven.png
public/backgrounds/Dragon_Fruit_Haven_House_Neighborhood.png
public/backgrounds/Dragon_Fruit_Haven_park_picknic.png
public/backgrounds/Dragon_Fruit_Haven_playground.png
```

**Recommendation:** Verify if this waterfall image is intentionally different from the backgrounds above, then either move it to `public/backgrounds/` or remove. Phase Cleanup 2.

### 7.3 Tanglevine episode versions

```
src/content/episodes/pineapple-baby-and-the-tanglevine-challenge.json   (4 KB, draft)
src/content/episodes/pineapple-baby-and-the-tanglevine-challenge-2.json  (24 KB, published)
```

The `-2` version appears to be the completed replacement for the original draft. The original draft (`-challenge.json`) may be safe to archive or remove.

---

## 8. Legacy / Developer Candidates

The following are explicitly labeled "Developer / Legacy" in the AdminNav and are active Next.js routes, but appear to serve historical/developer utility purposes rather than active production use:

| Route | File | Purpose | Still linked? |
|---|---|---|---|
| `/admin/storyboards` | `src/app/admin/storyboards/page.tsx` | Original storyboard builder (uses `StoryboardBuilder` component) | Yes — "Legacy" section of AdminNav |
| `/admin/variations` | `src/app/admin/variations/page.tsx` | Variation prompt builder for character image variants | Yes — "Legacy" section of AdminNav |
| `/admin/canon` | `src/app/admin/canon/page.tsx` | Static page displaying canon protection rules for AI generation | Yes — "Legacy" section of AdminNav |
| `/admin/media-health` | `src/app/admin/media-health/page.tsx` | Media health checker | Yes — "Legacy" section of AdminNav |

**Important:** These pages are still valid routes and are intentionally preserved (AdminNav explicitly shows them as "Developer / Legacy"). They should not be removed without the creator's decision.

### AnimationRouteTestPanel

```
src/app/admin/episodes/[slug]/AnimationRouteTestPanel.tsx
```

Referenced only by the episode `page.tsx` within the same directory. Appears to be a developer testing panel for animation route generation, embedded within the episode builder. Not a standalone page.

---

## 9. Recommended Cleanup Plan

### Phase Cleanup 1 — Zero-risk files (log, scaffold, empty markers)

Safe to do immediately. No app logic is affected.

1. Add `build-output.log` to `.gitignore`
2. Remove `build-output.log` from git tracking (`git rm --cached build-output.log`)
3. Delete `public/file.svg`, `public/globe.svg`, `public/next.svg`, `public/vercel.svg`, `public/window.svg` (default Next.js scaffold icons, never used)
4. Optionally delete the 6 `.gitkeep` files in character directories
5. Run `npm run build` → verify passing
6. Commit: `chore: remove scaffold SVGs and untrack build log`

---

### Phase Cleanup 2 — Unreferenced / misplaced assets

After confirming the files below are truly unused:

1. Delete the 6 small early-iteration pineapple-baby images:
   - `pineapple_baby_happy.png`, `pineapple_baby_sad.png`, `pineapple_baby_sleepy.png`, `pineapple_baby_sparkle_joy.png`, `pineapple_baby_classic.svg`, `pineapple_baby_surprised.svg`
2. Verify Tiki profile duplication and remove the duplicate
3. Decide what to do with `Dragon Fruit Haven waterfall_bridge_river.png` (move to backgrounds or remove)
4. Decide what to do with `mango mockup.png` (move to products or remove)
5. Run `npm run build` → verify passing
6. Commit: `chore: remove unreferenced early-iteration character images`

---

### Phase Cleanup 3 — Legacy episode and product data

**Requires code changes alongside data removal.**

1. **Remove `sample-episode.json`**: Also remove its `import` and array reference in `src/lib/content.ts` (lines 7, 188)
2. **Remove `pineapple-baby-and-the-tanglevine-challenge.json`** (the 4KB draft, not the -2 published one): No code change needed — dynamically loaded from disk
3. Evaluate `words-have-consequences-.json`: If it's an abandoned draft, remove it
4. Evaluate legacy static product JSON files (`sample-product.json`, etc.): If superseded by the CMS product system, remove imports in `content.ts` then delete files
5. Run `npm run build` → verify passing
6. Commit: `chore: remove sample content and legacy draft data`

---

### Phase Cleanup 4 — Image optimization (largest performance win)

**Does not remove files — replaces them with optimized versions.**

1. Convert all character pose PNGs to WebP (estimated 60–80% size reduction = ~100–140 MB saved)
2. Convert all background PNGs to WebP
3. Ensure all public-facing image use `next/image` (which auto-optimizes) rather than bare `<img>` tags
4. Review cover-effects PNGs for WebP conversion
5. Run `npm run build` + full visual QA of all character and story pages
6. Commit: `perf: convert character and background images to WebP`

---

## 10. Suggested Verification Checklist

After any cleanup phase, run this checklist before committing:

- [ ] `npm run build` — must pass with zero errors
- [ ] `npm run dev` — start dev server, confirm no import errors in console
- [ ] `/` — Homepage loads; hero image and character section visible
- [ ] `/characters` — All 8 characters visible with correct images
- [ ] `/characters/[slug]` — One character page loads with correct pose images
- [ ] `/stories` — "Available Storybooks" section shows published stories; "Animated Stories" section visible; Coming Soon section only shows real CMS entries
- [ ] `/stories/[slug]` — One illustrated storybook opens and reads correctly
- [ ] `/stories/animated/[slug]` — Animated story viewer loads; clips play; fullscreen works
- [ ] `/shop` — Shop page loads; collectables visible
- [ ] `/admin` — Dashboard loads; all AdminNav links accessible
- [ ] `/admin/storybooks` — Storybook list loads
- [ ] `/admin/animated-stories` — Animated stories manager loads; card image upload works
- [ ] `/admin/products` — Products page loads
- [ ] Upload test: Try uploading a card image in `/admin/animated-stories` — confirm no broken imports
- [ ] Cover page gate: Confirm cover page behavior unchanged (if enabled)

---

*Report generated 2026-06-16. This is an audit-only document. No files were deleted, moved, renamed, or modified during this audit (except creation of this report file).*
