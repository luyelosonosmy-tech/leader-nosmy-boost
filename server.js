const express = require("express");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const SMM_API_KEY = process.env.SMM_API_KEY;

const app = express();
const PORT = process.env.PORT || 3000;

const USERS_FILE = path.join(__dirname, "users.json");
const ORDERS_FILE = path.join(__dirname, "orders.json");

const MIN_DEPOSIT = 1000;

const PAYMENT_METHODS = [
  "Orange Money",
  "Airtel Money",
  "Vodacom M-Pesa"
];

/* =====================================================
   LEADER NOSMY BOOST
   FORMULES OFFICIELLES
===================================================== */

const SERVICES = {

  "Facebook - 1K Likes": {
    name: "Facebook - 1K J'AIME",
    quantity: 1000,
    price: 1500,

    /*
      METTRE ICI LE SERVICE ID SMM AFRICA
      quand tu me le donneras.
    */
    smmServiceId: null
  },

  "Facebook - 2K Likes": {
    name: "Facebook - 2K J'AIME",
    quantity: 2000,
    price: 3000,
    smmServiceId: null
  },

  "Facebook - 3K Likes": {
    name: "Facebook - 3K J'AIME",
    quantity: 3000,
    price: 4500,
    smmServiceId: null
  },

  "Facebook - 1K Followers": {
    name: "Facebook - 1K ABONNÉS",
    quantity: 1000,
    price: 8000,
    smmServiceId: null
  },

  "TikTok - 1K Abonnés": {
    name: "TikTok - 1K ABONNÉS",
    quantity: 1000,
    price: 8000,
    smmServiceId: null
  },

  "TikTok - 1K Vues + 1K Likes": {
    name: "TikTok - 1K VUES + 1K J'AIME",
    quantity: 1000,
    price: 6000,
    smmServiceId: null
  },

  "Instagram - 1K Followers": {
    name: "Instagram - 1K ABONNÉS",
    quantity: 1000,
    price: 8000,
    smmServiceId: null
  },

  "YouTube - 1K Abonnés": {
    name: "YouTube - 1K ABONNÉS",
    quantity: 1000,
    price: 9000,
    smmServiceId: null
  },

  "YouTube - 1K Vues": {
    name: "YouTube - 1K VUES",
    quantity: 1000,
    price: 5000,
    smmServiceId: null
  },

  "Affiche Anniversaire": {
    name: "AFFICHE ANNIVERSAIRE",
    quantity: 1,
    price: 5000,
    smmServiceId: null
  },

  "Affiche Musique": {
    name: "AFFICHE MUSIQUE",
    quantity: 1,
    price: 5000,
    smmServiceId: null
  },

  "Logo": {
    name: "LOGO",
    quantity: 1,
    price: 3000,
    smmServiceId: null
  }

};

/* =====================================================
   SMM AFRICA API
===================================================== */

async function smmAfricaRequest(payload) {

  if (!SMM_API_KEY) {
    throw new Error(
      "SMM_API_KEY manquante dans Render."
    );
  }

  const response = await fetch(
    "https://smm.africa/api/v3",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization":
          `Bearer ${SMM_API_KEY}`
      },
      body: JSON.stringify(payload)
    }
  );

  const data = await response.json();

  if (!response.ok || data.error) {
    throw new Error(
      data.error ||
      "Erreur API SMM Africa."
    );
  }

  return data;
}

/* =====================================================
   EXPRESS
===================================================== */

app.use(express.json());
app.use(
  express.urlencoded({
    extended: true
  })
);

app.use(
  express.static(__dirname)
);

/* =====================================================
   JSON
===================================================== */

function readJSON(file, fallback = []) {

  try {

    if (!fs.existsSync(file)) {

      fs.writeFileSync(
        file,
        JSON.stringify(
          fallback,
          null,
          2
        ),
        "utf8"
      );

      return fallback;
    }

    const data =
      fs.readFileSync(
        file,
        "utf8"
      );

    if (!data.trim()) {
      return fallback;
    }

    return JSON.parse(data);

  } catch (error) {

    console.error(
      "Erreur lecture JSON :",
      error
    );

    return fallback;
  }
}


function writeJSON(file, data) {

  fs.writeFileSync(
    file,
    JSON.stringify(
      data,
      null,
      2
    ),
    "utf8"
  );
}

/* =====================================================
   PASSWORD
===================================================== */

function hashPassword(password) {

  return crypto
    .createHash("sha256")
    .update(String(password))
    .digest("hex");
}

/* =====================================================
   ACCUEIL
===================================================== */

app.get("/", (req, res) => {

  res.sendFile(
    path.join(
      __dirname,
      "index.html"
    )
  );

});

