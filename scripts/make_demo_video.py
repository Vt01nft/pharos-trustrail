from __future__ import annotations

import json
import subprocess
from pathlib import Path

import imageio.v2 as imageio
import numpy as np
from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "demo"
OUT_FILE = OUT_DIR / "pharos-trustrail-demo.mp4"
WIDTH = 1280
HEIGHT = 720
FPS = 24


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    candidates = [
        "C:/Windows/Fonts/segoeuib.ttf" if bold else "C:/Windows/Fonts/segoeui.ttf",
        "C:/Windows/Fonts/arialbd.ttf" if bold else "C:/Windows/Fonts/arial.ttf",
    ]
    for candidate in candidates:
        if Path(candidate).exists():
            return ImageFont.truetype(candidate, size)
    return ImageFont.load_default(size)


F_TITLE = font(52, True)
F_H1 = font(40, True)
F_H2 = font(29, True)
F_BODY = font(25)
F_SMALL = font(19)
F_MONO = font(20)
F_MONO_SMALL = font(17)


COLORS = {
    "bg": "#f5f7f2",
    "ink": "#18241f",
    "muted": "#61706a",
    "panel": "#ffffff",
    "line": "#d8e0d8",
    "green": "#117b52",
    "green_soft": "#ddf4e8",
    "red": "#b83232",
    "red_soft": "#ffe2df",
    "amber": "#9d650f",
    "amber_soft": "#fff0d6",
    "teal": "#0e6f7c",
    "code": "#17211d",
    "code_text": "#e9f4ec",
}


def run_skill(command: str, payload: str | None = None) -> dict:
    args = ["npm.cmd", "run", "skill", "--", command]
    if payload:
        args.append(payload)
    result = subprocess.run(args, cwd=ROOT, capture_output=True, text=True, check=True)
    start = result.stdout.find("{")
    return json.loads(result.stdout[start:])


def wrap(draw: ImageDraw.ImageDraw, text: str, width: int, fnt: ImageFont.ImageFont) -> list[str]:
    words = text.split()
    lines: list[str] = []
    current = ""
    for word in words:
        trial = f"{current} {word}".strip()
        if draw.textbbox((0, 0), trial, font=fnt)[2] <= width:
            current = trial
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines


def draw_wrapped(draw: ImageDraw.ImageDraw, text: str, xy: tuple[int, int], width: int, fnt: ImageFont.ImageFont, fill: str, gap: int = 8) -> int:
    x, y = xy
    for line in wrap(draw, text, width, fnt):
        draw.text((x, y), line, font=fnt, fill=fill)
        y += draw.textbbox((0, 0), line, font=fnt)[3] + gap
    return y


def rounded(draw: ImageDraw.ImageDraw, box: tuple[int, int, int, int], fill: str, outline: str | None = None, radius: int = 16, width: int = 1) -> None:
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


def base(slide_no: int, total: int) -> tuple[Image.Image, ImageDraw.ImageDraw]:
    img = Image.new("RGB", (WIDTH, HEIGHT), COLORS["bg"])
    draw = ImageDraw.Draw(img)
    draw.rectangle((0, 0, 260, HEIGHT), fill=COLORS["ink"])
    draw.text((34, 34), "Pharos", font=F_H2, fill="#f4fbf6")
    draw.text((34, 72), "TrustRail", font=F_H2, fill="#f4fbf6")
    draw.text((34, 124), "Agent action\ngateway Skill", font=F_SMALL, fill="#b9c8bf", spacing=6)
    draw.line((34, 615, 226, 615), fill="#34443c", width=1)
    draw.text((34, 635), "Skill-first submission", font=F_SMALL, fill="#dce8df")
    progress_w = 840
    draw.rounded_rectangle((320, 666, 320 + progress_w, 676), radius=5, fill="#dde6dd")
    draw.rounded_rectangle((320, 666, 320 + int(progress_w * slide_no / total), 676), radius=5, fill=COLORS["green"])
    draw.text((1145, 648), f"{slide_no}/{total}", font=F_SMALL, fill=COLORS["muted"])
    return img, draw


def title_slide(slide_no: int, total: int, title: str, subtitle: str, bullets: list[str]) -> Image.Image:
    img, draw = base(slide_no, total)
    draw.text((320, 72), title, font=F_TITLE, fill=COLORS["ink"])
    draw_wrapped(draw, subtitle, (322, 150), 820, F_BODY, COLORS["muted"])
    y = 255
    for bullet in bullets:
        rounded(draw, (322, y, 1120, y + 72), COLORS["panel"], COLORS["line"], radius=12)
        draw.ellipse((346, y + 24, 370, y + 48), fill=COLORS["green"])
        draw_wrapped(draw, bullet, (390, y + 18), 700, F_BODY, COLORS["ink"], gap=5)
        y += 88
    return img


