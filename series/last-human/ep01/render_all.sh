#!/bin/bash
# Render every shot of the episode (skips shots already rendered unless FORCE=1).
cd "$(dirname "$0")"
for s in s01_aerial s02_door s03_cars s04_walk s05_power s06_blackout s07_rooftop s08_light; do
  out=../../../build/last-human/ep01/shots/$s.mp4
  if [ -f "$out" ] && [ -z "$FORCE" ]; then echo "skip $s"; continue; fi
  t=$(date +%s); python3 shots.py $s > /tmp/render_$s.log 2>&1 && echo "done $s $(( $(date +%s)-t ))s" || { echo "FAIL $s"; grep -v EGL /tmp/render_$s.log | tail -5; }
done
