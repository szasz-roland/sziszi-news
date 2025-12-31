# 🚀 Sziszi News

<div align="center">



**Egy könnyűsúlyú, konténerizált hírapplikáció Node.js és Express.js alapokon, amely egyszerű webes felületen keresztül szolgáltat hírtartalmakat.**


</div>

## 📖 Áttekintés

A Sziszi News egy alapvető webes alkalmazás, amelyet hírtartalmak kiszolgálására terveztek. Egy robusztus Node.js backenddel rendelkezik, amely Express.js-re épül, és képes kezelni a hírcikkekre vonatkozó API kéréseket, valamint kiszolgálni egy statikus frontendet. A projekt a Docker és Docker Compose segítségével megvalósított konténerizációt hangsúlyozza a könnyű telepítés és üzembe helyezés érdekében, így ideális kiindulópont azon fejlesztők számára, akik egyszerű, önálló webalkalmazásokat szeretnének építeni és telepíteni.

## ✨ Funkciók

-   🎯 **Hír Cikk API**: Végpontokat biztosít a hírcikkek lekéréséhez és kezeléséhez.
-   🌐 **Statikus Webkiszolgálás**: Egy egyszerű, kliensoldali webes felületet (HTML, CSS, JavaScript) biztosít a hírek megjelenítéséhez.
-   💾 **Helyi Adattárolás**: Kezeli a híradatokat, fájlalapú adatbázis-megoldáson keresztül (pl. SQLite).
-   🐳 **Docker & Docker Compose**: Teljesen konténerizált beállítás az egyszerűsített fejlesztési és telepítési munkafolyamatokhoz.
-   ⚡ **Könnyűsúlyú és Hatékony**: Minimális technológiai stackre épült a gyors teljesítmény érdekében.


## 🛠️ Technológiai Stack

**Frontend:**

[![HTML](https://img.shields.io/badge/HTML-%23E34F26.svg?logo=html5&logoColor=white)](#)
[![CSS](https://img.shields.io/badge/CSS-639?logo=css&logoColor=fff)](#)
[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?logo=javascript&logoColor=000)](#)

**Backend:**

[![Node.js](https://img.shields.io/badge/Node.js-6DA55F?logo=node.js&logoColor=white)](#)
[![Express.js](https://img.shields.io/badge/Express.js-%23404d59.svg?logo=express&logoColor=%2361DAFB)](#)

**Adatbázis:**

[![JSON](https://img.shields.io/badge/JSON-000?logo=json&logoColor=fff)](#)

**DevOps:**

[![Docker](https://img.shields.io/badge/Docker-2496ED?logo=docker&logoColor=fff)](#)
![Docker Compose](https://img.shields.io/badge/Docker_Compose-2496ED?style=for-the-badge&logo=docker&logoColor=white)

## 🚀 Gyors Kezdés

Kövesse ezeket a lépéseket a fejlesztői környezet beállításához.

### Előfeltételek

Mielőtt elkezdené, győződjön meg arról, hogy az alábbiak telepítve vannak:
-   **Node.js**: `v14.x` vagy újabb (Ellenőrizze a `package.json` fájlt a specifikus verziókért, ha vannak).
-   **npm**: A Node.js-szel együtt érkezik.
-   **Docker**: Szükséges az alkalmazás Docker Compose-zal történő futtatásához.

### Telepítés

1.  **A repository klónozása**
    ```bash
    git clone [https://github.com/szasz-roland/sziszi-news.git](https://github.com/szasz-roland/sziszi-news.git)
    cd sziszi-news
    ```

2.  **Node.js függőségek telepítése**
    ```bash
    npm install
    ```

### Futtatás Docker Compose-zal

1.  **Szolgáltatások építése és indítása**
    ```bash
    docker-compose up --build -d
    ```

2.  **Nyissa meg a böngészőt**
    Látogasson el a `http://localhost:3000` címre (a `docker-compose.yml`-ben leképezett port).

## 📁 Projekt Szerkezete

```text
sziszi-news/
├── data/                  # Könyvtár a helyi adattároláshoz (pl. SQLite adatbázisfájl)
├── public/                # Statikus eszközök a frontendhez (HTML, CSS, JavaScript)
│   ├── index.html         # A webes felület fő HTML fájlja
│   └── ...                # Egyéb statikus fájlok
├── Dockerfile             # Docker image definíció a Node.js alkalmazáshoz
├── LICENSE                # A projekt MIT licence
├── README.md              # Ez a README fájl
├── server.js              # Fő Node.js/Express alkalmazás belépési pont és logika
├── package.json           # Node.js projekt konfiguráció és függőségi lista
├── package-lock.json      # A Node.js függőségek pontos verziói
└── docker-compose.yml     # Több konténeres Docker alkalmazás beállítása (app)
```

## ⚙️ Konfiguráció

### Környezeti Változók
Az alkalmazás környezeti változókat használ a konfigurációhoz. Helyi fejlesztéshez egy `.env` fájl használható a gyökérkönyvtárban ezen változók beállítására.

| Változó | Leírás | Alapértelmezett | Kötelező |
|----------|-------------|---------|----------|
| `PORT`     | A port, amelyen az Express szerver figyelni fog. | `3000`    | Igen      |


### Konfigurációs Fájlok
-   `package.json`: Kezeli a Node.js projekt metaadatait és függőségeit.
-   `Dockerfile`: Konfigurálja az alkalmazás Docker image-ét.
-   `docker-compose.yml`: Definiálja a szolgáltatásokat, hálózatokat és köteteket a több konténeres Docker alkalmazásokhoz.


## 📄 Licenc 

Ez a projekt az [MIT Licenc](LICENSE) alatt áll - a részletekért lásd a [LICENSE](LICENSE) fájlt.


## 🙏 Köszönetnyilvánítás

-   [Node.js](https://nodejs.org/) és [Express.js](https://expressjs.com/) alapokon.
-   A konténerizációt a [Docker](https://www.docker.com/) biztosítja.

## 📞 Támogatás és Kapcsolat

-   🐛 Problémák: [GitHub Issues](https://github.com/szasz-roland/sziszi-news/issues)

---

<div align="center">

**⭐ Csillagozd meg a repót, ha hasznosnak találod!**

Készítette ❤️-el: szasz-roland

</div>