/* =====================================================
   SERVICES
===================================================== */

app.get(
  "/api/services",
  (req, res) => {

    const services =
      Object.entries(SERVICES)
        .map(
          ([key, service]) => ({
            key,
            name: service.name,
            quantity:
              service.quantity,
            price:
              service.price
          })
        );

    res.json({
      success: true,
      services
    });

  }
);

/* =====================================================
   SMM BALANCE
===================================================== */

app.get(
  "/api/smm/balance",
  async (req, res) => {

    try {

      const data =
        await smmAfricaRequest({
          action: "balance"
        });

      return res.json({
        success: true,
        balance:
          data.balance,
        currency:
          data.currency
      });

    } catch (error) {

      console.error(
        "Erreur SMM Africa:",
        error.message
      );

      return res.status(500).json({
        success: false,
        message:
          "Impossible de vérifier le solde SMM Africa."
      });

    }

  }
);

/* =====================================================
   ADMIN
===================================================== */

app.get(
  "/admin",
  (req, res) => {

    res.sendFile(
      path.join(
        __dirname,
        "admin.html"
      )
    );

  }
);

/* =====================================================
   REGISTER
===================================================== */

app.post(
  "/api/register",
  (req, res) => {

    const {
      name,
      email,
      password
    } = req.body;

    if (
      !name ||
      !email ||
      !password
    ) {

      return res.status(400).json({
        success: false,
        message:
          "Tous les champs sont obligatoires."
      });

    }

    const cleanName =
      String(name).trim();

    const normalizedEmail =
      String(email)
        .toLowerCase()
        .trim();

    if (
      cleanName.length < 2
    ) {

      return res.status(400).json({
        success: false,
        message:
          "Nom invalide."
      });

    }

    if (
      String(password).length < 6
    ) {

      return res.status(400).json({
        success: false,
        message:
          "Le mot de passe doit contenir au moins 6 caractères."
      });

    }

    const users =
      readJSON(USERS_FILE);

    const existing =
      users.find(
        user =>
          user.email ===
          normalizedEmail
      );

    if (existing) {

      return res.status(409).json({
        success: false,
        message:
          "Ce compte existe déjà."
      });

    }

    const user = {

      id:
        crypto.randomUUID(),

      name:
        cleanName,

      email:
        normalizedEmail,

      password:
        hashPassword(password),

      balance:
        0,

      createdAt:
        new Date().toISOString()

    };

    users.push(user);

    writeJSON(
      USERS_FILE,
      users
    );

    return res.json({

      success: true,

      message:
        "Compte créé avec succès.",

      user: {

        id:
          user.id,

        name:
          user.name,

        email:
          user.email,

        balance:
          0

      }

    });

  }
);

/* =====================================================
   LOGIN
===================================================== */

app.post(
  "/api/login",
  (req, res) => {

    const {
      email,
      password
    } = req.body;

    if (
      !email ||
      !password
    ) {

      return res.status(400).json({
        success: false,
        message:
          "Email et mot de passe obligatoires."
      });

    }

    const users =
      readJSON(USERS_FILE);

    const normalizedEmail =
      String(email)
        .toLowerCase()
        .trim();

    const user =
      users.find(
        u =>
          u.email ===
            normalizedEmail &&
          u.password ===
            hashPassword(password)
      );

    if (!user) {

      return res.status(401).json({
        success: false,
        message:
          "Email ou mot de passe incorrect."
      });

    }

    return res.json({

      success: true,

      message:
        "Connexion réussie.",

      user: {

        id:
          user.id,

        name:
          user.name,

        email:
          user.email,

        balance:
          Number(
            user.balance
          ) || 0

      }

    });

  }
);

/* =====================================================
   USER
===================================================== */

app.get(
  "/api/user/:id",
  (req, res) => {

    const users =
      readJSON(USERS_FILE);

    const user =
      users.find(
        u =>
          u.id ===
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

      user: {

        id:
          user.id,

        name:
          user.name,

        email:
          user.email,

        balance:
          Number(
            user.balance
          ) || 0

      }

    });

  }
);

/* =====================================================
   DEPOT
===================================================== */

