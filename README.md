# Digital Factory Lab – Robot Dashboard

Dashboard for the robots in the Digital Factory Lab at FH Technikum Wien.

- **Robots tab** – one tile per robot. Clicking a tile opens its setup guide in a Sphinx-style reader (table of contents, breadcrumbs, admonitions, code blocks, previous/next).
- **Availability tab** – colour-coded, read-only board shared by everyone in the lab:
  - 🟢 **Free** – ready to book
  - 🟡 **Busy** – in use by a named person ("Used by Person XYZ")
  - 🔴 **Occupied** – maintenance, a course, or out of service (with a reason)

- **Admin panel** (`/admin/`) – where the lab admin sets each robot to Free, Busy (with the person's name) or Occupied.

© Dr. Kannan Peesapati

---

## Project structure

```
robot-lab/
├── frontend/                 Static dashboard (no build step)
│   ├── index.html
│   ├── css/styles.css        Colours, fonts, light/dark theme
│   ├── js/robots.js          ← robot list (name, specs, IP, docFile)
│   ├── js/app.js             Tabs, routing, Markdown docs renderer, status board
│   ├── docs/                 ← one Markdown setup guide per robot (edit these)
│   │   ├── _TEMPLATE.md      Starting point for a new robot
│   │   ├── ur5e.md  kr6.md  yumi.md  fr3.md  crx.md
│   │   └── mir.md  ned2.md  rebel.md  turtlebot3.md
│   └── assets/fhtw-logo.png  Header logo; Robot images etc, check the correspoding paths at ./js/robots.js
├── admin/                    ← admin panel, served at /admin/
│   ├── index.html
│   ├── admin.js              Sign-in, per-robot status editing, "Set all to Free"
│   └── admin.css
├── backend/
│   ├── app.py                Flask server: serves frontend + status API
│   ├── requirements.txt
│   └── data/
│       ├── status.seed.json  Starting status (3 robots busy with Person XYZ)
│       └── status.json       Live status, created on first start
├── Dockerfile
├── docker-compose.yml
└── README.md
```

## Run locally (development)

```bash
cd backend
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

- Dashboard: <http://localhost:8080>
- Admin panel: <http://localhost:8080/admin/>

`python app.py` starts in **development mode**: the admin token is not checked, the admin panel opens without signing in, and it shows a yellow *Development mode* banner. Other PCs on the lab network use `http://<server-ip>:8080`.

### Testing with the token

```bash
LAB_DEV_MODE=0 LAB_ADMIN_TOKEN=your-secret python app.py
# Windows: set LAB_DEV_MODE=0 && set LAB_ADMIN_TOKEN=your-secret && python app.py
```

Without `LAB_ADMIN_TOKEN` the token is `fhtw-admin`.

## Run with Docker

```bash
docker compose up -d --build
```

Docker runs with gunicorn, so development mode is **off** and the admin token is required. Change `LAB_ADMIN_TOKEN` in `docker-compose.yml` first. Status data is kept in the `lab-data` volume, so it survives restarts.

## Frontend only (no server)

Hosting the `frontend` folder on any static web server also works (for a quick test: `cd frontend && python -m http.server 8080`). Opening `index.html` by double-clicking does not work for the setup guides, because browsers block reading local files; use a web server. Without the API the badge shows **Local only** and status changes are saved in that browser only.

## Managing robot usage (admin)

1. Open `/admin/` and sign in with the admin token (skipped in development mode).
2. For each robot choose **Free**, **Busy** or **Occupied**:
   - **Busy** needs the name of the person using the robot (for example *Person XYZ*) and an optional note.
   - **Occupied** takes a reason, for example *Maintenance* or *Lecture RO3 until 16:00*.
3. Click **Save** on the row (or press Enter). Every open dashboard updates within 5 seconds.

**Set all to Free** releases every robot at once, for example at the end of a lab day.

The token is kept only for the browser session. Use **Sign out** on shared PCs.

### Starting status

On the first start, `backend/data/status.seed.json` is copied to `status.json`. It marks three robots busy with *Person XYZ* (KUKA AGILUS, Franka FR3, TurtleBot3). To start with every robot free, delete the seed file or click **Set all to Free** in the admin panel.

### Letting everyone book robots

By default only the admin can change the status, and the main board is read-only. To let everyone book robots from the dashboard, start the server with `LAB_PUBLIC_EDIT=1`.

## Status API

| Method | Path | Auth | Body / result |
|---|---|---|---|
| `GET` | `/api/status` | – | `{ "kr6": { "state": "use", "person": "Person XYZ", "note": "…", "since": 1730640000000 } }` – robots not listed are free |
| `GET` | `/api/config` | – | `{ "publicEdit": false }` |
| `GET` | `/api/health` | – | `{ "ok": true }` |
| `POST` | `/api/admin/login` | token | `200` if the token is valid, `403` otherwise |
| `PUT` | `/api/status/<robot-id>` | token¹ | `{ "state": "free" \| "use" \| "occ", "person": "…", "note": "…" }` |
| `POST` | `/api/admin/reset` | token | Sets every robot to free |

Send the token as the `X-Lab-Token` header. ¹ No token needed when `LAB_PUBLIC_EDIT=1`. In development mode no endpoint needs a token, and `/api/config` returns `"devMode": true`.

## Editing robots and documentation

### Setup guides

Every robot's setup guide is a Markdown file in `frontend/docs/`. Edit the file and reload the page; no code changes are needed.

The Markdown is rendered in a Sphinx-style reader:

- `#` becomes the page title, `##` and `###` headings fill the sidebar table of contents
- fenced code blocks get a language label and a Copy button
- `> **Note:** …` becomes a Note box, `> **Warning:** …` a Warning box
- a heading starting with `!!!` becomes a Tip box
- an italic line starting with *Expected …* is shown as an expected result
- tables scroll sideways on small screens

All guides follow the same sections: robot data and addressing, safety checks, power-up, network configuration, software installation, verification, a test script, shutdown and troubleshooting.

> Apart from `turtlebot3.md`, the guides describe typical setups for each robot model with example IP addresses, frames and credentials. Check every value against the lab's real equipment before use.

### Robot list

The tiles and the availability board are built from `frontend/js/robots.js`:

```js
{ id:"ur5e",                    // unique, letters/digits only – used in URLs (#doc-ur5e) and the API
  name:"UR5e", maker:"Universal Robots", type:"Collaborative arm", cell:"CELL A1",
  axes:6, payload:"5 kg", reach:"850 mm", repeat:"±0.03 mm",
  ctrl:"CB5 / e-Series", ip:"192.168.10.11", sw:"PolyScope 5.x", sdk:"ur_rtde (Python)",
  art:"arm",                    // tile drawing: arm | arm7 | dual | amr | tb
  docFile:"docs/ur5e.md"        // setup guide (defaults to docs/<id>.md)
}
```

### Adding a robot

1. Copy `frontend/docs/_TEMPLATE.md` to `frontend/docs/<id>.md` and fill it in.
2. Add an entry with the same `id` to `frontend/js/robots.js`.
3. Add an images to the `frontend/assets/robots/<robot_name>.png`
4. Associate the image path with the same `art` in the function `window.LAB_ART` at `frontend/js/robots.js`


## Direct links

- `#fleet` – robot tiles
- `#status` – availability board
- `#doc-<robot-id>` – a robot's setup guide, e.g. `#doc-kr6`
- `/admin/` – admin panel