def split_slide(slide_no: int, total: int, title: str, left_title: str, left_lines: list[str], right_title: str, right_lines: list[str]) -> Image.Image:
    img, draw = base(slide_no, total)
    draw.text((320, 58), title, font=F_H1, fill=COLORS["ink"])
    rounded(draw, (320, 140, 690, 610), COLORS["panel"], COLORS["line"])
    rounded(draw, (730, 140, 1120, 610), COLORS["panel"], COLORS["line"])
    draw.text((350, 172), left_title, font=F_H2, fill=COLORS["red"])
    draw.text((760, 172), right_title, font=F_H2, fill=COLORS["green"])
    y = 235
    for line in left_lines:
        y = draw_wrapped(draw, f"- {line}", (350, y), 300, F_BODY, COLORS["ink"]) + 16
    y = 235
    for line in right_lines:
        y = draw_wrapped(draw, f"- {line}", (760, y), 320, F_BODY, COLORS["ink"]) + 16
    return img


def terminal_slide(slide_no: int, total: int, title: str, command: str, highlights: list[tuple[str, str]], output_lines: list[str]) -> Image.Image:
    img, draw = base(slide_no, total)
    draw.text((320, 50), title, font=F_H1, fill=COLORS["ink"])
    rounded(draw, (320, 126, 1130, 610), COLORS["code"], None, radius=14)
    draw.rectangle((320, 126, 1130, 168), fill="#223028")
    draw.text((348, 138), "$ " + command, font=F_MONO, fill="#d6f5df")
    y = 190
    for key, value in highlights:
        color = COLORS["green"] if value in {"ALLOW", "ok", "confirmed"} else COLORS["red"] if value == "BLOCK" else COLORS["amber"]
        rounded(draw, (348, y, 570, y + 42), color, None, radius=8)
        draw.text((364, y + 8), f"{key}: {value}", font=F_MONO_SMALL, fill="#ffffff")
        y += 52
    x2 = 610
    y2 = 194
    for line in output_lines[:13]:
        draw_wrapped(draw, line, (x2, y2), 470, F_MONO_SMALL, COLORS["code_text"], gap=4)
        y2 += 30
    return img


def registry_slide(slide_no: int, total: int) -> Image.Image:
    img, draw = base(slide_no, total)
    draw.text((320, 56), "On-chain receipt registry", font=F_H1, fill=COLORS["ink"])
    draw_wrapped(
        draw,
        "After a Skill executes, the agent can attach the Pharos transaction hash and register the TrustRail receipt hash on-chain.",
        (322, 118),
        820,
        F_BODY,
        COLORS["muted"],
    )
    code = [
        "contract TrustRailRegistry {",
        "  mapping(bytes32 => ReceiptRecord) public receipts;",
        "",
        "  function recordReceipt(",
        "    bytes32 receiptHash,",
        "    bytes32 policyHash,",
        "    address agentWallet,",
        "    uint256 chainId,",
        "    string calldata status",
        "  ) external { ... }",
        "}",
    ]
    rounded(draw, (330, 235, 1120, 585), COLORS["code"], None, radius=14)
    y = 264
    for line in code:
        draw.text((365, y), line, font=F_MONO, fill=COLORS["code_text"])
        y += 29
    return img


def final_slide(slide_no: int, total: int) -> Image.Image:
    img, draw = base(slide_no, total)
    draw.text((320, 74), "Why Pharos should care", font=F_TITLE, fill=COLORS["ink"])
    lines = [
        "Makes agent payments safer without replacing payment Skills.",
        "Adds policy, credentials, idempotency, and audit receipts before execution.",
        "Works with x402, stablecoin settlement, RWA workflows, escrow, and contract calls.",
        "Gives Phase 2 Agents a reusable compliance gateway for every write action.",
    ]
    y = 185
    for line in lines:
        rounded(draw, (330, y, 1120, y + 70), COLORS["panel"], COLORS["line"], radius=12)
        draw.text((360, y + 20), "OK", font=F_BODY, fill=COLORS["green"])
        draw_wrapped(draw, line, (420, y + 18), 650, F_BODY, COLORS["ink"])
        y += 86
    rounded(draw, (330, 590, 1120, 636), COLORS["green"], None, radius=10)
    draw.text((360, 601), "github.com/Vt01nft/pharos-trustrail", font=F_BODY, fill="#ffffff")
    return img


