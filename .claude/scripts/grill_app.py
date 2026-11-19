#!/usr/bin/env python3
"""The question window: asks your agent's questions in a copy of the Claude
Code VS Code question card (tabs, pick one / pick any, Other, Submit).

    python3 .claude/scripts/grill_app.py [questions.json]

Reads .claude/grill/questions.json by default. Serves grill_app.html on
127.0.0.1 (random port, random token) and opens it in a small chromeless
Google Chrome window. On macOS the window opens over Slack, on Slack's screen,
and comes to the front. Without Chrome it opens in the default browser.

Submit writes .claude/grill/answers/<id>-<time>.json (Esc or the close button
writes one with "declined": true); /manager's Slack watcher reports it as
GRILL_ANSWERS. The script exits after that, or when the window is closed.
Docs: docs/agent/question-window.md.

Testing: GRILL_NO_OPEN=1 prints the URL instead of opening a window, and
GRILL_OUT_DIR=<dir> saves answers there instead.
"""

import http.server
import json
import os
import secrets
import shutil
import subprocess
import sys
import threading
import time
import webbrowser
from datetime import datetime

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
GRILL_DIR = os.path.join(ROOT, ".claude", "grill")
PAGE = os.path.join(HERE, "grill_app.html")
CHROME = "/Applications/Google Chrome.app"
MAC = sys.platform == "darwin"
WIDTH = 560          # window width; height fits the card
IDLE_EXIT = 20       # seconds without a heartbeat after the window opened
MAX_LIFETIME = 3600  # never linger longer than an hour


JXA_SLACK = """
ObjC.import("CoreGraphics");
const info = ObjC.deepUnwrap(ObjC.castRefToObject($.CGWindowListCopyWindowInfo(
  $.kCGWindowListOptionOnScreenOnly | $.kCGWindowListExcludeDesktopElements, 0)));
const wins = info.filter(w => w.kCGWindowOwnerName === "Slack" && w.kCGWindowLayer === 0)
  .map(w => w.kCGWindowBounds).sort((a, b) => b.Width * b.Height - a.Width * a.Height);
JSON.stringify(wins[0] || null);
"""

JXA_ACTIVATE = """
ObjC.import("AppKit");
const app = $.NSRunningApplication.runningApplicationWithProcessIdentifier(%d);
if (app) app.activateWithOptions(3);
delay(0.4);
String($.NSWorkspace.sharedWorkspace.frontmostApplication.processIdentifier);
"""


def jxa(script):
    try:
        out = subprocess.run(["osascript", "-l", "JavaScript", "-e", script],
                             capture_output=True, text=True, timeout=5)
        return out.stdout.strip()
    except Exception:
        return ""


def slack_window():
    """Slack's main window bounds (global, top-left origin), or None."""
    try:
        return json.loads(jxa(JXA_SLACK) or "null")
    except ValueError:
        return None


def window_pid(profile):
    """PID of the Chrome process that owns our window's profile."""
    out = subprocess.run(["ps", "-axo", "pid=,command="], capture_output=True, text=True).stdout
    for line in out.splitlines():
        pid, _, cmd = line.strip().partition(" ")
        if "/MacOS/Google Chrome " in cmd and ("--user-data-dir=" + profile) in cmd:
            return int(pid)
    return None


