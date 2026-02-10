# TV Hírközlő – Technikai Funkciók

## Szerepek és hozzáférések
| Szerep       | Hírek létrehozás/törlés | Beállítások tab | Felhasználók tab | Napló tab | Gombok | Megjegyzés |
|--------------|-------------------------|-----------------|------------------|-----------|--------|------------|
| Superadmin   | Igen                    | Igen            | Igen             | Igen      | Minden engedélyezve | Csak a `sziszi` felhasználó, audit látható |
| Admin        | Igen                    | Igen            | Igen             | Nem       | Minden engedélyezve | Teljes hozzáférés audit nélkül |
| User         | Igen                    | Igen            | Nem (rejtve)     | Nem       | Publish/Delete engedélyezett | Csak hírek kezelése |
| Monitor      | Nem (űrlap letiltva)    | Nem (rejtve)    | Nem (rejtve)     | Nem       | Minden művelet tiltva | Csak megtekintés |

## Adattárolás
- Hírek: `public/data/news.json`
- Felhasználók: `public/data/users.json` ("sziszi" törlése tiltott; utolsó user törlése tiltott; sziszi mindig superadmin)
- Beállítások: `public/data/settings.json`
- Napló: `public/data/audit.json` (max ~500 bejegyzésre vágva)
- Feltöltések: `public/uploads/images`, `public/uploads/videos`, `public/uploads/docs`

## API végpontok (server.js)
- `POST /api/login` – user/pass ellenőrzés `users.json` alapján; válasz: `{ success, role }`
- `GET /api/news` – hírek listázása
- `POST /api/news` – teljes lista mentése, típusonkénti validációval
- `DELETE /api/news/:id` – elem törlése + kapcsolt média törlése (image/video/attachment/galléria)
- `DELETE /api/news` – összes hír törlése + média takarítás
- `POST /api/upload/image|video|document` – fájlfeltöltés típus szerint
- `GET /api/settings` / `POST /api/settings` – óra megjelenítés flag
- `GET /api/users` – felhasználók listája (username, role)
- `POST /api/users` – új user (admin/user/monitor, sziszi mindig superadmin)
- `PUT /api/users/:username` – user módosítása
- `DELETE /api/users/:username` – user törlés (védett/utolsó felhasználó nem törölhető)
- `GET /api/audit` – napló bejegyzések lekérése (superadmin részére)
- `POST /api/audit` – napló bejegyzés rögzítése (login, közzététel stb.)

## Validációk és korlátok (hír létrehozás)
- Cím hossz: Hír 30, Videó 15, Képek 50.
- Törzs: max 800 karakter (Hír); Videó/Képek/Táblázat nem kér törzset.
- Videó: fájl kötelező.
- Táblázat: dokumentum kötelező.
- Album: képszám nincs limitálva, de törléskor minden kapcsolt kép törlődik.

## Táblázatos tartalom
- Beolvasott táblázatból csak az első 16 sor jelenik meg (fejléc + 15 adat). Szöveges dokumentum fallback: egysoros oszlop, ugyanígy 16 soros limit.

## Feltöltés és tisztítás
- Képek/videók/docok `public/uploads/...` alá kerülnek.
- Hír törlésekor minden kapcsolt fájl törlődik (image, gallery images, attachment).

## Admin UI (public/admin.html)
- Tabs: Hírek / Beállítások / Felhasználók / Napló (Napló csak superadminnak).
- Fejléc badge mutatja a bejelentkezett felhasználót és szerepet; oldalsáv desktopon fix.
- Téma: alapértelmezett sötét, váltható világosra a Beállításokban.
- Hírlap létrehozó űrlap típusfüggő mezőkkel és feltöltésekkel; publikálás a bejelentkezett felhasználóhoz kötve.
- Lista: típuscímke, fontos jelölés, táblázatoknál táblázatnézet; törlés gomb csak admin/user/superadmin szerepnél.
- Felhasználótörlés megerősítést kér; sziszi nem törölhető.
- Napló: bejelentkezések és közzétételek időbélyeggel, csak superadmin számára.

## Megjelenítő UI (public/index.html)
- Módok: Hír, Képek (teljes galéria bejárással), Videó (autoplay, mute), Táblázat (16 sor limit).
- Fontos jelölések kiemelve.
- Fix sötét téma, óra megjelenítés kapcsolható.


