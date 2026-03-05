# ⚾ ScoreWire

A self-hosted baseball scorecard web app designed for youth baseball parents. Track your child's batting and pitching stats across an entire season, accessible from any device on your network.

---

## Features

- **Per-game batting tracking** — record every at-bat with outcome (single, double, triple, HR, walk, strikeout, error, etc.), RBI, runs, stolen bases
- **Per-batter pitching tracking** — log every batter faced with pitch count (balls, strikes, fouls, in-play), outcome, runs allowed, wild pitches, errors by position
- **Auto-calculated stats** — AVG, OBP, SLG, OPS, ERA, IP, Strike%, K%, and more computed automatically
- **Season stats** — cumulative stats across all games in the season
- **Game history** — browse and review any past game
- **Multi-player profiles** — each player has their own PIN-protected account; no one can see other players' data
- **Admin panel** — administrator can view all profiles and delete any account
- **Privacy-first login** — the login screen shows no player names; you type your name and PIN to access your own data
- **Mobile friendly** — responsive design works on phones, tablets, and desktops
- **No database required** — all data stored as JSON files on disk
- **Self-hosted** — runs entirely on your own server; no cloud, no subscriptions

---

## Tech Stack

- **Frontend** — Vanilla HTML/CSS/JS, single-file app
- **Backend** — Node.js + Express
- **Storage** — JSON files on disk
- **Container** — Docker

---

## Deployment on Unraid

### Prerequisites

- Unraid server with Docker enabled
- Access to the Unraid terminal
- A file manager or SSH to copy files to your server (e.g. Unraid's built-in file manager, WinSCP, or Cyberduck)

---

### Step 1 — Copy the project files to your server

On your Unraid server, create two folders:

- `/mnt/cache/appdata/scorewire/` — for the app files
- `/mnt/cache/appdata/scorewire-data/` — for player data (never deleted on updates)

> If your appdata share is on a different drive, replace `/mnt/cache/appdata/` with the correct path (e.g. `/mnt/user/appdata/`).

Copy the following files into `/mnt/cache/appdata/scorewire/`:

```
Dockerfile
package.json
server.js
public/
  index.html
```

---

### Step 2 — Build the Docker image

Open the Unraid terminal (click the `>_` icon in the top-right of the Unraid UI) and run:

```bash
cd /mnt/cache/appdata/scorewire && docker build -t scorewire .
```

This downloads Node.js and installs dependencies. It takes 1–2 minutes. When it finishes you will see `Successfully built`.

---

### Step 3 — Run the container

```bash
docker run -d \
  --name scorewire \
  --restart unless-stopped \
  -p 9999:3000 \
  -v /mnt/cache/appdata/scorewire-data:/data \
  -e ADMIN_PIN=YourSecretAdminPIN \
  scorewire
```

**Parameters:**

| Parameter | Description |
|-----------|-------------|
| `-p 9999:3000` | Exposes the app on port `9999`. Change the left number to any free port you prefer. |
| `-v .../scorewire-data:/data` | Mounts your data folder into the container. All player profiles and game data are saved here. |
| `-e ADMIN_PIN=...` | Sets the admin PIN. Choose something strong — this gives access to all player profiles. |

---

### Step 4 — Open the app

Find your Unraid server's local IP address:

```bash
ip addr | grep "inet " | grep -v 127
```

Then open a browser on any device on your network and go to:

```
http://YOUR-SERVER-IP:9999
```

---

### Step 5 — Create your first player profile

1. On the login screen, click **+ New Player**
2. Enter the player's name, team name (optional), and choose a PIN (minimum 4 digits)
3. Click **Create Profile**
4. You will be logged in automatically

Share the URL with other parents and have them create their own profiles. Each parent types their own player's name and PIN — no one can see any other player's name or data.

---

## Admin Panel

The admin panel lets you view all registered players and delete any profile.

To access it:
1. On the login screen, tap the small **⚙** icon at the very bottom of the page
2. Enter your `ADMIN_PIN`
3. You will see all registered players with the option to delete each one

> Deleting a player permanently removes all their game data. This cannot be undone.

---

## Managing the Container from the Unraid GUI

Once the container is running, you can manage it from the **Docker** tab in Unraid:

- **Start / Stop** — click the colored circle next to the container name
- **Logs** — click the container row → select **Logs**. You should see `⚾ ScoreWire v2.1 running on port 3000`
- **Auto-start on reboot** — the `--restart unless-stopped` flag handles this automatically

---

## Updating ScoreWire

When a new version is available:

1. Replace `index.html` and/or `server.js` in `/mnt/cache/appdata/scorewire/`
2. Rebuild the image:
```bash
cd /mnt/cache/appdata/scorewire && docker build -t scorewire .
```
3. Stop and remove the old container:
```bash
docker stop scorewire && docker rm scorewire
```
4. Start the new container (same run command as Step 3):
```bash
docker run -d \
  --name scorewire \
  --restart unless-stopped \
  -p 9999:3000 \
  -v /mnt/cache/appdata/scorewire-data:/data \
  -e ADMIN_PIN=YourSecretAdminPIN \
  scorewire
```

> Your player data in `scorewire-data/` is never affected by updates.

---

## Data Storage

All data is stored as plain JSON files in your mounted data folder:

```
scorewire-data/
  profiles.json          # All player profiles (names + hashed PINs)
  player_<id>.json       # One file per player containing all their game data
```

PINs are stored as SHA-256 hashes — they are never stored in plain text.

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Internal port the server listens on (don't change this) |
| `DATA_DIR` | `/data` | Path inside the container where data is stored (don't change this) |
| `ADMIN_PIN` | `scorewire-admin` | Admin panel PIN. **Always set this to something custom.** |

---

## Project Structure

```
scorewire/
├── Dockerfile          # Container definition
├── package.json        # Node.js dependencies
├── server.js           # Express API server
├── README.md           # This file
└── public/
    └── index.html      # Full frontend (single file)
```

## Screenshots

<img width="885" height="1092" alt="image" src="https://github.com/user-attachments/assets/c1a9e835-2478-4b12-836b-5607c8b06185" />

<img width="949" height="1181" alt="image" src="https://github.com/user-attachments/assets/053283e0-0776-4bee-9f15-68c266633bc0" />

<img width="3606" height="886" alt="image" src="https://github.com/user-attachments/assets/80661632-edc0-475f-9abe-7088aa9f3e39" />

<img width="3610" height="1415" alt="image" src="https://github.com/user-attachments/assets/08bf9b19-a06c-4d8e-92ef-68f049afd5fd" />

<img width="3607" height="1855" alt="image" src="https://github.com/user-attachments/assets/a1d67dd6-aa74-489a-8351-48cafa458a07" />

<img width="3612" height="557" alt="image" src="https://github.com/user-attachments/assets/848d602b-9962-466b-8986-27f542f3cc4f" />

<img width="3616" height="658" alt="image" src="https://github.com/user-attachments/assets/e3a902d5-fae9-4b2a-a83b-5d11f1b7e2f0" />

<img width="3599" height="602" alt="image" src="https://github.com/user-attachments/assets/6af4f4c2-5e61-4330-9505-5e6ae9efc79d" />











---
