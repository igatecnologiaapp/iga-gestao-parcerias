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

- Keep Vite pinned to the validated 7.x line because Vite 8/Rolldown breaks the hosted TanStack Start SSR preview despite successful local builds.

- Keep the auto-generated `.env` versioned (it holds only public Cloud URL/publishable key); ignoring it makes hosted builds ship without backend config and blank-screen. Real secrets live in the secret store, never in `.env`.

- Navigation groups reuse existing routes and detail tabs; menu permissions use the same active company as page queries, while existing server authorization and RLS remain authoritative.
