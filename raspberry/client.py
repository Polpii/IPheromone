#!/usr/bin/env python3
"""
Raspberry Pi Tamagotchi Display Client
======================================
Renders the same pixel-art tamagotchi from the web app onto the
Seeed Studio 104990802 (ST7789 240x280) SPI screen.

Polls the Next.js server for state and updates the display.

Usage:
    python3 client.py --server http://192.168.1.XX:3000 --user elisa

Dependencies (install on Pi):
    pip3 install adafruit-circuitpython-rgb-display Pillow requests
"""

import time
import math
import argparse
import sys
import threading

import board
import digitalio
from PIL import Image, ImageDraw
import adafruit_rgb_display.st7789 as st7789

try:
    import requests
except ImportError:
    print("Install requests: pip3 install requests")
    sys.exit(1)

# ---------- Screen setup ----------
SCREEN_W, SCREEN_H = 240, 280

spi = board.SPI()
cs_pin = None
dc_pin = digitalio.DigitalInOut(board.D24)
rst_pin = digitalio.DigitalInOut(board.D25)

disp = st7789.ST7789(
    spi,
    cs=cs_pin,
    dc=dc_pin,
    rst=rst_pin,
    baudrate=62500000,  # Max SPI speed for smoother display
    width=SCREEN_W,
    height=SCREEN_H,
    rotation=0,
)

# ---------- Tamagotchi data (mirrored from Tamagotchi.tsx) ----------

