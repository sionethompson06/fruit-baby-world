const CHECKLIST_CATEGORIES: {
  label: string;
  icon: string;
  items: string[];
}[] = [
  {
    label: "A. Story Quality",
    icon: "📖",
    items: [
      "Episode has a clear beginning, middle, and ending.",
      "Lesson or moral is clear and age-appropriate.",
      "Tone is warm, playful, and kid-friendly.",
      "Scene breakdown is easy to follow.",
    ],
  },
  {
    label: "B. Character Canon",
    icon: "🧸",
    items: [
      "Featured characters match their official personalities.",
      "Character behavior does not contradict canonical JSON.",
      "Tiki Trouble, if present, remains mischievous, funny, dramatic, and kid-friendly.",
      "No character is made scary, cruel, violent, older, realistic, or off-brand.",
    ],
  },
  {
    label: "C. Visual Prompt Safety",
    icon: "🖼️",
    items: [
      "Image prompt drafts are reference-anchored.",
      "Image prompt drafts do not redesign characters.",
      "Character colors, shapes, accessories, and identity details are protected.",
      "Official uploaded profile images and references must be used before any future visual generation.",
    ],
  },
  {
    label: "D. Animation Prompt Safety",
    icon: "🎬",
    items: [
      "Animation prompt drafts preserve official character design.",
      "Actions are kid-friendly and emotionally safe.",
      "No scary, violent, or intense animation direction is included.",
    ],
  },
  {
    label: "E. Publishing Readiness",
    icon: "✓",
    items: [
      "Review notes have been checked.",
      "Generated content has been reviewed by a human.",
      "Episode is not published automatically.",
      "Future publish action should only happen after final approval.",
    ],
  },
];

function ChecklistRow({ item }: { item: string }) {
  return (
    <li className="flex items-start gap-3 text-sm text-tiki-brown/70 leading-relaxed">
      {/* Static hollow square — visual indicator only, not interactive */}
      <span className="flex-shrink-0 mt-0.5 w-4 h-4 rounded border-2 border-tiki-brown/25 bg-tiki-brown/3 inline-block" />
      {item}
    </li>
  );
}

export default function PublishReadinessChecklist() {
  return (
    <div className="bg-white rounded-3xl border border-tiki-brown/10 shadow-sm p-6 flex flex-col gap-6">
      <div>
        <h2 className="text-base font-black text-tiki-brown mb-2">
          Publish Readiness Checklist
        </h2>
        <div className="flex items-start gap-2.5 bg-pineapple-yellow/15 border border-pineapple-yellow/40 rounded-xl px-4 py-3">
          <span className="text-base flex-shrink-0">📋</span>
          <p className="text-sm text-tiki-brown/65 leading-relaxed">
            Review each item before using the Publish-Ready Action below. The
            checklist is for human review only — it does not automatically
            enforce any conditions.
          </p>
        </div>
      </div>

      {CHECKLIST_CATEGORIES.map((cat) => (
        <div key={cat.label}>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-base">{cat.icon}</span>
            <h3 className="text-sm font-bold text-tiki-brown">{cat.label}</h3>
          </div>
          <ul className="space-y-2.5 pl-1">
            {cat.items.map((item) => (
              <ChecklistRow key={item} item={item} />
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
