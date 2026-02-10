# Sziszi News

Képernyős hírkijelző Node.js/Express alapon, admin felülettel és szerepkörökkel. Dockerrel futtatható, fájlrendszeres tárolással.

## Fő funkciók
- Hírek: szöveg, képgaléria, videó, táblázat (16 soros limit), fontos jelölés.
- Feltöltések: képek/videók/docs automatikus mentése, törléskor média takarítás.
- Szerepkörök: superadmin (csak `sziszi`, audit látható), admin, user, monitor (view-only).
- Beállítások: óra megjelenítés, téma (sötét alapértelmezett / világos), fixed sidebar desktopon.
- Napló: bejelentkezések és közzétételek auditja (csak superadmin látja).
- Védelem: `sziszi` nem törölhető; utolsó felhasználó nem törölhető; user törléshez megerősítés.

## Gyors indítás
```bash
# függőségek
npm install

# fejlesztői futtatás
npm start  # alap: http://localhost:3000

# Docker (ha docker compose v2 elérhető)

```

## Adatok és tárolás
- Hírek: `public/data/news.json`
- Felhasználók: `public/data/users.json` (sziszi mindig superadmin)
- Beállítások: `public/data/settings.json` (showClock, theme)
- Napló: `public/data/audit.json` (max ~500 bejegyzés)
- Média: `public/uploads/images`, `public/uploads/videos`, `public/uploads/docs`

Perzisztencia konténerben: kösd ezeket volume-ra.

## API röviden
- `POST /api/login` (válasz: role)
- `GET/POST/DELETE /api/news` (+ `/api/news/:id`)
- `POST /api/upload/image|video|document`
- `GET/POST /api/settings`
- `GET/POST/PUT/DELETE /api/users` (superadmin csak sziszi)
- `GET/POST /api/audit` (audit csak superadmin láthatja)

## Admin felület
- Elérés: `/admin`
- Tabs: Hírek, Beállítások, Felhasználók, Napló (csak superadmin)
- Téma váltó, óra kapcsoló, user törlés megerősítéssel.

## Build/Deploy tippek
- Prod előtt tegyél reverse proxy-t (Nginx/Traefik) TLS-sel, IP-szűréssel az `/admin`-ra.
- Állíts be `client_max_body_size`-t és rate limitet a loginra.

## Licenc
MIT – lásd [LICENSE](LICENSE).
Mielőtt elkezdené, győződjön meg arról, hogy az alábbiak telepítve vannak:
