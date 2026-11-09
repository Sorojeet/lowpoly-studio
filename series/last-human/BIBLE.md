# LAST HUMAN — series bible

**Logline:** One morning, every other person on Earth is simply gone. Each ~60 s episode
follows Kai through what really happens to a world without us — and ends on a cliffhanger.

**Format:** vertical 9:16, 1080×1920, 30 fps, 60–80 s. Low-poly 3D (three.js).
Narrator only: Kokoro **Michael** (`am_michael`, speed 0.93). Burnt-in pop captions.
Every episode = a real "what if" fact (power, water, animals, cities decaying) + one mystery beat.

## Characters
| Name | Look (asset) | Notes |
|---|---|---|
| **Kai** | `new Survivor("Kai")` — orange hoodie `#e8743b`, jeans, teal delivery backpack | 20s, delivery rider, the last human… maybe |
| **The Light** | unknown | Someone switched on a light in the LIGHT_TOWER at the end of Ep 1 |

## The city (fixed, seed 7)
- `new City({ seed: 7, n: 6 })` — 13×13 blocks, 50 m pitch, roads at `City.road(k)`.
- `HOME = [0,0,0]` Kai's 38-floor tower, door on the south face, teal awning.
- `LIGHT_TOWER = [-1,-4,3]` 44 floors, ~180 m south-west of HOME. **Never change these** — continuity.
- Power plant north of the city at (60, 470).

## Episode arc
| Ep | Title | What-if beat | Cliffhanger |
|---|---|---|---|
| 1 | Day 1 ✅ | Everyone vanishes; grid fails within hours | A single light switches on across the city |
| 2 | The Light | Kai crosses the dark city; backup generators & batteries | The room is empty — but a radio is on, broadcasting |
| 3 | Hour 72 | Water pressure dies, fridges rot, pets & zoo animals get out | Something big is walking down the avenue |
| 4 | Week 2 | Animals reclaim streets; fires with no firefighters | The radio repeats coordinates |
| 5 | Month 1 | Nature cracks roads, rain floods subways | Kai finds fresh footprints |
| 6 | Year 1 | Cities turn green; satellites fall | Kai meets **the other** |

## Style rules
- Kai is always the warmest colour in frame (orange). Night = blue/indigo, warm windows.
- Hook in the first 2 seconds (big what-if question), caption every line, end card "EPISODE N+1".
- Shots 5–10 s, hard cuts, one camera move per shot.
