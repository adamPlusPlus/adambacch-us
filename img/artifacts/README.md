# Comic panel artifacts

Each panel of the career comic (§03) has an artifact slot: a small taped-on photo in the panel's corner.
A slot stays hidden until its file exists **and** is listed in `manifest.json`, so the page never requests
missing images.

| Panel | File (put it in this folder) | Suggested content |
|---|---|---|
| 1 · Shuffleware | `shuffleware-app-icons.png` | App Store icons of Gates, Deal!, Spider Solitaire and Pyramid |
| 2 · E3 and the exit | `e3-booth-photo.jpg` | A photo from E3 |
| 3 · Avabyte | `avabyte-app-screenshots.png` | Screenshots of Avabyte apps |
| 4 · Browsea | `browsea-chart.png` | The browsea.surf chart, or a product shot |
| 5 · The PMP | `pmp-certificate.png` | The PMP certificate (crop out the certification number if you prefer) |
| 6 · You meet Adam | `adam-handshake.jpg` | A friendly photo of Adam |
| 7 · Finale | `finale.png` | Anything celebratory |

To turn a slot on, add the file and list its name:

```json
{
  "files": ["shuffleware-app-icons.png", "pmp-certificate.png"]
}
```

Keep each image small (about 600 px wide, under 120 KB). The page shows it at roughly a third of the panel's width.
