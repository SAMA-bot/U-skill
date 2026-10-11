# Architecture rules

- Charts and quantitative visualizations use global semantic `chart-*` CSS tokens, with shared Recharts axis/legend/tooltip defaults; this keeps every role view readable when themes change without changing data or scoring rules.
- All application colors use global semantic tokens; brand fills and readable brand inks are separate so light/dark themes retain contrast.
- Generated thumbnails resolve global color tokens into SVG values and render through ThemedThumbnail so theme changes refresh images without replacing uploaded covers.
