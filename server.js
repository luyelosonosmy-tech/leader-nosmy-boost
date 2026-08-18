const express = require("express");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;

/* ========================================
   CONFIGURATION
======================================== */

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

const USERS_FILE = path.join(__dirname, "users.json");
const ORDERS_FILE = path.join(__dirname, "orders.json");
const DEPOSITS_FILE = path.join(__dirname, "deposits.json");
const PRINCE_FILE = path.join(__dirname, "prince.json");

/* ========================================
   FICHIERS
======================================== */

function ensureFile(file, defaultData) {
  if (!fs.existsSync(file)) {
    fs.writeFileSync(
      file,
      JSON.stringify(defaultData, null, 2),
      "utf8"
    );
  }
}

ensureFile(USERS_FILE, []);
ensureFile(ORDERS_FILE, []);
ensureFile(DEPOSITS_FILE, []);

/* ========================================
   JSON
======================================== */

function readJson(file, fallback) {
  try {
    if (!fs.existsSync(file)) {
      return fallback;
    }

    const content = fs.readFileSync(file, "utf8");

    if (!content.trim()) {
      return fallback;
    }

    return JSON.parse(content);

  } catch (error) {
    console.error("ERREUR JSON:", file, error);
    return fallback;
  }
}

function writeJson(file, data) {
  fs.writeFileSync(
    file,
    JSON.stringify(data, null, 2),
    "utf8"
  );
}

/* ========================================
   ID
======================================== */

function generateId(prefix) {
  return (
    prefix +
    "_" +
    Date.now() +
    "_" +
    crypto.randomBytes(4).toString("hex")
  );
}

/* ========================================
   PASSWORD
======================================== */

function hashPassword(password) {
  return crypto
    .createHash("sha256")
    .update(String(password))
    .digest("hex");
}

/* ========================================
   SERVICES
======================================== */

function getServices() {

  try {

    if (!fs.existsSync(PRINCE_FILE)) {

      console.error(
        "❌ prince.json introuvable:",
        PRINCE_FILE
      );

      return {};
    }

    const content =
      fs.readFileSync(
        PRINCE_FILE,
        "utf8"
      );

    if (!content.trim()) {

      console.error(
        "❌ prince.json est vide."
      );

      return {};
    }

    const services =
      JSON.parse(content);

    if (
      !services ||
      typeof services !== "object" ||
      Array.isArray(services)
    ) {

      console.error(
        "❌ Format prince.json invalide."
      );

      return {};
    }

    console.log(
      "✅ Services chargés:",
      Object.keys(services)
    );

    return services;

  } catch (error) {

    console.error(
      "❌ ERREUR prince.json:",
      error
    );

    return {};
  }
}

/* ========================================
   USER SÉCURISÉ
======================================== */

function safeUser(user) {

  if (!user) {
    return null;
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    balance: Number(user.balance || 0),
    createdAt: user.createdAt
  };
}

/* ========================================
   PAGE PRINCIPALE
======================================== */

app.get("/", (req, res) => {

  res.sendFile(
    path.join(
      __dirname,
      "index.html"
    )
  );

});

/* ========================================
   HEALTH
======================================== */

app.get("/api/health", (req, res) => {

  res.json({

    success: true,

    message:
      "LEADER NOSMY BOOST fonctionne correctement 🚀",

    server: true

  });

});

/* ========================================
   SERVICES
======================================== */

app.get("/api/services", (req, res) => {

  try {

    const services =
      getServices();

    return res.json({

      success: true,

      services

    });

  } catch (error) {

    console.error(
      "SERVICES ERROR:",
      error
    );

    return res.status(500).json({

      success: false,

      message:
        "Impossible de récupérer les services."

    });

  }

});

/* ========================================
   DIAGNOSTIC SERVICES
======================================== */

app.get(
  "/api/debug/services",
  (req, res) => {

    const services =
      getServices();

    const platforms =
      Object.keys(services);

    let total = 0;

    for (
      const platform of platforms
    ) {

      if (
        Array.isArray(
          services[platform]
        )
      ) {

        total +=
          services[platform].length;

      }

    }

    res.json({

      success: true,

      princeFile:
        PRINCE_FILE,

      princeExists:
        fs.existsSync(
          PRINCE_FILE
        ),

      platforms,

      servicesCount:
        total

    });

  }
);

/* ========================================
   INSCRIPTION
======================================== */