SHAPES = [
    # 0 — Classic
    [
        "      GG      ",
        "      gg      ",
        "    CCCCCC    ",
        "   CCCCCCCC   ",
        "  CCCCCCCCCC  ",
        "  WWWcCCcWWW  ",
        "  WKKcCCcKKW  ",
        "  WWWcCCcWWW  ",
        " ACPCCCCCPCA  ",
        " ACCCCMMCCCA  ",
        "  CCCCCCCCCC  ",
        "  CChCCCChCC  ",
        "   CCCCCCCC   ",
        "    CCCCCC    ",
        "     CCCC     ",
        "              ",
        "   DD    DD   ",
    ],
    # 1 — Cat
    [
        " GG        GG ",
        "  CG      GC  ",
        "   CCCCCCCC   ",
        "  CCCCCCCCCC  ",
        "  CCCCCCCCCC  ",
        "  WWWcCCcWWW  ",
        "  WKKcCCcKKW  ",
        "  WWWcCCcWWW  ",
        "  CCPCCCCCPC  ",
        "  CCCCMMCCCC  ",
        "  CCCCCCCCCC  ",
        "   CChCChCC   ",
        "    CCCCCC    ",
        "     CCCC     ",
        "              ",
        "   DD    DD   ",
        "              ",
    ],
    # 2 — Ghost
    [
        "              ",
        "    CCCCCC    ",
        "   CCCCCCCC   ",
        "  CCCCCCCCCC  ",
        "  CCCCCCCCCC  ",
        "  WWWcCCcWWW  ",
        "  WKKcCCcKKW  ",
        "  WWWcCCcWWW  ",
        "  CCCCCCCCCC  ",
        "  CCCCMMCCCC  ",
        "  CCCCCCCCCC  ",
        "  CCCCCCCCCC  ",
        "  CCCCCCCCCC  ",
        "  CChCCCChCC  ",
        " CC CC  CC CC ",
        "  C  C  C  C  ",
        "              ",
    ],
    # 3 — Robot
    [
        "     GGGG     ",
        "      gg      ",
        "  CCCCCCCCCC  ",
        "  CCCCCCCCCC  ",
        "  CCCCCCCCCC  ",
        "  CWWWccWWWC  ",
        "  CWKKccKKWC  ",
        "  CWWWccWWWC  ",
        "  CCCCCCCCCC  ",
        "  CCCCMMCCCC  ",
        " ACCCCCCCCCA  ",
        " ACCCCCCCCCA  ",
        "  CChCCCChCC  ",
        "  CCCCCCCCCC  ",
        "  CCCCCCCCCC  ",
        "  DDDD  DDDD  ",
        "              ",
    ],
    # 4 — Bear
    [
        "  CC      CC  ",
        " CCCC    CCCC ",
        "  CCCCCCCCCC  ",
        "  CCCCCCCCCC  ",
        "  CCCCCCCCCC  ",
        "  WWWcCCcWWW  ",
        "  WKKcCCcKKW  ",
        "  WWWcCCcWWW  ",
        "  CCPCCCCCPC  ",
        "   CCCMMCCC   ",
        "  CCCCCCCCCC  ",
        "  CChCCCChCC  ",
        "   CCCCCCCC   ",
        "    CCCCCC    ",
        "     CCCC     ",
        "   DD    DD   ",
        "              ",
    ],
    # 5 — Bunny
    [
        "   CC    CC   ",
        "   CC    CC   ",
        "   CC    CC   ",
        "   CCCCCCCC   ",
        "  CCCCCCCCCC  ",
        "  WWWcCCcWWW  ",
        "  WKKcCCcKKW  ",
        "  WWWcCCcWWW  ",
        "  PPCCCCCCPP  ",
        "   CCCMMCCC   ",
        "  CCCCCCCCCC  ",
        "  CChCCCChCC  ",
        "   CCCCCCCC   ",
        "    CCCCCC    ",
        "     CCCC     ",
        "   DD    DD   ",
        "              ",
    ],
    # 6 — Alien
    [
        "      GG      ",
        "   GGGGGGGG   ",
        "  GGGGGGGGGG  ",
        " CCCCCCCCCCCC ",
        " CCCCCCCCCCCC ",
        " CWWWcCCcWWWC ",
        " CWKKcCCcKKWC ",
        " CWWWcCCcWWWC ",
        "  CCCCCCCCCC  ",
        "  CCCCMMCCCC  ",
        "   CCCCCCCC   ",
        "    CCCCCC    ",
        "    CChChC    ",
        "     CCCC     ",
        "      CC      ",
        "    DD  DD    ",
        "              ",
    ],
    # 7 — Penguin
    [
        "              ",
        "    CCCCCC    ",
        "   CCCCCCCC   ",
        "  CCCCCCCCCC  ",
        "  CCCCCCCCCC  ",
        "  WWWcCCcWWW  ",
        "  WKKcCCcKKW  ",
        "  WWWcCCcWWW  ",
        "AACCCCCCCCAA  ",
        "AACCCCMMCCAA  ",
        " AChCCCCChCA  ",
        " AChCCCCChCA  ",
        "  ChhCCChhC   ",
        "   CCCCCCCC   ",
        "    CCCCCC    ",
        "   DDD  DDD   ",
        "              ",
    ],
    # 8 — Mushroom
    [
        "   GGGGGGGG   ",
        "  GGGGGGGGGG  ",
        " GGGGGGGGGGGG ",
        " GGhGGGGGGhGG ",
        " GGGGGGGGGGGG ",
        "  CCCCCCCCCC  ",
        "  WWWcCCcWWW  ",
        "  WKKcCCcKKW  ",
        "  WWWcCCcWWW  ",
        "   CCCCCCCC   ",
        "    CCMMCC    ",
        "    CCCCCC    ",
        "    CCCCCC    ",
        "    CChChC    ",
        "    CCCCCC    ",
        "   DDDDDDDD   ",
        "              ",
    ],
    # 9 — Octopus
    [
        "              ",
        "    CCCCCC    ",
        "   CCCCCCCC   ",
        "  CCCCCCCCCC  ",
        "  CCCCCCCCCC  ",
        "  WWWcCCcWWW  ",
        "  WKKcCCcKKW  ",
        "  WWWcCCcWWW  ",
        "  CCPCCCCCPC  ",
        "  CCCCMMCCCC  ",
        "  CCCCCCCCCC  ",
        " CCCCCCCCCCCC ",
        " DC DC DC DC  ",
        "  D  D  D  D  ",
        " DC DC DC DC  ",
        "  D  D  D  D  ",
        "              ",
    ],
]