app.post(
  "/api/deposit",
  (req, res) => {

    const {
      userId,
      amount,
      method
    } = req.body;

    const numericAmount =
      Number(amount);

    if (
      !userId ||
      !method
    ) {

      return res.status(400).json({
        success: false,
        message:
          "Utilisateur et moyen de paiement obligatoires."
      });

    }

    if (
      !Number.isFinite(
        numericAmount
      ) ||
      numericAmount <
        MIN_DEPOSIT
    ) {

      return res.status(400).json({

        success: false,

        message:
          `Le dépôt minimum est de ${MIN_DEPOSIT.toLocaleString("fr-FR")} FC.`

      });

    }

    if (
      !PAYMENT_METHODS.includes(
        String(method)
      )
    ) {

      return res.status(400).json({
        success: false,
        message:
          "Moyen de paiement invalide."
      });

    }

    const users =
      readJSON(USERS_FILE);

    const user =
      users.find(
        u =>
          u.id ===
          userId
      );

    if (!user) {

      return res.status(404).json({
        success: false,
        message:
          "Utilisateur introuvable."
      });

    }

    const orders =
      readJSON(ORDERS_FILE);

    const deposit = {

      id:
        crypto.randomUUID(),

      type:
        "deposit",

      userId:
        user.id,

      amount:
        numericAmount,

      method:
        String(method),

      status:
        "pending",

      createdAt:
        new Date().toISOString()

    };

    orders.push(deposit);

    writeJSON(
      ORDERS_FILE,
      orders
    );

    return res.json({

      success: true,

      message:
        "Demande de dépôt enregistrée. Le paiement doit être vérifié avant l'ajout au solde.",

      deposit

    });

  }
);

/* =====================================================
   DEPOTS CLIENT
===================================================== */

app.get(
  "/api/deposits/:userId",
  (req, res) => {

    const orders =
      readJSON(ORDERS_FILE);

    const deposits =
      orders.filter(
        item =>
          item.type ===
            "deposit" &&
          item.userId ===
            req.params.userId
      );

    return res.json({

      success: true,

      deposits

    });

  }
);

/* =====================================================
   ADMIN DEPOTS
===================================================== */

app.get(
  "/api/admin/deposits",
  (req, res) => {

    const orders =
      readJSON(ORDERS_FILE);

    const deposits =
      orders.filter(
        item =>
          item.type ===
          "deposit"
      );

    return res.json({

      success: true,

      deposits

    });

  }
);

/* =====================================================
   ADMIN APPROUVER DEPOT
===================================================== */

app.post(
  "/api/admin/deposit/:id/approve",
  (req, res) => {

    const depositId =
      req.params.id;

    const orders =
      readJSON(ORDERS_FILE);

    const users =
      readJSON(USERS_FILE);

    const deposit =
      orders.find(
        item =>
          item.id ===
            depositId &&
          item.type ===
            "deposit"
      );

    if (!deposit) {

      return res.status(404).json({
        success: false,
        message:
          "Dépôt introuvable."
      });

    }

    if (
      deposit.status !==
      "pending"
    ) {

      return res.status(400).json({
        success: false,
        message:
          "Ce dépôt a déjà été traité."
      });

    }

    const user =
      users.find(
        u =>
          u.id ===
          deposit.userId
      );

    if (!user) {

      return res.status(404).json({
        success: false,
        message:
          "Client introuvable."
      });

    }

    user.balance =
      Number(
        user.balance || 0
      ) +
      Number(
        deposit.amount
      );

    deposit.status =
      "approved";

    deposit.approvedAt =
      new Date().toISOString();

    writeJSON(
      USERS_FILE,
      users
    );

    writeJSON(
      ORDERS_FILE,
      orders
    );

    return res.json({

      success: true,

      message:
        "Dépôt approuvé. Le solde du client a été crédité.",

      balance:
        user.balance,

      deposit

    });

  }
);

/* =====================================================
   ADMIN REFUSER DEPOT
===================================================== */

app.post(
  "/api/admin/deposit/:id/reject",
  (req, res) => {

    const depositId =
      req.params.id;

    const orders =
      readJSON(ORDERS_FILE);

    const deposit =
      orders.find(
        item =>
          item.id ===
            depositId &&
          item.type ===
            "deposit"
      );

    if (!deposit) {

      return res.status(404).json({
        success: false,
        message:
          "Dépôt introuvable."
      });

    }

    if (
      deposit.status !==
      "pending"
    ) {

      return res.status(400).json({
        success: false,
        message:
          "Ce dépôt a déjà été traité."
      });

    }

    deposit.status =
      "rejected";

    deposit.rejectedAt =
      new Date().toISOString();

    writeJSON(
      ORDERS_FILE,
      orders
    );

    return res.json({

      success: true,

      message:
        "Dépôt refusé.",

      deposit

    });

  }
);

/* =====================================================
   PASSER UNE COMMANDE
===================================================== */