app.post(
  "/api/register",
  (req, res) => {

    try {

      const name =
        String(
          req.body.name || ""
        ).trim();

      const email =
        String(
          req.body.email || ""
        )
        .trim()
        .toLowerCase();

      const password =
        String(
          req.body.password || ""
        );

      if (
        !name ||
        !email ||
        !password
      ) {

        return res.status(400).json({

          success: false,

          message:
            "Remplis tous les champs."

        });

      }

      if (
        password.length < 6
      ) {

        return res.status(400).json({

          success: false,

          message:
            "Le mot de passe doit contenir au moins 6 caractères."

        });

      }

      const users =
        readJson(
          USERS_FILE,
          []
        );

      const existingUser =
        users.find(
          user =>
            String(
              user.email || ""
            )
              .trim()
              .toLowerCase() ===
            email
        );

      if (existingUser) {

        return res.status(409).json({

          success: false,

          message:
            "Cette adresse e-mail existe déjà."

        });

      }

      const user = {

        id:
          generateId("user"),

        name,

        email,

        password:
          hashPassword(
            password
          ),

        balance: 0,

        createdAt:
          new Date().toISOString()

      };

      users.push(user);

      writeJson(
        USERS_FILE,
        users
      );

      console.log(
        "✅ COMPTE CRÉÉ:",
        email
      );

      return res.status(201).json({

        success: true,

        message:
          "Compte créé avec succès 🎉",

        user:
          safeUser(user)

      });

    } catch (error) {

      console.error(
        "REGISTER ERROR:",
        error
      );

      return res.status(500).json({

        success: false,

        message:
          "Erreur du serveur pendant la création du compte."

      });

    }

  }
);

/* ========================================
   CONNEXION
======================================== */

app.post(
  "/api/login",
  (req, res) => {

    try {

      const email =
        String(
          req.body.email || ""
        )
        .trim()
        .toLowerCase();

      const password =
        String(
          req.body.password || ""
        );

      if (
        !email ||
        !password
      ) {

        return res.status(400).json({

          success: false,

          message:
            "E-mail et mot de passe obligatoires."

        });

      }

      const users =
        readJson(
          USERS_FILE,
          []
        );

      const passwordHash =
        hashPassword(
          password
        );

      const user =
        users.find(
          item =>
            String(
              item.email || ""
            )
              .trim()
              .toLowerCase() ===
            email &&
            item.password ===
            passwordHash
        );

      if (!user) {

        return res.status(401).json({

          success: false,

          message:
            "E-mail ou mot de passe incorrect."

        });

      }

      return res.json({

        success: true,

        message:
          "Connexion réussie.",

        user:
          safeUser(user)

      });

    } catch (error) {

      console.error(
        "LOGIN ERROR:",
        error
      );

      return res.status(500).json({

        success: false,

        message:
          "Erreur du serveur."

      });

    }

  }
);

/* ========================================
   UTILISATEUR
======================================== */

app.get(
  "/api/user/:id",
  (req, res) => {

    try {

      const users =
        readJson(
          USERS_FILE,
          []
        );

      const user =
        users.find(
          item =>
            item.id ===
            req.params.id
        );

      if (!user) {

        return res.status(404).json({

          success: false,

          message:
            "Utilisateur introuvable."

        });

      }

      return res.json({

        success: true,

        user:
          safeUser(user)

      });

    } catch (error) {

      console.error(
        "USER ERROR:",
        error
      );

      return res.status(500).json({

        success: false,

        message:
          "Erreur du serveur."

      });

    }

  }
);

/* ========================================
   DÉPÔT
======================================== */

app.post(
  "/api/deposit",
  (req, res) => {

    try {

      const userId =
        String(
          req.body.userId || ""
        );

      const amount =
        Number(
          req.body.amount
        );

      const method =
        String(
          req.body.method || ""
        ).trim();

      const transactionId =
        String(
          req.body.transactionId || ""
        ).trim();

      if (!userId) {

        return res.status(400).json({

          success: false,

          message:
            "Utilisateur invalide."

        });

      }

      if (
        !Number.isFinite(amount) ||
        amount < 1000
      ) {

        return res.status(400).json({

          success: false,

          message:
            "Le dépôt minimum est de 1 000 FC."

        });

      }

      if (!method) {

        return res.status(400).json({

          success: false,

          message:
            "Choisis un moyen de paiement."

        });

      }

      const users =
        readJson(
          USERS_FILE,
          []
        );

      const user =
        users.find(
          item =>
            item.id === userId
        );

      if (!user) {

        return res.status(404).json({

          success: false,

          message:
            "Utilisateur introuvable."

        });

      }

      const deposits =
        readJson(
          DEPOSITS_FILE,
          []
        );

      const deposit = {

        id:
          generateId("deposit"),

        userId,

        userName:
          user.name,

        userEmail:
          user.email,

        amount,

        method,

        transactionId,

        status:
          "pending",

        createdAt:
          new Date().toISOString()

      };

      deposits.push(
        deposit
      );

      writeJson(
        DEPOSITS_FILE,
        deposits
      );

      return res.json({

        success: true,

        message:
          "Demande de dépôt envoyée avec succès.",

        deposit

      });

    } catch (error) {

      console.error(
        "DEPOSIT ERROR:",
        error
      );

      return res.status(500).json({

        success: false,

        message:
          "Erreur pendant la demande de dépôt."

      });

    }

  }
);

