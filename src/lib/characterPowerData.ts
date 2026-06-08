export type CharacterPowerData = {
  powerName: string;
  powerDescription: string;
  powerProfileImage: string;
};

// Note: pineapple-baby asset has a filename typo (double-r) — matched exactly.
// dragonfruit-baby (JSON slug) and dragon-fruit-baby are both mapped to the same power entry.
// tiki and tiki-trouble both resolve to the same Tiki Trouble entry.
const POWER_DATA: Record<string, CharacterPowerData> = {
  "pineapple-baby": {
    powerName: "Diamond Light™",
    powerDescription:
      "Gathers every friend's gift together and opens the crystal around the Heart of Sunshine.",
    powerProfileImage:
      "/characters/power-profiles/pineapple-baby-power-prrofile.png",
  },
  "kiwi-baby": {
    powerName: "True Sight™",
    powerDescription: "Reveals hidden clues and makes the secret path visible again.",
    powerProfileImage: "/characters/power-profiles/kiwi-baby-power-profile.png",
  },
  "coconut-baby": {
    powerName: "Shell Shield™",
    powerDescription: "Creates a protective bubble that helps the friends cross safely.",
    powerProfileImage: "/characters/power-profiles/coconut-baby-power-profile.png",
  },
  "mango-baby": {
    powerName: "Joy Spark™",
    powerDescription:
      "Sends golden-orange musical light into the air, lifting everyone's hope and energy.",
    powerProfileImage: "/characters/power-profiles/mango-baby-power-profile.png",
  },
  "ube-baby": {
    powerName: "Dream Glow™",
    powerDescription:
      "Clears worry and confusion with lavender dream-light, stars, and calm.",
    powerProfileImage: "/characters/power-profiles/ube-baby-power-profile.png",
  },
  "strawberry-baby": {
    powerName: "Heart Bloom™",
    powerDescription:
      "Uses kindness and care to soften thorns, open flowers, and clear the garden path.",
    powerProfileImage: "/characters/power-profiles/strawberry-baby-power-profile.png",
  },
  "dragonfruit-baby": {
    powerName: "Brave Flame™",
    powerDescription:
      "Lights the dark tunnel with courage so the group can move forward.",
    powerProfileImage: "/characters/power-profiles/dragon-fruit-baby-power-profile.png",
  },
  "dragon-fruit-baby": {
    powerName: "Brave Flame™",
    powerDescription:
      "Lights the dark tunnel with courage so the group can move forward.",
    powerProfileImage: "/characters/power-profiles/dragon-fruit-baby-power-profile.png",
  },
  tiki: {
    powerName: "Trouble Trick™",
    powerDescription:
      "First creates confusing false paths, but later helps by untangling the final tricky locks.",
    powerProfileImage: "/characters/power-profiles/tiki-trouble-power-profile.png",
  },
  "tiki-trouble": {
    powerName: "Trouble Trick™",
    powerDescription:
      "First creates confusing false paths, but later helps by untangling the final tricky locks.",
    powerProfileImage: "/characters/power-profiles/tiki-trouble-power-profile.png",
  },
};

export function getCharacterPowerData(slug: string): CharacterPowerData | null {
  return POWER_DATA[slug] ?? null;
}