PALETTES = [
    {"G": "#FFD700", "g": "#FFA000", "C": "#00E5FF", "c": "#B2EBF2", "h": "#4DD0E1", "W": "#FFFFFF", "K": "#1A1A2E", "P": "#FF69B4", "M": "#FF4081", "A": "#00BCD4", "D": "#00838F"},
    {"G": "#FF6B6B", "g": "#EE5A24", "C": "#FF6348", "c": "#FFB8B8", "h": "#FF4757", "W": "#FFFFFF", "K": "#1A1A2E", "P": "#FFDD59", "M": "#FFC312", "A": "#FF3838", "D": "#C44569"},
    {"G": "#A3CB38", "g": "#009432", "C": "#6AB04C", "c": "#BADC58", "h": "#7BED9F", "W": "#FFFFFF", "K": "#1A1A2E", "P": "#E056A0", "M": "#D63031", "A": "#2ECC71", "D": "#1B9CFC"},
    {"G": "#E056A0", "g": "#B83280", "C": "#D980FA", "c": "#E8AFFF", "h": "#C56CF0", "W": "#FFFFFF", "K": "#1A1A2E", "P": "#FF69B4", "M": "#FDA7DF", "A": "#BE2EDD", "D": "#6C5CE7"},
    {"G": "#FFC312", "g": "#F79F1F", "C": "#F39C12", "c": "#FFE0A0", "h": "#FDCB6E", "W": "#FFFFFF", "K": "#1A1A2E", "P": "#E17055", "M": "#D63031", "A": "#E67E22", "D": "#D35400"},
    {"G": "#1B9CFC", "g": "#0652DD", "C": "#3742FA", "c": "#A4B0F5", "h": "#70A1FF", "W": "#FFFFFF", "K": "#1A1A2E", "P": "#7BED9F", "M": "#2ED573", "A": "#1E90FF", "D": "#3742FA"},
    {"G": "#FDA7DF", "g": "#D63031", "C": "#FD79A8", "c": "#FFCCCC", "h": "#FF6B81", "W": "#FFFFFF", "K": "#1A1A2E", "P": "#E84393", "M": "#FF4081", "A": "#E84393", "D": "#B53471"},
    {"G": "#55E6C1", "g": "#58B19F", "C": "#00D2D3", "c": "#AAFFEE", "h": "#7EFACC", "W": "#FFFFFF", "K": "#1A1A2E", "P": "#FECA57", "M": "#FF9FF3", "A": "#48DBFB", "D": "#01A3A4"},
    {"G": "#FF9F43", "g": "#EE5A24", "C": "#FFA502", "c": "#FFD8A8", "h": "#FECA57", "W": "#FFFFFF", "K": "#1A1A2E", "P": "#FF6348", "M": "#EE5A24", "A": "#E67E22", "D": "#CC8E35"},
    {"G": "#C4E538", "g": "#A3CB38", "C": "#7BED9F", "c": "#DFFFD6", "h": "#55E6C1", "W": "#FFFFFF", "K": "#1A1A2E", "P": "#FECA57", "M": "#BADC58", "A": "#33D9B2", "D": "#218C74"},
]


def hex_to_rgb(h):
    """Convert '#RRGGBB' to (R, G, B) tuple."""
    h = h.lstrip("#")
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16))


def hash_str(s):
    """Same hash as the JS hashStr function."""
    h = 0
    for ch in s:
        h = ((h << 5) - h + ord(ch)) & 0xFFFFFFFF
        if h >= 0x80000000:
            h -= 0x100000000
    return abs(h)