app.post(
  "/api/order",
  async (req, res) => {

    const {
      userId,
      service,
      link,
      quantity
    } = req.body;

    const serviceKey =
      String(
        service || ""
      ).trim();

    const selectedService =
      SERVICES[serviceKey];

    const numericQuantity =
      Number(quantity);

    /* ---------------------------------------------
       VERIFICATION SERVICE
    --------------------------------------------- */

    if (!selectedService) {

      return res.status(400).json({

        success: false,

        message:
          "❌ Formule invalide."

      });

    }

    /* ---------------------------------------------
       VERIFICATION LIEN
    --------------------------------------------- */

    if (
      !link ||
      !String(link).trim()
    ) {

      return res.status(400).json({

        success: false,

        message:
          "❌ Le lien est obligatoire."

      });

    }

    /* ---------------------------------------------
       QUANTITE EXACTE
    --------------------------------------------- */

    if (
      !Number.isFinite(
        numericQuantity
      ) ||
      numericQuantity !==
        selectedService.quantity
    ) {

      return res.status(400).json({

        success: false,

        message:
          `❌ Cette formule nécessite exactement ${selectedService.quantity.toLocaleString("fr-FR")} unités.`

      });

    }

    /* ---------------------------------------------
       PRIX SERVEUR
       IMPORTANT:
       ON N'UTILISE PAS LE PRICE ENVOYE
       PAR LE NAVIGATEUR.
    --------------------------------------------- */

    const realPrice =
      Number(
        selectedService.price
      );

    const users =
      readJSON(USERS_FILE);

    const user =
      users.find(
        u =>
          u.id ===
          userId
      );

    if (!user) {

      return res.status(404).json({

        success: false,

        message:
          "Utilisateur introuvable."

      });

    }

    const balance =
      Number(
        user.balance
      ) || 0;

    /* ---------------------------------------------
       SOLDE
    --------------------------------------------- */

    if (
      balance <
      realPrice
    ) {

      return res.status(400).json({

        success: false,

        message:
          `❌ Solde insuffisant. Il faut ${realPrice.toLocaleString("fr-FR")} FC pour cette formule.`

      });

    }

    /* ---------------------------------------------
       PREPARER COMMANDE
    --------------------------------------------- */

    const orders =
      readJSON(ORDERS_FILE);

    const order = {

      id:
        crypto.randomUUID(),

      type:
        "order",

      userId:
        user.id,

      service:
        selectedService.name,

      serviceKey:
        serviceKey,

      link:
        String(link).trim(),

      quantity:
        selectedService.quantity,

      price:
        realPrice,

      status:
        "pending",

      createdAt:
        new Date().toISOString()

    };

    /* =================================================
       SMM AFRICA
       
       IMPORTANT:
       Tant que smmServiceId = null,
       on NE lance PAS une commande automatique.
       
       Après récupération du vrai Service ID,
       on pourra activer l'envoi automatique.
    ================================================= */

    if (
      selectedService.smmServiceId
    ) {

      try {

        const smmResult =
          await smmAfricaRequest({

            action:
              "add",

            service:
              selectedService.smmServiceId,

            link:
              String(link).trim(),

            quantity:
              selectedService.quantity

          });

        order.smmOrderId =
          smmResult.order ||
          smmResult.order_id ||
          null;

        order.smmResponse =
          smmResult;

        order.status =
          "processing";

      } catch (error) {

        console.error(
          "Erreur commande SMM:",
          error.message
        );

        return res.status(502).json({

          success: false,

          message:
            "❌ La commande automatique n'a pas pu être envoyée au fournisseur. Votre solde n'a pas été débité."

        });

      }

    }

    /* ---------------------------------------------
       DEBIT CLIENT
    --------------------------------------------- */

    user.balance =
      balance -
      realPrice;

    orders.push(order);

    writeJSON(
      USERS_FILE,
      users
    );

    writeJSON(
      ORDERS_FILE,
      orders
    );

    return res.json({

      success: true,

      message:
        order.status === "processing"
          ? "🚀 Commande envoyée au fournisseur avec succès."
          : "✅ Commande enregistrée. Elle sera traitée dès que le service fournisseur sera configuré.",

      order,

      balance:
        user.balance

    });

  }
);

/* =====================================================
   COMMANDES CLIENT
===================================================== */

app.get(
  "/api/orders/:userId",
  (req, res) => {

    const orders =
      readJSON(ORDERS_FILE);

    const userOrders =
      orders.filter(
        order =>
          order.userId ===
            req.params.userId &&
          order.type ===
            "order"
      );

    return res.json({

      success: true,

      orders:
        userOrders

    });

  }
);

/* =====================================================
   DEMARRAGE
===================================================== */

app.listen(
  PORT,
  () => {

    console.log(
      `👑 LEADER NOSMY BOOST démarré sur le port ${PORT}`
    );

  }
);
