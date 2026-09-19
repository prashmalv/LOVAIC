"""
NVR / IP-camera discovery.

Given an NVR (or camera) IP + credentials, enumerate which channels actually
carry a live video stream and hand back ready-to-use RTSP URLs the platform can
connect to. Works by probing each channel's RTSP URL with ffprobe — no vendor
SDK or extra dependency required — across the common vendor URL templates
(Dahua, Hikvision, and a generic ONVIF-style path).

This is the "list available cameras and connect" capability: point it at the
NVR, get back a card per live camera.

Note: the NVR must be reachable from wherever the backend runs. A private LAN
IP (192.168.x / 10.x / 172.16-31.x) is only reachable from inside that network,
so run the backend on-site, port-forward the router, or VPN in.
"""
from __future__ import annotations

import ipaddress
import json
import socket
import subprocess
from concurrent.futures import ThreadPoolExecutor

# Per-vendor RTSP path templates, tried in order until one authenticates.
# {ch}=channel, {sub}=0 main / 1 sub, {stream}=1 main / 2 sub (Hikvision).
VENDOR_TEMPLATES = {
    "dahua": [
        "/cam/realmonitor?channel={ch}&subtype={sub}",
        # some Dahua/CP-Plus NVRs only auth via the ONVIF proto variant
        "/cam/realmonitor?channel={ch}&subtype={sub}&unicast=true&proto=Onvif",
    ],
    "hikvision": [
        "/Streaming/Channels/{ch}0{stream}",   # ch101 main, ch102 sub
        "/h264/ch{ch}/main/av_stream",
        "/Streaming/Channels/{ch}",
    ],
    "generic": [
        "/ch{ch}/{sub}",
        "/live/ch{ch}",
        "/{ch}",
    ],
}

VENDOR_LABEL = {"dahua": "Dahua / CP Plus", "hikvision": "Hikvision", "generic": "Generic / ONVIF"}


def is_private(host: str) -> bool:
    try:
        return ipaddress.ip_address(socket.gethostbyname(host)).is_private
    except Exception:
        return False


def _reachable(host: str, port: int, timeout: float = 5.0) -> bool:
    try:
        with socket.create_connection((host, port), timeout=timeout):
            return True
    except Exception:
        return False


def _rtsp_url(user: str, pwd: str, host: str, port: int, path: str) -> str:
    # Use RAW credentials, not URL-encoded: many NVRs (Dahua/CP-Plus) do NOT
    # url-decode the password, so encoding '@'->%40 gets rejected as 401. ffmpeg
    # parses the userinfo at the LAST '@', so a raw '@' inside the password works.
    cred = ""
    if user:
        cred = user + (":" + pwd if pwd else "") + "@"
    return f"rtsp://{cred}{host}:{port}{path}"


def _display_url(user: str, host: str, port: int, path: str) -> str:
    cred = f"{user}:******@" if user else ""
    return f"rtsp://{cred}{host}:{port}{path}"


def _probe(url: str, timeout_us: int = 6000000) -> dict | None:
    """ffprobe one RTSP URL; return stream info if it carries video, else None."""
    cmd = [
        "ffprobe", "-hide_banner", "-loglevel", "error",
        "-rtsp_transport", "tcp", "-timeout", str(timeout_us),
        "-i", url, "-select_streams", "v:0",
        "-show_entries", "stream=codec_name,width,height,avg_frame_rate",
        "-of", "json",
    ]
    try:
        out = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout_us / 1e6 + 4)
        if out.returncode != 0:
            return None
        data = json.loads(out.stdout or "{}")
        streams = data.get("streams", [])
        if not streams:
            return None
        s = streams[0]
        if not s.get("width"):
            return None
        fr = s.get("avg_frame_rate", "0/0")
        try:
            n, d = fr.split("/")
            fps = round(float(n) / float(d)) if float(d) else 0
        except Exception:
            fps = 0
        return {
            "codec": s.get("codec_name", "?"),
            "width": s.get("width"),
            "height": s.get("height"),
            "fps": fps,
        }
    except Exception:
        return None


def discover(host: str, user: str = "", pwd: str = "", rtsp_port: int = 554,
             channels: int = 16, vendor: str = "dahua", sub: int = 0) -> dict:
    host = (host or "").strip()
    vendor = vendor if vendor in VENDOR_TEMPLATES else "dahua"
    channels = max(1, min(int(channels), 64))

    if not host:
        return {"ok": False, "error": "No NVR IP / host given.", "cameras": []}

    private = is_private(host)
    if not _reachable(host, rtsp_port):
        msg = (f"{host}:{rtsp_port} is not reachable. "
               + ("This is a private LAN IP — the backend must be on the same network "
                  "(run on-site, port-forward the router, or VPN in)."
                  if private else
                  "Check the IP/port, that the camera is online, and that RTSP (554) is open/forwarded."))
        return {"ok": False, "error": msg, "private": private, "host": host, "cameras": []}

    templates = VENDOR_TEMPLATES[vendor]

    def probe_channel(ch: int) -> dict | None:
        # Try each path variant; keep the first that authenticates + carries video.
        for tmpl in templates:
            path = tmpl.format(ch=ch, sub=sub, stream=1 if sub == 0 else 2)
            url = _rtsp_url(user, pwd, host, rtsp_port, path)
            info = _probe(url)
            if info:
                return {
                    "channel": ch,
                    "name": f"Channel {ch}",
                    "url": url,
                    "display_url": _display_url(user, host, rtsp_port, path),
                    **info,
                }
        return None

    cameras: list[dict] = []
    with ThreadPoolExecutor(max_workers=5) as ex:
        for res in ex.map(probe_channel, range(1, channels + 1)):
            if res:
                cameras.append(res)
    cameras.sort(key=lambda c: c["channel"])

    return {
        "ok": True,
        "host": host,
        "vendor": vendor,
        "vendor_label": VENDOR_LABEL[vendor],
        "scanned": channels,
        "found": len(cameras),
        "private": private,
        "cameras": cameras,
        "note": (None if cameras else
                 "No live channels found. Try a different vendor template or confirm the "
                 "credentials — the NVR is reachable but no channel responded on the tried paths."),
    }