def make_video() -> None:
    OUT_DIR.mkdir(exist_ok=True)

    allow = run_skill("trustrail_preflight", "@examples/preflight-x402.json")
    block = run_skill("trustrail_preflight", "@examples/blocked-counterparty.json")
    challenge = run_skill("trustrail_x402_challenge", "@examples/x402-challenge.json")

    slides: list[tuple[Image.Image, int]] = []
    total = 9
    slides.append(
        (
            title_slide(
                1,
                total,
                "Pharos TrustRail",
                "Compliance-aware action gateway Skill for autonomous RealFi agents on Pharos.",
                [
                    "Agents call TrustRail before payments, RWA actions, x402 access, escrow, or contract writes.",
                    "TrustRail returns ALLOW, WARN, or BLOCK with reason codes and a verifiable receipt.",
                    "Built as a reusable Skill first: CLI runtime, JSON schemas, examples, tests, SDK shape, and registry contract.",
                ],
            ),
            8,
        )
    )
    slides.append(
        (
            split_slide(
                2,
                total,
                "The missing layer",
                "What agents can do",
                ["Pay services", "Settle invoices", "Call contracts", "Use escrow and RWA tools"],
                "What teams need",
                ["Policy checks", "Credential gates", "Spend limits", "Counterparty screening", "Audit receipts"],
            ),
            9,
        )
    )
    slides.append(
        (
            terminal_slide(
                3,
                total,
                "Skill surface",
                "npm run skill -- list",
                [("tools", "5"), ("runtime", "ok")],
                [
                    "trustrail_policy_manifest",
                    "trustrail_preflight",
                    "trustrail_attach_transaction",
                    "trustrail_verify_receipt",
                    "trustrail_x402_challenge",
                ],
            ),
            9,
        )
    )
    slides.append(
        (
            terminal_slide(
                4,
                total,
                "Allowed x402 preflight",
                "npm run skill -- trustrail_preflight @examples/preflight-x402.json",
                [("decision", allow["decision"]), ("asset", "USDC"), ("amount", "$42")],
                [
                    "COUNTERPARTY_OK",
                    "JURISDICTION_ALLOWED",
                    "SINGLE_LIMIT_OK",
                    "DAILY_LIMIT_OK",
                    "CREDENTIALS_PRESENT",
                    "receiptHash: " + allow["receipt"]["receiptHash"][:28] + "...",
                    allow["agentInstruction"],
                ],
            ),
            12,
        )
    )
    slides.append(
        (
            terminal_slide(
                5,
                total,
                "Blocked risky settlement",
                "npm run skill -- trustrail_preflight @examples/blocked-counterparty.json",
                [("decision", block["decision"]), ("risk", "blocked"), ("status", "preflight")],
                [
                    "COUNTERPARTY_BLOCKED",
                    "JURISDICTION_REVIEW",
                    "CREDENTIALS_MISSING",
                    "requiredProofs: zk_kyc, aml_screen",
                    "Do not sign or broadcast this action.",
                    "receiptHash: " + block["receipt"]["receiptHash"][:28] + "...",
                ],
            ),
            12,
        )
    )
    slides.append(
        (
            terminal_slide(
                6,
                total,
                "Policy-bound x402 challenge",
                "npm run skill -- trustrail_x402_challenge @examples/x402-challenge.json",
                [("decision", challenge["decision"]), ("chainId", "1672"), ("x402", "ok")],
                [
                    "resource: https://api.example.com/alpha/report",
                    "X-TrustRail-Policy: pharos-realfi-agent-v1",
                    "X-TrustRail-Agent: agent-steward-01",
                    "X-TrustRail-Receipt: " + challenge["challenge"]["receiptHash"][:24] + "...",
                    "X-TrustRail-Idempotency-Key: alpha-report-2026-06-17-agent-steward-01",
                ],
            ),
            12,
        )
    )
    slides.append((registry_slide(7, total), 9))
    slides.append(
        (
            title_slide(
                8,
                total,
                "Judging fit",
                "TrustRail is designed around Phase 1 Skill quality and Phase 2 Agent composability.",
                [
                    "Original: policy gateway before agent financial execution.",
                    "Useful: every payment, escrow, RWA, invoice, x402, or contract agent can call it.",
                    "Complete: tool schemas, CLI, tests, SDK, registry contract, examples, and docs.",
                ],
            ),
            10,
        )
    )
    slides.append((final_slide(9, total), 9))

    with imageio.get_writer(OUT_FILE, fps=FPS, codec="libx264", quality=8, macro_block_size=16) as writer:
        for img, seconds in slides:
            frame = img
            for _ in range(seconds * FPS):
                writer.append_data(np.asarray(frame))

    print(f"Wrote {OUT_FILE}")


if __name__ == "__main__":
    make_video()