/* ========================================
   COMMANDE
======================================== */

app.post(
  "/api/order",
  (req, res) => {

    try {

      const userId =
        String(
          req.body.userId || ""
        );

      const serviceId =
        String(
          req.body.serviceId || ""
        );

      const link =
        String(
          req.body.link || ""
        ).trim();

      const quantity =
        Number(
          req.body.quantity
        );

      if (
        !userId ||
        !serviceId ||
        !link
      ) {

        return res.status(400).json({

          success: false,

          message:
            "Informations de commande invalides."

        });

      }

      if (
        !Number.isFinite(
          quantity
        ) ||
        quantity < 1000
      ) {

        return res.status(400).json({

          success: false,

          message:
            "La quantité minimum est de 1 000."

        });

      }

      const users =
        readJson(
          USERS_FILE,
          []
        );

      const user =
        users.find(
          item =>
            item.id === userId
        );

      if (!user) {

        return res.status(404).json({

          success: false,

          message:
            "Utilisateur introuvable."

        });

      }

      const services =
        getServices();

      let selectedService =
        null;

      let selectedPlatform =
        "";

      for (
        const platform of
        Object.keys(services)
      ) {

        const list =
          Array.isArray(
            services[platform]
          )
            ? services[platform]
            : [];

        const found =
          list.find(
            service =>
              String(
                service.id
              ) === serviceId
          );

        if (found) {

          selectedService =
            found;

          selectedPlatform =
            platform;

          break;

        }

      }

      if (!selectedService) {

        return res.status(404).json({

          success: false,

          message:
            "Service introuvable."

        });

      }

      const servicePrice =
        Number(
          selectedService.price || 0
        );

      const totalPrice =
        (
          servicePrice *
          quantity
        ) / 1000;

      const balance =
        Number(
          user.balance || 0
        );

      if (
        balance <
        totalPrice
      ) {

        return res.status(400).json({

          success: false,

          message:
            "Solde insuffisant. Fais un dépôt avant de commander."

        });

      }

      user.balance =
        balance -
        totalPrice;

      writeJson(
        USERS_FILE,
        users
      );

      const orders =
        readJson(
          ORDERS_FILE,
          []
        );

      const order = {

        id:
          generateId("order"),

        userId,

        userName:
          user.name,

        userEmail:
          user.email,

        serviceId,

        serviceName:
          selectedService.name ||
          "Service",

        platform:
          selectedPlatform,

        link,

        quantity,

        price:
          totalPrice,

        status:
          "pending",

        createdAt:
          new Date().toISOString()

      };

      orders.push(
        order
      );

      writeJson(
        ORDERS_FILE,
        orders
      );

      return res.json({

        success: true,

        message:
          "Commande créée avec succès 🚀",

        order,

        user:
          safeUser(user)

      });

    } catch (error) {

      console.error(
        "ORDER ERROR:",
        error
      );

      return res.status(500).json({

        success: false,

        message:
          "Erreur pendant la création de la commande."

      });

    }

  }
);

/* ========================================
   COMMANDES
======================================== */

app.get(
  "/api/orders/:userId",
  (req, res) => {

    try {

      const orders =
        readJson(
          ORDERS_FILE,
          []
        );

      const userOrders =
        orders
          .filter(
            order =>
              order.userId ===
              req.params.userId
          )
          .reverse();

      return res.json({

        success: true,

        orders:
          userOrders

      });

    } catch (error) {

      console.error(
        "ORDERS ERROR:",
        error
      );

      return res.status(500).json({

        success: false,

        message:
          "Impossible de charger les commandes."

      });

    }

  }
);

/* ========================================
   ROUTES API INCONNUES
======================================== */

app.use(
  (req, res) => {

    if (
      req.path.startsWith(
        "/api/"
      )
    ) {

      return res.status(404).json({

        success: false,

        message:
          "Route API introuvable."

      });

    }

    res.sendFile(
      path.join(
        __dirname,
        "index.html"
      )
    );

  }
);

/* ========================================
   DÉMARRAGE
======================================== */

app.listen(
  PORT,
  () => {

    console.log(
      "========================================"
    );

    console.log(
      "🚀 LEADER NOSMY BOOST"
    );

    console.log(
      "📁 PRINCE:",
      PRINCE_FILE
    );

    console.log(
      "📦 PORT:",
      PORT
    );

    console.log(
      "========================================"
    );

  }
);
