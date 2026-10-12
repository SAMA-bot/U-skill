# Architecture rules

- Charts and quantitative visualizations use global semantic `chart-*` CSS tokens, with shared Recharts axis/legend/tooltip defaults; this keeps every role view readable when themes change without changing data or scoring rules.
- All application colors use global semantic tokens; brand fills and readable brand inks are separate so light/dark themes retain contrast.
- Generated thumbnails resolve global color tokens into SVG values and render through ThemedThumbnail so theme changes refresh images without replacing uploaded covers.
- Lesson progress is written only via the `start_lesson`/`complete_lesson` database functions and course enrollment changes only via the `course-actions` function; clients never send XP, status timestamps or progress, so rewards can't be forged.
- Active-role preference is stored per user (`active_role:<userId>`) and always validated against server roles; role lookup failures show an error state instead of defaulting to faculty.
