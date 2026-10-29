# Voice clips: "Hear Adam say your company's name"

The page shows a "🔊 Hear Adam say …" chip next to "Save card" only when a clip exists here.
No clip, no button: the feature hides itself.

## Lookup order

For a visitor on `https://adambacch.us/?c=Acme Corp`:

1. `media/voice/<slug>.mp3`, where `<slug>` is the `?c=` value lowercased, accents stripped,
   `&` turned into `and`, and every run of other characters replaced by `-`:
   - `?c=Acme` → `acme.mp3`
   - `?c=Acme Corp` → `acme-corp.mp3`
   - `?c=AT&T` → `at-and-t.mp3`
   - `?c=Nestlé` → `nestle.mp3`
   The chip reads: 🔊 Hear Adam say "Acme Corp".
2. Otherwise, `media/voice/generic.mp3`. The chip reads: 🔊 Hear Adam say hello.
3. Otherwise the chip stays hidden.

The page checks with a `HEAD` request and expects an `audio/*` (or `application/octet-stream`) content type.
On hosts that answer every missing path with an HTML page and a 200, the check fails and nothing shows,
which is the safe outcome.

## Recording guidelines

- MP3, mono, 64 to 96 kbps, under 5 seconds, roughly 30 to 60 KB each.
- Suggested script: "Hi, Acme. I'm Adam Bacchus. Let's ship something." For `generic.mp3`: "Hi, I'm Adam Bacchus. Let's ship something."
- Keep the voice Adam's own (recorded or cloned with his consent). No paid API calls are made by the page;
  clips are plain static files.
- Make one clip per company you send the link to; the slug must match the `?c=` you put in that link.
