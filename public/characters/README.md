# Character Assets

Official artwork for each Fruit Baby World character lives here.

## Folder Structure

Each character has its own folder named by slug:

```
public/characters/
  pineapple-baby/
    main.png          ← Primary character artwork (used in cards + hero)
    profile-sheet.png ← Full official profile sheet
  ube-baby/
    main.png
    profile-sheet.png
  mango-baby/
    main.png
    profile-sheet.png
  kiwi-baby/
    main.png
    profile-sheet.png
  coconut-baby/
    main.png
    profile-sheet.png
  tiki/
    main.png
    profile-sheet.png
```

## Notes

- Files are referenced in each character's JSON under `image.main` and `image.profileSheet`
- When files are missing, the UI falls back to emoji + brand color placeholders
- Recommended format: PNG with transparency, minimum 800×800px for `main`, 1200×1600px for `profile-sheet`
