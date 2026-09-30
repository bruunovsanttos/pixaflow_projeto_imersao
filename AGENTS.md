<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Project rules

- All UI data comes from `src/lib/mock-data.ts`, which mirrors the future Python/FastAPI endpoints — swap function bodies for HTTP calls when the backend exists, keeping the exported types.
- Shared Nexora UI lives in `src/components/nexora/` (AppShell, primitives, cards); route files stay thin so pages compose the same product language.
