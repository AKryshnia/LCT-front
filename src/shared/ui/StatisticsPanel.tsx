// src/shared/ui/StatisticsPanel.tsx
import React from 'react';

/**
 * Defines a single section within the statistics panel
 */
export interface PanelSection {
  /** Unique identifier for the section */
  id: string;
  /** React node to render for this section */
  content: React.ReactNode;
  /** Optional CSS classes for the section wrapper */
  className?: string;
  /** Whether to show this section (default: true) */
  visible?: boolean;
  /** Order priority for sorting sections (lower numbers appear first) */
  order?: number;
}

export interface StatisticsPanelProps {
  /** Array of sections to display in the panel */
  sections: PanelSection[];
  /** Optional CSS classes for the panel container */
  className?: string;
  /** Optional CSS classes for the spacing between sections */
  sectionSpacing?: string;
}

/**
 * StatisticsPanel - A flexible sidebar component for displaying various statistics and widgets
 * 
 * This component provides a reusable container for displaying different types of content
 * in a consistent layout. Each page can customize what sections to show and in what order.
 * 
 * @example
 * ```tsx
 * <StatisticsPanel
 *   sections={[
 *     { id: 'filters', content: <FilterComponent />, order: 1 },
 *     { id: 'kpi', content: <KpiTiles />, order: 2 },
 *     { id: 'chart', content: <ChartWidget />, order: 3 }
 *   ]}
 * />
 * ```
 */
export default function StatisticsPanel({
  sections,
  className = 'col-span-12 xl:col-span-4',
  sectionSpacing = 'space-y-4',
}: StatisticsPanelProps) {
  // Filter out hidden sections and sort by order
  const visibleSections = React.useMemo(() => {
    return sections
      .filter((section) => section.visible !== false)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [sections]);

  return (
    <aside className={`${className} ${sectionSpacing}`}>
      {visibleSections.map((section) => (
        <div key={section.id} className={section.className}>
          {section.content}
        </div>
      ))}
    </aside>
  );
}

/**
 * Hook to help build panel sections with consistent patterns
 */
export function usePanelSections() {
  const [sections, setSections] = React.useState<PanelSection[]>([]);

  const addSection = React.useCallback((section: PanelSection) => {
    setSections((prev) => [...prev, section]);
  }, []);

  const removeSection = React.useCallback((id: string) => {
    setSections((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const updateSection = React.useCallback((id: string, updates: Partial<PanelSection>) => {
    setSections((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...updates } : s))
    );
  }, []);

  const toggleSection = React.useCallback((id: string) => {
    setSections((prev) =>
      prev.map((s) => (s.id === id ? { ...s, visible: !s.visible } : s))
    );
  }, []);

  return {
    sections,
    setSections,
    addSection,
    removeSection,
    updateSection,
    toggleSection,
  };
}
