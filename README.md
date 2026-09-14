# Debate Timer (Web)

A browser port of [Michaelihc/debate-timer](https://github.com/Michaelihc/debate-timer), the Unity debate timer with current/next speaker indicators, a double timer for free debate, and a clickable timeline.

No build step and no dependencies. Plain HTML, CSS, and JavaScript.

## Run

Open `index.html` directly in a browser, or serve the folder:

```
npx serve .
# or
python -m http.server 8000
```

Then open `http://localhost:8000`.

## Features

- Visualized debate layout with numbered pro and con speakers in custom colors
- Current speaker (speech bubble) and next speaker (arrow, flashes when time runs out) indicators
- Ring timer for preparation and speeches, with a warning color, warning sound, red flash, and end bell
- Double bar timer for free debate with an Invert button to hand time between sides
- Clickable timeline to jump to any event
- English and Simplified Chinese UI, switchable from the menu
- Save file editor (Menu) with Save / Discard / Reset, plus Download and Upload of the JSON

The save file is stored in the browser's `localStorage`. After editing it in the menu, press **Reload Scene** to apply it, exactly like the original.

## Keyboard

| Key | Action |
| --- | --- |
| Space | Pause / resume the active timer |
| Right arrow or N | Next event |
| I | Invert (free debate only) |
| Esc | Close the menu or end screen |

## Save file format

Same as the original. `language` accepts `"en"`, `"zh"`, or the original numeric values (`0` = Chinese, `1` = English).

```json
{
  "settings": {
    "pro_colors": "#0000FF",
    "con_colors": "#FF0000",
    "time_warning": 30,
    "time_prep": 300,
    "time_free": 500,
    "display_minutes": true,
    "language": "en"
  },
  "title": "New Debate Title",
  "pro_side": [
    { "name": "Team 1 A", "time": 240 },
    { "name": "Team 1 B", "time": 180 },
    { "name": "Team 1 C", "time": 180 },
    { "name": "Team 1 D", "time": 300 }
  ],
  "con_side": [
    { "name": "Team 2 A", "time": 240 },
    { "name": "Team 2 B", "time": 180 },
    { "name": "Team 2 C", "time": 180 },
    { "name": "Team 2 D", "time": 300 }
  ],
  "event_order": ["prep", 1, -1, 2, -2, 3, -3, 4, -4, "prep", "free"]
}
```

`event_order` entries: `"prep"` for preparation time, `"free"` for free debate, a positive number for a pro speaker, and a negative number for a con speaker.

## Files

- `index.html`, `styles.css`, `app.js`: the app
- `assets/icons/`: icons from the original project
- `assets/audio/`: warning and end sounds from the original project
