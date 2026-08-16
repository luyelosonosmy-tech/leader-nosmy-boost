const express = require("express");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;

const SMM_API_KEY = process.env.SMM_API_KEY;

const USERS_FILE = path.join(__dirname, "users.json");
const ORDERS_FILE = path.join(__dirname, "orders.json");

const MIN_DEPOSIT = 1000;

const PAYMENT_METHODS = [
  "Orange Money",
  "Airtel Money",
  "Vodacom M-Pesa"
];

/*
========================================
 LEADER NOSMY BOOST
 SMM AFRICA
========================================
*/

async function smmAfricaRequest(payload, idempotencyKey = null) {

  if (!SMM_API_KEY) {
    throw new Error("SMM_API_KEY manquante.");
  }

  const headers = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${SMM_API_KEY}`
  };

  if (idempotencyKey) {
    headers["Idempotency-Key"] = idempotencyKey;
  }

  const response = await fetch(
    "https://smm.africa/api/v3",
    {
      method: "POST",
      headers,
      body: JSON.stringify(payload)
    }
  );

  const data = await response.json();

  if (!response.ok || data.error) {
    throw new Error(
      data.error || "Erreur SMM Africa."
    );
  }

  return data;
}

/*
========================================
 JSON
========================================
*/

function readJSON(file, fallback = []) {

  try {

    if (!fs.existsSync(file)) {

      fs.writeFileSync(
        file,
        JSON.stringify(fallback, null, 2),
        "utf8"
      );

      return fallback;
    }

    const content =
      fs.readFileSync(file, "utf8");

    if (!content.trim()) {
      return fallback;
    }

    return JSON.parse(content);

  } catch (error) {

    console.error(
      "Erreur JSON:",
      error.message
    );

    return fallback;
  }
}

function writeJSON(file, data) {

  fs.writeFileSync(
    file,
    JSON.stringify(data, null, 2),
    "utf8"
  );
}

/*
========================================
 PASSWORD
========================================
*/

function hashPassword(password) {

  return crypto
    .createHash("sha256")
    .update(String(password))
    .digest("hex");
}

/*
========================================
 EXPRESS
========================================
*/

app.use(express.json());
app.use(express.urlencoded({
  extended: true
}));

app.use(express.static(__dirname));

app.get("/", (req, res) => {

  res.sendFile(
    path.join(__dirname, "index.html")
  );

});

app.get("/admin", (req, res) => {

  res.sendFile(
    path.join(__dirname, "admin.html")
  );

});

/*
========================================
 SMM BALANCE
========================================
*/

app.get(
  "/api/smm/balance",
  async (req, res) => {

    try {

      const data =
        await smmAfricaRequest({
          action: "balance"
        });

      res.json({
        success: true,
        balance: data.balance,
        currency: data.currency
      });

    } catch (error) {

      console.error(
        "SMM balance:",
        error.message
      );

      res.status(500).json({
        success: false,
        message:
          "Impossible de vérifier le solde fournisseur."
      });
    }
  }
);

/*
========================================
 SMM SERVICES
========================================
*/

app.get(
  "/api/smm/services",
  async (req, res) => {

    try {

      const services =
        await smmAfricaRequest({
          action: "services"
        });

      res.json({
        success: true,
        services
      });

    } catch (error) {

      console.error(
        "SMM services:",
        error.message
      );

      res.status(500).json({
        success: false,
        message:
          "Impossible de récupérer les services."
      });
    }
  }
);

/*
========================================
 REGISTER
========================================
*/

app.post(
  "/api/register",
  (req, res) => {

    const {
      name,
      email,
      password
    } = req.body;

    if (!name || !email || !password) {

      return res.status(400).json({
        success: false,
        message:
          "Tous les champs sont obligatoires."
      });
    }

    const cleanName =
      String(name).trim();

    const cleanEmail =
      String(email)
        .toLowerCase()
        .trim();

    if (cleanName.length < 2) {

      return res.status(400).json({
        success: false,
        message:
          "Nom invalide."
      });
    }

    if (String(password).length < 6) {

      return res.status(400).json({
        success: false,
        message:
          "Mot de passe: minimum 6 caractères."
      });
    }

    const users =
      readJSON(USERS_FILE);

    const exists =
      users.find(
        user =>
          user.email === cleanEmail
      );

    if (exists) {

      return res.status(409).json({
        success: false,
        message:
          "Ce compte existe déjà."
      });
    }

    const user = {

      id: crypto.randomUUID(),

      name: cleanName,

      email: cleanEmail,

      password:
        hashPassword(password),

      balance: 0,

      createdAt:
        new Date().toISOString()
    };

    users.push(user);

    writeJSON(
      USERS_FILE,
      users
    );

    res.json({

      success: true,

      message:
        "Compte créé avec succès.",

      user: {

        id: user.id,

        name: user.name,

        email: user.email,

        balance: 0
      }

    });

  }
);

/*
========================================
 LOGIN
========================================
*/

app.post(
  "/api/login",
  (req, res) => {

    const {
      email,
      password
    } = req.body;

    if (!email || !password) {

      return res.status(400).json({
        success: false,
        message:
          "Email et mot de passe obligatoires."
      });
    }

    const users =
      readJSON(USERS_FILE);

    const cleanEmail =
      String(email)
        .toLowerCase()
        .trim();

    const user =
      users.find(
        u =>
          u.email === cleanEmail &&
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

    res.json({

      success: true,

      message:
        "Connexion réussie.",

      user: {

        id: user.id,

        name: user.name,

        email: user.email,

        balance:
          Number(user.balance) || 0
      }

    });

  }
);

/*
========================================
 USER
========================================
*/

app.get(
  "/api/user/:id",
  (req, res) => {

    const users =
      readJSON(USERS_FILE);

    const user =
      users.find(
        u =>
          u.id === req.params.id
      );

    if (!user) {

      return res.status(404).json({
        success: false,
        message:
          "Utilisateur introuvable."
      });
    }

    res.json({

      success: true,

      user: {

        id: user.id,

        name: user.name,

        email: user.email,

        balance:
          Number(user.balance) || 0
      }

    });

  }
);

/*
========================================
 DEPOSIT
========================================
*/

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

    if (!userId || !method) {

      return res.status(400).json({
        success: false,
        message:
          "Utilisateur et paiement obligatoires."
      });
    }

    if (
      !Number.isFinite(numericAmount) ||
      numericAmount < MIN_DEPOSIT
    ) {

      return res.status(400).json({
        success: false,
        message:
          `Minimum ${MIN_DEPOSIT.toLocaleString("fr-FR")} FC.`
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
          u.id === userId
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

      id: crypto.randomUUID(),

      type: "deposit",

      userId: user.id,

      amount: numericAmount,

      method: String(method),

      status: "pending",

      createdAt:
        new Date().toISOString()
    };

    orders.push(deposit);

    writeJSON(
      ORDERS_FILE,
      orders
    );

    res.json({

      success: true,

      message:
        "Demande enregistrée. Vérification du paiement en attente.",

      deposit

    });

  }
);

/*
========================================
 ADMIN DEPOSITS
========================================
*/

app.get(
  "/api/admin/deposits",
  (req, res) => {

    const orders =
      readJSON(ORDERS_FILE);

    const deposits =
      orders.filter(
        item =>
          item.type === "deposit"
      );

    res.json({
      success: true,
      deposits
    });

  }
);

/*
========================================
 APPROVE DEPOSIT
========================================
*/

app.post(
  "/api/admin/deposit/:id/approve",
  (req, res) => {

    const orders =
      readJSON(ORDERS_FILE);

    const users =
      readJSON(USERS_FILE);

    const deposit =
      orders.find(
        item =>
          item.id === req.params.id &&
          item.type === "deposit"
      );

    if (!deposit) {

      return res.status(404).json({
        success: false,
        message:
          "Dépôt introuvable."
      });
    }

    if (deposit.status !== "pending") {

      return res.status(400).json({
        success: false,
        message:
          "Dépôt déjà traité."
      });
    }

    const user =
      users.find(
        u =>
          u.id === deposit.userId
      );

    if (!user) {

      return res.status(404).json({
        success: false,
        message:
          "Client introuvable."
      });
    }

    user.balance =
      Number(user.balance || 0) +
      Number(deposit.amount);

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

    res.json({

      success: true,

      message:
        "Dépôt approuvé. Solde crédité.",

      balance:
        user.balance

    });

  }
);

/*
========================================
 REJECT DEPOSIT
========================================
*/

app.post(
  "/api/admin/deposit/:id/reject",
  (req, res) => {

    const orders =
      readJSON(ORDERS_FILE);

    const deposit =
      orders.find(
        item =>
          item.id === req.params.id &&
          item.type === "deposit"
      );

    if (!deposit) {

      return res.status(404).json({
        success: false,
        message:
          "Dépôt introuvable."
      });
    }

    if (deposit.status !== "pending") {

      return res.status(400).json({
        success: false,
        message:
          "Dépôt déjà traité."
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

    res.json({

      success: true,

      message:
        "Dépôt refusé."

    });

  }
);

/*
========================================
 COMMANDER CHEZ SMM AFRICA
========================================
*/

app.post(
  "/api/order",
  async (req, res) => {

    const {
      userId,
      serviceId,
      service,
      link,
      quantity,
      price
    } = req.body;

    const numericServiceId =
      Number(serviceId);

    const numericQuantity =
      Number(quantity);

    const numericPrice =
      Number(price);

    if (
      !userId ||
      !Number.isInteger(numericServiceId) ||
      numericServiceId <= 0 ||
      !service ||
      !link ||
      !Number.isInteger(numericQuantity) ||
      numericQuantity <= 0 ||
      !Number.isFinite(numericPrice) ||
      numericPrice <= 0
    ) {

      return res.status(400).json({
        success: false,
        message:
          "Informations de commande invalides."
      });
    }

    const users =
      readJSON(USERS_FILE);

    const user =
      users.find(
        u =>
          u.id === userId
      );

    if (!user) {

      return res.status(404).json({
        success: false,
        message:
          "Utilisateur introuvable."
      });
    }

    const balance =
      Number(user.balance) || 0;

    if (balance < numericPrice) {

      return res.status(400).json({
        success: false,
        message:
          "Solde insuffisant."
      });
    }

    /*
      IMPORTANT:
      On envoie la commande au fournisseur
      AVANT de débiter le client.
    */

    const idempotencyKey =
      crypto.randomUUID();

    let smmData;

    try {

      smmData =
        await smmAfricaRequest(

          {
            action: "add",

            service:
              numericServiceId,

            link:
              String(link).trim(),

            quantity:
              numericQuantity,

            idempotency_key:
              idempotencyKey,

            source_flow:
              "leader-nosmy-boost",

            user_intent_label:
              "social-growth",

            recommendation_tier:
              "standard"
          },

          idempotencyKey
        );

    } catch (error) {

      console.error(
        "Commande SMM:",
        error.message
      );

      return res.status(502).json({
        success: false,
        message:
          "La commande n'a pas pu être envoyée au fournisseur. Votre solde n'a pas été débité."
      });
    }

    if (!smmData.order) {

      return res.status(502).json({
        success: false,
        message:
          "Le fournisseur n'a pas confirmé la commande."
      });
    }

    /*
      Fournisseur confirmé.
      Maintenant seulement on débite.
    */

    user.balance =
      balance - numericPrice;

    const orders =
      readJSON(ORDERS_FILE);

    const order = {

      id: crypto.randomUUID(),

      type: "order",

      userId: user.id,

      service:
        String(service),

      serviceId:
        numericServiceId,

      link:
        String(link).trim(),

      quantity:
        numericQuantity,

      price:
        numericPrice,

      provider:
        "SMM Africa",

      providerOrderId:
        String(smmData.order),

      providerCharged:
        smmData.charged ?? null,

      status:
        smmData.queued
          ? "queued"
          : "pending",

      createdAt:
        new Date().toISOString()
    };

    orders.push(order);

    writeJSON(
      USERS_FILE,
      users
    );

    writeJSON(
      ORDERS_FILE,
      orders
    );

    res.json({

      success: true,

      message:
        "Commande envoyée avec succès. Livraison en cours selon le service choisi.",

      order,

      balance:
        user.balance

    });

  }
);

/*
========================================
 CLIENT ORDERS
========================================
*/

app.get(
  "/api/orders/:userId",
  (req, res) => {

    const orders =
      readJSON(ORDERS_FILE);

    const userOrders =
      orders.filter(
        order =>
          order.type === "order" &&
          order.userId ===
            req.params.userId
      );

    res.json({

      success: true,

      orders:
        userOrders

    });

  }
);

/*
========================================
 SMM STATUS
========================================
*/

app.get(
  "/api/order-status/:userId/:orderId",
  async (req, res) => {

    try {

      const orders =
        readJSON(ORDERS_FILE);

      const order =
        orders.find(
          item =>
            item.id ===
              req.params.orderId &&
            item.userId ===
              req.params.userId &&
            item.type === "order"
        );

      if (!order) {

        return res.status(404).json({
          success: false,
          message:
            "Commande introuvable."
        });
      }

      if (!order.providerOrderId) {

        return res.status(400).json({
          success: false,
          message:
            "ID fournisseur manquant."
        });
      }

      const data =
        await smmAfricaRequest({

          action: "status",

          order:
            order.providerOrderId

        });

      order.providerStatus =
        data.status || null;

      order.startCount =
        data.start_count ?? null;

      order.remains =
        data.remains ?? null;

      order.providerCharge =
        data.charge ?? null;

      order.lastCheckedAt =
        new Date().toISOString();

      writeJSON(
        ORDERS_FILE,
        orders
      );

      res.json({

        success: true,

        status:
          data.status,

        start_count:
          data.start_count,

        remains:
          data.remains,

        charge:
          data.charge

      });

    } catch (error) {

      console.error(
        "Status SMM:",
        error.message
      );

      res.status(500).json({
        success: false,
        message:
          "Impossible de vérifier le statut."
      });
    }

  }
);

/*
========================================
 START
========================================
*/

app.listen(
  PORT,
  () => {

    console.log(
      `LEADER NOSMY BOOST lancé sur le port ${PORT}`
    );

  }
);
