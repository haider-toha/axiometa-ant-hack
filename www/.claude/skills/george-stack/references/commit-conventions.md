# Commit conventions

Projects built with the stack use [Conventional Commits](https://www.conventionalcommits.org): `type(scope): subject`, imperative subject, lower-case start, under ~70 characters. Follow the house writing conventions in the body – British English, spaced en-dashes, no ampersands or emojis. (This repo – design-studio itself – is the exception: its own history stays sentence-case imperative with no type prefix. The convention below is for the apps.)

Standard types carry their usual meaning: `feat`, `fix`, `refactor`, `perf`, `style`, `docs`, `test`, `build`, `ci`, `chore`.

## The two house extensions

- **`ui:`** – a change to *what the interface is*: a new control, a restructured layout, changed content or a reworked flow. Structural surface change.
- **`finesse:`** – a deliberate improvement to *how well existing UI is executed*, where nothing was broken. The craft pass: spacing rhythm, motion easing, hierarchy, optical alignment, micro-interactions.

## Telling them apart

Each prefix lives on its own axis, which is why they do not overlap:

| Prefix | What it changes |
| --- | --- |
| `ui` | what's there – the interface's structure or content |
| `finesse` | how good what's there is – the quality of an existing surface |
| `style` | the code's formatting, invisible to users |
| `fix` | something that was broken or wrong |

**Litmus for `finesse:` vs `fix:`** – would a user have filed a bug about the before-state? If no (it worked, you refined it anyway), it is `finesse:`. If yes (misaligned, overflowing, off-spec, broken), it is `fix:`. That "nothing was broken" clause is the whole point: `finesse:` marks quality-increasing iteration as craft, not correctness.

**`finesse:` vs `ui:`** – if the element or flow is new or restructured, use `ui:`. If it already existed and you made it better without changing what it is, use `finesse:`.

## Examples

```
finesse(toolbar): align icons optically and snap spacing to the 4px grid
finesse(modal): ease-out the enter at 180ms so it settles instead of snapping
finesse(list): raise rest and hover contrast, quieten the dividers
finesse(headings): drop to 500 weight for a calmer hierarchy
```

Not `finesse:`:

```
fix(modal): stop the dialog rendering behind its overlay   # it was broken
ui(nav): add a command palette                             # new surface
style: reformat with prettier                              # code only, no visual change
```

Reviewers should read a `finesse:` commit as taste iteration – judge the design call, not the logic – and it keeps deliberate polish legible in history instead of hiding inside `fix:` or a catch-all `ui:`.
