# Official Character Assets

This folder contains official artwork for each Fruit Baby World character.

## Folder Structure

Each character has its own folder named by slug:

```
public/characters/
  pineapple-baby/
    profile-sheet.png   ← Official full character profile sheet (REQUIRED)
    main.png            ← Approved isolated character artwork only (optional)
  ube-baby/
    profile-sheet.png
    main.png
  mango-baby/
    profile-sheet.png
    main.png
  kiwi-baby/
    profile-sheet.png
    main.png
  coconut-baby/
    profile-sheet.png
    main.png
  tiki/
    profile-sheet.png
    main.png
```

## Official File Rules

### profile-sheet.png
- The full official character profile document.
- Used on character detail pages (`/characters/[slug]`).
- Displayed at natural proportions — never cropped, never distorted.
- **Must be the official uploaded character profile sheet exactly as provided.**

### main.png
- An approved isolated character artwork image.
- Used on the character gallery cards (`/characters`).
- **Only set `image.main` in the character JSON if this file exists and is an approved official isolated character image.**
- If this file does not exist, leave `image.main` as `""` in the JSON. The gallery will show a polished placeholder automatically.
- **Do not crop profile-sheet.png to create main.png.** Only use an approved separately supplied isolated character image.

## Character Identity Rules

These characters are official trademarked brand characters. All images in this folder must preserve the official character identity exactly.

**Allowed:**
- Official artwork supplied by the brand owner
- Future approved scene/pose/expression artwork that is reference-anchored to official designs
- New compositions that match the official character's design language exactly

**Not allowed:**
- AI-generated images that redesign or reinterpret the character
- Generic fruit icons or mascots
- Modified, recolored, or altered versions of official artwork
- Cropped profile sheets used as standalone character images
- Any image that changes body shape, face, colors, accessories, or core visual identity

## What must be preserved for each character

| Character | Key Visual Identity |
|---|---|
| Pineapple Baby | Sunshine yellow/golden body, green leafy crown, warm friendly face, rounded baby-like body |
| Ube Baby | Purple/lavender ube body, dreamy gentle expression, soft magical cozy feeling |
| Kiwi Baby | Fuzzy kiwi-brown body, green kiwi top, leaf crown, white kiwi blossom accent |
| Coconut Baby | Warm coconut-brown/cream body, calm comforting expression, dependable nurturing feel |
| Mango Baby | Mango yellow/orange body, playful joyful expression, tropical green leaf accents |
| Tiki Trouble | Carved wooden tiki face, leafy green crown, fire/torch accents, skull necklace, mischievous kid-friendly tone |

## Future AI Generation Rule

If AI is used to generate new poses, scenes, or story artwork, all output must be:
- Reference-anchored to the official uploaded character images
- Exact or very close to the official character identity
- Reviewed and approved before being placed in this folder

AI may not redesign, recolor, reshape, or reinterpret any character beyond what matches the official references.