def main():
    qpath = sys.argv[1] if len(sys.argv) > 1 else os.path.join(GRILL_DIR, "questions.json")
    if not os.path.exists(qpath):
        sys.exit("No questions waiting (%s not found)." % qpath)
    with open(qpath) as f:
        questions = json.load(f)
    questions.setdefault("id", "questions")
    token = secrets.token_urlsafe(16)
    state = {"last_ping": None, "result": None, "logs": []}
    started = time.time()

    class Handler(http.server.BaseHTTPRequestHandler):
        def log_message(self, *args):
            pass

        def _ok_token(self):
            from urllib.parse import parse_qs, urlparse
            q = parse_qs(urlparse(self.path).query)
            return secrets.compare_digest((q.get("t") or [""])[0], token)

        def _send(self, code, body, ctype="application/json"):
            data = body if isinstance(body, bytes) else body.encode()
            self.send_response(code)
            self.send_header("Content-Type", ctype)
            self.send_header("Content-Length", str(len(data)))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(data)

        def do_GET(self):
            path = self.path.split("?")[0]
            if path == "/favicon.ico":
                return self._send(204, b"", "image/x-icon")
            if path in ("/", "/index.html"):
                if not self._ok_token():
                    return self._send(403, "forbidden", "text/plain")
                with open(PAGE, "rb") as f:
                    return self._send(200, f.read(), "text/html; charset=utf-8")
            if not self._ok_token():
                return self._send(403, '{"error":"forbidden"}')
            if path == "/api/questions":
                return self._send(200, json.dumps(questions))
            if path == "/api/ping":
                state["last_ping"] = time.time()
                return self._send(200, "{}")
            self._send(404, '{"error":"not found"}')

        def do_POST(self):
            if self.path.split("?")[0] == "/api/log" and self._ok_token():
                length = int(self.headers.get("Content-Length") or 0)
                if 0 < length < 10000:
                    try:
                        info = json.loads(self.rfile.read(length))
                        state["logs"].append(info)
                        print("WINDOW " + json.dumps(info), flush=True)
                    except ValueError:
                        pass
                return self._send(200, "{}")
            if self.path.split("?")[0] != "/api/answers" or not self._ok_token():
                return self._send(403, '{"error":"forbidden"}')
            length = int(self.headers.get("Content-Length") or 0)
            if length <= 0 or length > 1_000_000:
                return self._send(400, '{"error":"bad body"}')
            try:
                result = json.loads(self.rfile.read(length))
            except ValueError:
                return self._send(400, '{"error":"bad json"}')
            out_dir = os.environ.get("GRILL_OUT_DIR") or os.path.join(GRILL_DIR, "answers")
            os.makedirs(out_dir, exist_ok=True)
            stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
            safe_id = "".join(c for c in str(questions["id"]) if c.isalnum() or c in "-_") or "questions"
            out = os.path.join(out_dir, "%s-%s.json" % (safe_id, stamp))
            with open(out + ".tmp", "w") as f:
                json.dump(result, f, indent=2)
            os.replace(out + ".tmp", out)
            state["result"] = (out, result)
            self._send(200, "{}")

    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), Handler)
    port = server.server_address[1]
    url = "http://127.0.0.1:%d/?t=%s" % (port, token)
    # Open over Slack's window, on whichever screen Slack is on.
    slack = slack_window() if MAC and not os.environ.get("GRILL_NO_OPEN") else None
    if slack:
        cx = int(slack["X"] + slack["Width"] / 2)
        cy = int(slack["Y"] + slack["Height"] / 2)
        url += "&cx=%d&cy=%d" % (cx, cy)
        pos = "%d,%d" % (cx - WIDTH // 2, max(int(slack["Y"]) + 60, cy - 250))
    else:
        pos = None
    threading.Thread(target=server.serve_forever, daemon=True).start()

    if os.environ.get("GRILL_NO_OPEN"):
        print("URL " + url, flush=True)
    elif MAC and os.path.isdir(CHROME):
        profile = os.path.expanduser("~/.claude-grill-window")
        args = ["--app=" + url, "--window-size=%d,420" % WIDTH, "--user-data-dir=" + profile,
                "--no-first-run", "--no-default-browser-check"]
        if pos:
            args.append("--window-position=" + pos)
        subprocess.Popen(["open", "-na", CHROME, "--args"] + args)
    else:
        webbrowser.open(url)
    print("Questions window open. Answer there; this closes by itself.", flush=True)
    warned = False
    activated = False

    while True:
        time.sleep(0.5)
        if state["result"]:
            time.sleep(0.5)  # let the page show its confirmation
            out, result = state["result"]
            print("Declined." if result.get("declined") else "Saved: " + result.get("compact", ""))
            print("  " + out)
            break
        now = time.time()
        if MAC and state["logs"] and not activated and not os.environ.get("GRILL_NO_OPEN"):
            activated = True
            pid = window_pid(os.path.expanduser("~/.claude-grill-window"))
            if pid:
                front = jxa(JXA_ACTIVATE % pid)
                print("FRONT %s (window pid %d)" % (front, pid), flush=True)
        if state["last_ping"] and now - state["last_ping"] > IDLE_EXIT:
            print("Window closed without answering. Nothing was saved.")
            break
        if not state["last_ping"] and not warned and now - started > 120:
            print("The window never opened. Open this link instead: " + url)
            warned = True  # keep waiting; the link still works
        if now - started > MAX_LIFETIME:
            print("Timed out. Nothing was saved.")
            break
    server.shutdown()


if __name__ == "__main__":
    main()
