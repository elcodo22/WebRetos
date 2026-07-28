import json
import struct
import os
from PIL import Image

path = r"C:\Users\Lenovo\Downloads\stopwtch.ani"
out = r"C:\Users\Lenovo\Desktop\Proyecto_retos_web\web\public\cursors\stopwatch"
os.makedirs(out, exist_ok=True)
data = open(path, "rb").read()


def parse_cur_frame(chunk: bytes):
    reserved, itype, count = struct.unpack_from("<HHH", chunk, 0)
    w, h, colors, res, xhot, yhot, nbytes, offset = struct.unpack_from(
        "<BBBBHHII", chunk, 6
    )
    if w == 0:
        w = 256
    if h == 0:
        h = 256
    img_data = chunk[offset : offset + nbytes]
    biSize, biWidth, biHeight, biPlanes, biBitCount = struct.unpack_from(
        "<IiiHH", img_data, 0
    )
    biCompression, biSizeImage, _, _, biClrUsed, _ = struct.unpack_from(
        "<IIIIII", img_data, 16
    )
    real_h = abs(biHeight) // 2
    real_w = biWidth
    bit = biBitCount
    palette = []
    pos = biSize
    ncolors = biClrUsed or (1 << bit if bit <= 8 else 0)
    for _ in range(ncolors):
        b, g, r, a = (
            img_data[pos],
            img_data[pos + 1],
            img_data[pos + 2],
            img_data[pos + 3],
        )
        palette.append((r, g, b, 255))
        pos += 4

    if bit == 4:
        row = ((real_w * 4 + 31) // 32) * 4
    elif bit == 8:
        row = ((real_w * 8 + 31) // 32) * 4
    elif bit == 1:
        row = ((real_w + 31) // 32) * 4
    else:
        raise ValueError(f"unsupported bitcount {bit}")

    xor = img_data[pos : pos + row * real_h]
    pos += row * real_h
    and_row = ((real_w + 31) // 32) * 4
    and_mask = img_data[pos : pos + and_row * real_h]

    pixels = []
    for y in range(real_h - 1, -1, -1):
        for x in range(real_w):
            abyte = and_mask[y * and_row + x // 8]
            a_bit = 7 - (x % 8)
            transparent = (abyte >> a_bit) & 1
            if transparent:
                pixels.append((0, 0, 0, 0))
                continue
            if bit == 4:
                byte = xor[y * row + x // 2]
                idx = (byte >> 4) if x % 2 == 0 else (byte & 0x0F)
                pixels.append(palette[idx])
            elif bit == 8:
                idx = xor[y * row + x]
                pixels.append(palette[idx])
            elif bit == 1:
                byte = xor[y * row + x // 8]
                on = (byte >> (7 - (x % 8))) & 1
                pixels.append(
                    palette[on]
                    if palette
                    else ((255, 255, 255, 255) if on else (0, 0, 0, 255))
                )
    im = Image.new("RGBA", (real_w, real_h))
    im.putdata(pixels)
    return im, xhot, yhot


frames = []
hotspots = []
i = 0
idx = 0
while True:
    j = data.find(b"icon", i)
    if j < 0:
        break
    size = struct.unpack_from("<I", data, j + 4)[0]
    chunk = data[j + 8 : j + 8 + size]
    i = j + 8 + size + (size % 2)
    im, xhot, yhot = parse_cur_frame(chunk)
    fp = os.path.join(out, f"frame_{idx:02d}.png")
    im.save(fp)
    print(idx, im.size, "hot", xhot, yhot, "bbox", im.getbbox())
    frames.append(im)
    hotspots.append((xhot, yhot))
    idx += 1

rates = [8] * 8
rate_chunk = data.find(b"rate")
if rate_chunk >= 0:
    size = struct.unpack_from("<I", data, rate_chunk + 4)[0]
    rates = list(
        struct.unpack_from("<" + "I" * (size // 4), data, rate_chunk + 8)
    )[:8]

durations = [max(int(r * 1000 / 60), 50) for r in rates]
print("durations", durations)

gif_path = os.path.join(out, "stopwatch.gif")
frames[0].save(
    gif_path,
    save_all=True,
    append_images=frames[1:],
    duration=durations,
    loop=0,
    disposal=2,
)

meta = {
    "hotspot": [hotspots[0][0], hotspots[0][1]],
    "durations": durations,
    "frames": len(frames),
}
with open(os.path.join(out, "meta.json"), "w", encoding="utf-8") as f:
    json.dump(meta, f)

print("done", out)