def get_shape_and_palette(user_id):
    """Pick shape and palette based on userId hash (matches the web app)."""
    h = hash_str(user_id)
    palette_idx = h % len(PALETTES)
    shape_idx = (h // len(SHAPES)) % len(SHAPES)
    palette = {k: hex_to_rgb(v) for k, v in PALETTES[palette_idx].items()}
    shape = SHAPES[shape_idx]
    return shape, palette


# ---------- Rendering ----------

PIXEL_SIZE = 15  # Each pixel = 15x15 real pixels → 14*15=210 wide, 17*15=255 tall
GRID_W, GRID_H = 14, 17
TAMA_W = GRID_W * PIXEL_SIZE  # 210
TAMA_H = GRID_H * PIXEL_SIZE  # 255
OFFSET_X = (SCREEN_W - TAMA_W) // 2  # center horizontally
BASE_Y = (SCREEN_H - TAMA_H) // 2    # center vertically


def pre_render_sprites(shape, palette):
    """Pre-render the tamagotchi sprite (eyes open) and blink sprite (eyes closed).
    Returns two RGBA images that can be pasted onto the frame."""
    sprites = {}
    for blink_mode in (False, True):
        img = Image.new("RGBA", (TAMA_W, TAMA_H), (0, 0, 0, 0))
        draw = ImageDraw.Draw(img)
        for row_idx, row in enumerate(shape):
            for col_idx, char in enumerate(row):
                if char == " ":
                    continue
                if blink_mode and char in ("W", "K"):
                    char = "C"
                color = palette.get(char)
                if color is None:
                    continue
                x = col_idx * PIXEL_SIZE
                y = row_idx * PIXEL_SIZE
                draw.rectangle(
                    [x, y, x + PIXEL_SIZE - 1, y + PIXEL_SIZE - 1],
                    fill=color + (255,),
                )
        sprites[blink_mode] = img
    return sprites


def render_frame(sprites, palette, blink=False, y_offset=0, x_offset=0, rotation=0.0, state="idle", t=0.0):
    """Render one frame compositing pre-rendered sprite onto black background."""
    img = Image.new("RGB", (SCREEN_W, SCREEN_H), (0, 0, 0))
    draw = ImageDraw.Draw(img)

    ox = OFFSET_X + int(x_offset)
    oy = BASE_Y + int(y_offset)
    cx = ox + TAMA_W // 2
    cy = oy + TAMA_H // 2

    # Draw effects BEHIND the tamagotchi
    if state == "wave":
        pass  # Wave effect is just the bounce + rotation (like the web app)
    elif state == "dating":
        # 5 expanding ripple circles with pink tint
        pink = palette.get("P", (255, 105, 180))
        for i in range(5):
            phase = (t * 0.6 + i * 0.2) % 1.0
            r = int(30 + phase * 120)
            alpha = max(0, int(255 * (1.0 - phase)))
            color = tuple(min(255, c * alpha // 255) for c in pink)
            draw.ellipse([cx - r, cy - r, cx + r, cy + r], outline=color, width=2)
        # Floating diamond hearts
        for i in range(4):
            h_phase = (t * 0.4 + i * 0.25) % 1.0
            hx = cx + int(math.sin(t * 0.8 + i * 1.5) * 60)
            hy = int(cy + 60 - h_phase * 140)
            h_alpha = max(0, int(255 * (1.0 - abs(h_phase - 0.5) * 2)))
            h_color = tuple(min(255, c * h_alpha // 255) for c in pink)
            hs = 5
            draw.polygon([(hx, hy - hs), (hx + hs, hy), (hx, hy + hs), (hx - hs, hy)], fill=h_color)
    elif state == "interact":
        for i in range(2):
            phase = (t * 0.8 + i * 0.5) % 1.0
            r = int(30 + phase * 60)
            alpha = max(0, int(200 * (1.0 - phase)))
            color = tuple(min(255, c * alpha // 255) for c in palette.get("G", (255, 215, 0)))
            draw.ellipse([cx - r, cy - r, cx + r, cy + r], outline=color, width=2)
    elif state == "listen":
        # Double pulsing glow border, bright
        pulse = int(160 + abs(math.sin(t * 3.5)) * 95)
        glow_base = palette.get("C", (0, 200, 255))
        glow_color = tuple(min(255, c * pulse // 255) for c in glow_base)
        draw.rectangle(
            [ox - 10, oy - 10, ox + TAMA_W + 9, oy + TAMA_H + 9],
            outline=glow_color, width=3,
        )
        # Inner border
        inner_pulse = int(100 + abs(math.sin(t * 3.5 + 1.0)) * 100)
        inner_color = tuple(min(255, c * inner_pulse // 255) for c in glow_base)
        draw.rectangle(
            [ox - 4, oy - 4, ox + TAMA_W + 3, oy + TAMA_H + 3],
            outline=inner_color, width=2,
        )
        # Sound wave bars on left
        for i in range(4):
            bar_h = int(8 + abs(math.sin(t * 5.0 + i * 0.8)) * 18)
            bar_y = cy - bar_h // 2
            bar_x = ox - 18 - i * 6
            bar_bright = int(150 + abs(math.sin(t * 4.0 + i)) * 105)
            bar_color = tuple(min(255, c * bar_bright // 255) for c in glow_base)
            draw.rectangle([bar_x, bar_y, bar_x + 3, bar_y + bar_h], fill=bar_color)
        # Sound wave bars on right
        for i in range(4):
            bar_h = int(8 + abs(math.sin(t * 5.0 + i * 0.8 + 2.0)) * 18)
            bar_y = cy - bar_h // 2
            bar_x = ox + TAMA_W + 14 + i * 6
            bar_bright = int(150 + abs(math.sin(t * 4.0 + i + 2.0)) * 105)
            bar_color = tuple(min(255, c * bar_bright // 255) for c in glow_base)
            draw.rectangle([bar_x, bar_y, bar_x + 3, bar_y + bar_h], fill=bar_color)
    elif state == "think":
        dots_y = oy + TAMA_H + 12
        dot_phase = int(t * 3) % 3
        for i in range(3):
            dx = cx - 12 + i * 12
            brightness = 200 if i == dot_phase else 60
            dot_color = tuple(min(255, c * brightness // 255) for c in palette.get("C", (0, 200, 255)))
            draw.ellipse([dx - 3, dots_y - 3, dx + 3, dots_y + 3], fill=dot_color)

    # Paste pre-rendered sprite (with optional rotation)
    sprite = sprites[blink]
    if rotation != 0.0:
        rotated = sprite.rotate(rotation, resample=Image.BICUBIC, expand=True)
        # Center the rotated sprite at the same position
        rw, rh = rotated.size
        rx = ox + TAMA_W // 2 - rw // 2
        ry = oy + TAMA_H // 2 - rh // 2
        img.paste(rotated, (rx, ry), rotated)
    else:
        img.paste(sprite, (ox, oy), sprite)

    return img


def main():
    parser = argparse.ArgumentParser(description="Tamagotchi display for Raspberry Pi")
    parser.add_argument("--server", required=True, help="Next.js server URL, e.g. http://192.168.1.10:3000")
    parser.add_argument("--user", required=True, help="User ID, e.g. elisa")
    parser.add_argument("--fps", type=int, default=25, help="Target FPS (default: 15)")
    args = parser.parse_args()

    server = args.server.rstrip("/")
    user_id = args.user
    fps = args.fps
    frame_time = 1.0 / fps

    shape, palette = get_shape_and_palette(user_id)
    sprites = pre_render_sprites(shape, palette)
    print(f"Tamagotchi for '{user_id}' — shape {SHAPES.index(shape)}, palette {hash_str(user_id) % len(PALETTES)}")
    print(f"Server: {server}")
    print(f"Screen: {SCREEN_W}x{SCREEN_H}, FPS target: {fps}")

    # Shared state (updated by poller thread)
    state = "idle"
    state_lock = threading.Lock()

    # Background thread polls server every 0.5s
    def poller():
        nonlocal state
        session = requests.Session()
        while True:
            try:
                resp = session.get(
                    f"{server}/api/user/state",
                    params={"deviceId": user_id},
                    timeout=2,
                )
                if resp.status_code == 200:
                    new_state = resp.json().get("state", "idle")
                    with state_lock:
                        if new_state != state:
                            print(f"State: {state} → {new_state}")
                            state = new_state
            except Exception:
                pass
            time.sleep(0.5)

    poll_thread = threading.Thread(target=poller, daemon=True)
    poll_thread.start()

    blink = False
    blink_timer = time.time() + 3.0
    prev_oy = None  # Track last y offset to skip identical frames

    # Show initial frame
    img = render_frame(sprites, palette, blink=False, y_offset=0, x_offset=0, state="idle", t=time.time())
    disp.image(img)
    print("Display initialized. Polling for state...")

    while True:
        t0 = time.time()

        # Blink logic
        if t0 >= blink_timer:
            blink = True
            blink_timer = t0 + 2.5 + (hash_str(user_id + str(int(t0))) % 2000) / 1000.0
        if blink and t0 >= blink_timer - 2.3:
            blink = False

        # Read state (thread-safe)
        with state_lock:
            cur_state = state

        # Animation offsets
        x_off = 0
        rot = 0.0
        if cur_state == "idle":
            y_off = math.sin(t0 * 1.2) * 8
        elif cur_state == "wave":
            # Match CSS: wave-bounce 0.5s — bounce up 16px + tilt ±10°
            cycle = (t0 % 0.5) / 0.5  # 0..1 over 0.5s
            if cycle < 0.25:
                # 0% → 25%: go up + tilt left
                p = cycle / 0.25
                y_off = -16 * p
                rot = -10 * p
            elif cycle < 0.75:
                # 25% → 75%: stay up, tilt left → right
                p = (cycle - 0.25) / 0.5
                y_off = -16
                rot = -10 + 20 * p
            else:
                # 75% → 100%: come down + tilt back to 0
                p = (cycle - 0.75) / 0.25
                y_off = -16 * (1 - p)
                rot = 10 * (1 - p)
        elif cur_state == "listen":
            y_off = math.sin(t0 * 2.0) * 3
        elif cur_state == "think":
            y_off = math.sin(t0 * 0.8) * 6
        elif cur_state == "dating":
            y_off = math.sin(t0 * 0.8) * 4
        elif cur_state == "interact":
            y_off = abs(math.sin(t0 * 3.0)) * -10
        else:
            y_off = 0

        # Render and display
        img = render_frame(sprites, palette, blink=blink, y_offset=y_off, x_offset=x_off, rotation=rot, state=cur_state, t=t0)
        disp.image(img)

        # Frame rate control
        elapsed = time.time() - t0
        sleep_time = frame_time - elapsed
        if sleep_time > 0:
            time.sleep(sleep_time)


if __name__ == "__main__":
    main()
