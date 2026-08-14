"""
On-site NVR connection helper for LOVAIC.

Run this on a machine that sits on the SAME local network as the client's
Dahua NVR. It builds the correct RTSP sub-stream URL for each channel
(handling special characters in the password), tests which channels actually
return video, and writes the working feed URLs to feeds.txt for the platform.

Example (Raga's Resort — Dahua NVR):
    ./venv/bin/python connect_nvr.py --nvr-ip 192.168.1.108 \
        --user admin --password 'admin@123' --channels 32 --subtype 1

Notes:
- subtype=1 is the low-res sub-stream (best for analytics); subtype=0 = main.
- If channels fail, try --subtype 0, confirm the RTSP port (--port), or check
  that ONVIF/RTSP is enabled on the NVR.
- Credentials are passed at runtime and NOT stored in code or git.
"""
from __future__ import annotations

import argparse
from urllib.parse import quote


def build_url(ip: str, user: str, pwd: str, channel: int, port: int, subtype: int) -> str:
    # quote() encodes @ : / etc. in credentials so the URL parses correctly
    return (f"rtsp://{quote(user, safe='')}:{quote(pwd, safe='')}@{ip}:{port}"
            f"/cam/realmonitor?channel={channel}&subtype={subtype}")


def test_url(url: str) -> tuple[bool, int, int]:
    import cv2

    cap = cv2.VideoCapture(url, cv2.CAP_FFMPEG)
    ok = False
    w = h = 0
    if cap.isOpened():
        got, frame = cap.read()
        if got and frame is not None:
            ok = True
            h, w = frame.shape[:2]
    cap.release()
    return ok, w, h


def main() -> None:
    ap = argparse.ArgumentParser(description="Probe a Dahua NVR's RTSP channels for LOVAIC")
    ap.add_argument("--nvr-ip", required=True, help="NVR IP on the local network, e.g. 192.168.1.108")
    ap.add_argument("--user", required=True)
    ap.add_argument("--password", required=True)
    ap.add_argument("--channels", type=int, default=32, help="how many channels to probe (1..N)")
    ap.add_argument("--port", type=int, default=554)
    ap.add_argument("--subtype", type=int, default=1, help="1 = sub-stream (analytics), 0 = main")
    ap.add_argument("--only", default="", help="comma-separated channels to test, e.g. 1,4,7")
    args = ap.parse_args()

    channels = ([int(c) for c in args.only.split(",") if c]
                if args.only else list(range(1, args.channels + 1)))

    print(f"\nProbing {len(channels)} channel(s) on {args.nvr_ip}:{args.port} "
          f"(subtype={args.subtype})…\n")
    working: list[tuple[int, str]] = []
    for ch in channels:
        url = build_url(args.nvr_ip, args.user, args.password, ch, args.port, args.subtype)
        ok, w, h = test_url(url)
        status = f"OK  {w}x{h}" if ok else "FAIL"
        # redact password in the printed line
        shown = url.replace(quote(args.password, safe=""), "******")
        print(f"  channel {ch:>2} : {status:>10}   {shown}")
        if ok:
            working.append((ch, url))

    with open("feeds.txt", "w") as f:
        for ch, url in working:
            f.write(f"channel-{ch}\t{url}\n")

    print(f"\n{len(working)}/{len(channels)} channels returned video.")
    print("Working feed URLs written to feeds.txt (with real credentials — keep it safe).")
    if not working:
        print("\nNo channels worked. Try: --subtype 0, a different --port, or verify "
              "RTSP is enabled and the NVR IP/credentials are correct.")


if __name__ == "__main__":
    main()
