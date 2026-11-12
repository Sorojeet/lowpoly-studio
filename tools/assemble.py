"""Episode assembly: concat shots (stream copy), burn captions/titles (ASS), mux audio.

    from tools.assemble import concat, captions_ass, finish
"""
import os, re, subprocess

W, H = 1080, 1920
FONTS = os.path.join(os.path.dirname(__file__), "..", "assets", "fonts")


def run(cmd):
    subprocess.run(cmd, check=True)


def concat(shot_files, out):
    lst = out + ".txt"
    with open(lst, "w") as f:
        for s in shot_files:
            f.write(f"file '{os.path.abspath(s)}'\n")
    part = out[:-4] + ".part.mp4"
    run(["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", lst, "-c", "copy", part])
    os.replace(part, out)
    return out


def _ts(s):
    s = max(0, s)
    return f"{int(s // 3600)}:{int(s % 3600 // 60):02d}:{s % 60:05.2f}"


def chunks(line, max_words=3):
    words = re.sub(r"\.\.\.", "… ", line).split()
    out, cur = [], []
    for w in words:
        cur.append(w)
        if len(cur) >= max_words or re.search(r"[.?!,…]$", w):
            out.append(" ".join(cur)); cur = []
    if cur:
        out.append(" ".join(cur))
    return out


def captions_ass(events, out, badge="", end_card=None, total=None, accent="&H003B74E8&", labels=None):
    """events: [(start_sec, voice_sec, line)] -> ASS with word-group pop captions.
    accent is ASS BGR colour (default = Kai's orange).
    labels: [(start_sec, end_sec, text)] big time-stamps under the badge, e.g. "+ 1 WEEK"."""
    head = f"""[Script Info]
ScriptType: v4.00+
PlayResX: {W}
PlayResY: {H}
WrapStyle: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Cap,Poppins,86,&H00FFFFFF,&H00FFFFFF,&H00101010,&H80000000,1,0,0,0,100,100,0,0,1,7,3,5,60,60,0,1
Style: Badge,Poppins,44,&H00FFFFFF,&H00FFFFFF,&H00101010,&H90000000,1,0,0,0,100,100,4,0,1,3,0,8,40,40,150,1
Style: End,Poppins,120,&H00FFFFFF,&H00FFFFFF,&H00101010,&H80000000,1,0,0,0,100,100,8,0,1,8,4,5,40,40,0,1
Style: EndSub,Poppins,50,&H00FFFFFF,&H00FFFFFF,&H00101010,&H80000000,1,0,0,0,100,100,0,0,1,4,2,5,60,60,0,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    rows = []
    for start, dur, line in events:
        cs = chunks(line)
        weights = [len(c) + 4 for c in cs]
        tot = sum(weights); t = start
        for c, w in zip(cs, weights):
            d = dur * w / tot
            txt = c.upper().replace("…", "...")
            pop = r"{\fscx80\fscy80\t(0,90,\fscx106\fscy106)\t(90,160,\fscx100\fscy100)}"
            rows.append(f"Dialogue: 1,{_ts(t)},{_ts(t + d)},Cap,,0,0,0,,{{\\pos({W // 2},1430)}}{pop}{txt}")
            t += d
    if badge and total:
        rows.append(f"Dialogue: 0,{_ts(0)},{_ts(total)},Badge,,0,0,0,,{{\\fad(400,400)}}{badge}")
    if end_card and total:
        s = total - end_card.get("secs", 2.6)
        rows.append(f"Dialogue: 2,{_ts(s)},{_ts(total)},End,,0,0,0,,{{\\pos({W // 2},820)\\fad(300,0)\\c{accent}}}{end_card['top']}")
        rows.append(f"Dialogue: 2,{_ts(s + 0.35)},{_ts(total)},EndSub,,0,0,0,,{{\\pos({W // 2},960)\\fad(300,0)}}{end_card['bottom']}")
    for start, end, text in labels or []:
        pop = r"{\fscx70\fscy70\t(0,120,\fscx108\fscy108)\t(120,200,\fscx100\fscy100)}"
        rows.append(f"Dialogue: 1,{_ts(start)},{_ts(end)},End,,0,0,0,,{{\\pos({W // 2},330)\\fs84\\fad(0,250)\\c{accent}}}{pop}{text}")
    with open(out, "w") as f:
        f.write(head + "\n".join(rows) + "\n")
    return out


def finish(video, audio_wav, out, ass=None, fade_in=0.4, fade_out=0.0, total=None):
    vf = []
    if ass:
        vf.append(f"ass={ass}:fontsdir={FONTS}")
    if fade_in:
        vf.append(f"fade=t=in:st=0:d={fade_in}")
    if fade_out and total:
        vf.append(f"fade=t=out:st={total - fade_out}:d={fade_out}")
    part = out[:-4] + ".part.mp4"
    cmd = ["ffmpeg", "-y", "-loglevel", "error", "-i", video, "-i", audio_wav, "-map", "0:v", "-map", "1:a"]
    if vf:
        cmd += ["-vf", ",".join(vf), "-c:v", "libx264", "-preset", "veryfast", "-crf", "18", "-pix_fmt", "yuv420p"]
    else:
        cmd += ["-c:v", "copy"]
    cmd += ["-af", "loudnorm=I=-14:TP=-1.5:LRA=11", "-ar", "48000", "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", part]
    run(cmd)
    os.replace(part, out)
    return out
