# Agent Rules

<RULE>
When asked to restore or refer to an "old version", do not guess. If there is ambiguity (e.g. multiple distinct historical versions exist), explicitly ask the user for clarification before proceeding.
</RULE>

<RULE>
When adding wrappers to components that use Tailwind CSS `group-hover` utilities, always use named groups (e.g. `group/wrapper` and `group-hover/wrapper`) to prevent the parent from accidentally triggering hover states on all children simultaneously.
</RULE>

<RULE>
Always invoke the `browser` subagent (the /browser command) to visually verify your changes before making a commit. If testing an `/admin` page, check `CLAUDE.md` for the correct credentials before testing.
</RULE>
