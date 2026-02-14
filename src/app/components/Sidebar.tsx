"use client";

type SectionId = "dashboard" | "outputs" | "activity" | "calendar" | "shared";

type Section = {
  id: SectionId;
  label: string;
};

type SidebarProps = {
  sections: Section[];
  activeSection: SectionId;
  onSelectSection: (id: SectionId) => void;
};

export default function Sidebar({
  sections,
  activeSection,
  onSelectSection,
}: SidebarProps) {
  return (
    <aside className="w-full shrink-0 border-b border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950 md:w-[200px] md:border-b-0 md:border-r">
      <div className="space-y-4 md:space-y-6">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Mission Control
          </p>
          <h1 className="mt-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
            Dashboard
          </h1>
        </div>

        <nav className="flex gap-2 overflow-x-auto pb-1 md:block md:space-y-1 md:overflow-visible md:pb-0">
          {sections.map((section) => {
            const isActive = section.id === activeSection;
            return (
              <button
                key={section.id}
                type="button"
                onClick={() => onSelectSection(section.id)}
                className={`flex shrink-0 items-center rounded-lg px-3 py-2 text-left text-sm transition-all duration-200 md:w-full ${
                  isActive
                    ? "bg-blue-50 text-blue-700 dark:bg-blue-500/20 dark:text-blue-200"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                }`}
                aria-current={isActive ? "page" : undefined}
              >
                {section.label}
              </button>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
