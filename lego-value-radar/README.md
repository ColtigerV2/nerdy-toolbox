# LEGO Value Radar

Kleiner MVP-Prototyp fuer BrickLink-Haendler: Teilnummer eingeben, bekannte Farben abrufen und anhand des BrickLink Price Guides ein Farbranking berechnen.

## Ziel

Beim Vorsortieren von Kiloware soll schnell klar werden:

> Bei diesem LEGO-Teil sind diese Farben besonders interessant.

Beispiel:

```bash
python -m app.cli 3031 --condition U
```

Ausgabe: Farben sortiert nach einem einfachen Prioritaets-Score aus Preis und verkaufter Menge.

## Status

MVP / Projektgeruest. Noch nicht produktiv. Die BrickLink-Zugangsdaten muessen in einer `.env` hinterlegt werden.

## Features im MVP

- BrickLink OAuth-1.0a Client
- Known-Colors-Abfrage fuer ein Teil
- Sold-Price-Guide pro Teil + Farbe
- SQLite-Cache fuer Preis-Snapshots
- CLI fuer schnelles Testen
- kleine FastAPI-Webapp mit Suchformular

## Setup

```bash
cd lego-value-radar
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\\Scripts\\activate
pip install -r requirements.txt
cp .env.example .env
```

Dann `.env` ausfuellen:

```env
BRICKLINK_CONSUMER_KEY=...
BRICKLINK_CONSUMER_SECRET=...
BRICKLINK_TOKEN=...
BRICKLINK_TOKEN_SECRET=...
BRICKLINK_CURRENCY=EUR
```

## CLI nutzen

```bash
python -m app.cli 3031 --condition U --limit 20
```

Condition:

- `U` = used / gebraucht
- `N` = new / neu

## Webapp starten

```bash
uvicorn app.main:app --reload
```

Dann im Browser oeffnen:

```text
http://127.0.0.1:8000
```

## Score-Logik

Der MVP nutzt bewusst eine einfache Formel:

```text
score = qty_avg_price * log(total_quantity + 1)
```

Warum nicht nur der hoechste Preis?

Ein Teil kann teuer gelistet sein, aber kaum gehandelt werden. Der Score bevorzugt deshalb Farben, die wertvoll sind und in den letzten 6 Monaten tatsaechlich verkauft wurden.

## Naechste Schritte

- bessere Teile-Suche nach Name statt nur Part-No
- Rebrickable-Katalogdaten fuer Teilnamen und Farben ergaenzen
- CSV-Export
- Favoritenliste fuer haeufig sortierte Teile
- Preisverlauf ueber mehrere Snapshots
- PWA-Version fuer Handy/Tablet
