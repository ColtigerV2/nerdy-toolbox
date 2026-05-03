from __future__ import annotations

from dataclasses import asdict

from fastapi import FastAPI, Form, Request
from fastapi.responses import HTMLResponse

from .bricklink_client import BrickLinkClient, BrickLinkError
from .config import get_settings
from .database import connect, save_rankings
from .service import rank_part_colors

app = FastAPI(title="LEGO Value Radar")

HTML_TEMPLATE = """
<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>LEGO Value Radar</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 1100px; margin: 32px auto; padding: 0 16px; }
    form { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 24px; }
    input, select, button { font: inherit; padding: 10px 12px; }
    button { cursor: pointer; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border-bottom: 1px solid #ddd; padding: 10px; text-align: right; }
    th:first-child, td:first-child { text-align: left; }
    .error { background: #ffe5e5; padding: 12px; border-radius: 8px; }
    .hint { color: #555; }
  </style>
</head>
<body>
  <h1>LEGO Value Radar</h1>
  <p class="hint">BrickLink-Teilnummer eingeben und Farben nach Wertigkeit sortieren.</p>

  <form method="post" action="/rank">
    <input name="part_no" placeholder="Teilnummer, z. B. 3031" value="{part_no}" required>
    <select name="condition">
      <option value="U" {used_selected}>gebraucht</option>
      <option value="N" {new_selected}>neu</option>
    </select>
    <input name="limit" type="number" min="1" max="100" value="{limit}">
    <button type="submit">Ranking laden</button>
  </form>

  {content}
</body>
</html>
"""


def render_page(content: str = "", part_no: str = "", condition: str = "U", limit: int = 25) -> HTMLResponse:
    html = HTML_TEMPLATE.format(
        content=content,
        part_no=part_no,
        limit=limit,
        used_selected="selected" if condition == "U" else "",
        new_selected="selected" if condition == "N" else "",
    )
    return HTMLResponse(html)


@app.get("/", response_class=HTMLResponse)
def index(request: Request) -> HTMLResponse:
    return render_page()


@app.post("/rank", response_class=HTMLResponse)
def rank(part_no: str = Form(...), condition: str = Form("U"), limit: int = Form(25)) -> HTMLResponse:
    settings = get_settings()
    try:
        client = BrickLinkClient(settings)
        rankings = rank_part_colors(client, part_no.strip(), condition=condition, limit=limit)
        conn = connect(settings.database_path)
        save_rankings(conn, rankings)
    except BrickLinkError as exc:
        return render_page(f"<div class='error'>{exc}</div>", part_no, condition, limit)
    except Exception as exc:
        return render_page(f"<div class='error'>Unexpected error: {exc}</div>", part_no, condition, limit)

    if not rankings:
        return render_page("<p>No price data found.</p>", part_no, condition, limit)

    rows = "\n".join(
        f"<tr><td>{item.color_name}</td><td>{item.qty_avg_price:.2f} {item.currency}</td><td>{item.total_quantity}</td><td>{item.unit_quantity}</td><td>{item.score:.2f}</td></tr>"
        for item in rankings
    )
    table = f"""
    <table>
      <thead><tr><th>Farbe</th><th>Qty Avg</th><th>Sold Qty</th><th>Units</th><th>Score</th></tr></thead>
      <tbody>{rows}</tbody>
    </table>
    """
    return render_page(table, part_no, condition, limit)


@app.get("/api/rank/{part_no}")
def rank_api(part_no: str, condition: str = "U", limit: int = 25) -> dict:
    settings = get_settings()
    client = BrickLinkClient(settings)
    rankings = rank_part_colors(client, part_no.strip(), condition=condition, limit=limit)
    conn = connect(settings.database_path)
    save_rankings(conn, rankings)
    return {"part_no": part_no, "condition": condition, "results": [asdict(item) for item in rankings]}
