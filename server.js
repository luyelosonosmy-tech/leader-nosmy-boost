const express = require("express");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;

/*
==================================================
 LEADER NOSMY BOOST
 SERVER V3
==================================================
*/

const SMM_API_KEY = process.env.SMM_API_KEY;
const SMM_API_URL = "https://smm.africa/api/v3";

const USERS_FILE = path.join(__dirname, "users.json");
const ORDERS_FILE = path.join(__dirname, "orders.json");

const MIN_DEPOSIT = 2500;

const PAYMENT_METHODS = [
  "Orange Money",
  "Airtel Money",
  "Vodacom M-Pesa"
];

/*
==================================================
 SERVICES
==================================================

 IMPORTANT :

 On NE met plus :

 serviceId: 0

 Les vrais IDs viennent automatiquement
 de SMM Africa.

 Structure :

 id = vrai ID fournisseur
 providerServiceId = vrai ID fournisseur
==================================================
*/

let SERVICES = [];

/*
==================================================
 OUTILS JSON
==================================================
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

    const data =
      JSON.parse(content);

    return Array.isArray(data)
      ? data
      : fallback;

  } catch (error) {

    console.error(
      "JSON ERROR:",
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
==================================================
 PASSWORD
==================================================
*/

function hashPassword(password) {

  return crypto
    .createHash("sha256")
    .update(String(password))
    .digest("hex");
}

/*
==================================================
 PRICE
==================================================
*/

function calculatePrice(service, quantity) {

  return Math.ceil(
    (
      Number(quantity) / 1000
    ) *
    Number(service.pricePer1000)
  );

}

/*
==================================================
 GET SERVICE
==================================================
*/

function getService(serviceId) {

  return SERVICES.find(
    service =>
      Number(service.id) ===
      Number(serviceId)
  );

}

/*
==================================================
 EXPRESS
==================================================
*/

app.use(express.json());

app.use(
  express.urlencoded({
    extended: true
  })
);

app.use(
  express.static(__dirname)
);

/*
==================================================
 PAGES
==================================================
*/

app.get("/", (req, res) => {

  res.sendFile(
    path.join(
      __dirname,
      "index.html"
    )
  );

});

app.get("/admin", (req, res) => {

  res.sendFile(
    path.join(
      __dirname,
      "admin.html"
    )
  );

});

/*
==================================================
 HEALTH
==================================================
*/

app.get(
  "/api/health",
  (req, res) => {

    res.json({

      success: true,

      site:
        "LEADER NOSMY BOOST",

      status:
        "online",

      services:
        SERVICES.length,

      minimumDeposit:
        MIN_DEPOSIT,

      provider:
        "SMM Africa",

      time:
        new Date().toISOString()

    });

  }
);

/*
==================================================
 SMM AFRICA REQUEST
==================================================
*/

async function smmAfricaRequest(
  payload,
  idempotencyKey = null
) {

  if (!SMM_API_KEY) {

    throw new Error(
      "SMM_API_KEY manquante dans Render."
    );

  }

  const headers = {

    "Content-Type":
      "application/json",

    "Accept":
      "application/json",

    "Authorization":
      `Bearer ${SMM_API_KEY}`

  };

  if (idempotencyKey) {

    headers["Idempotency-Key"] =
      idempotencyKey;

  }

  const response =
    await fetch(
      SMM_API_URL,
      {
        method: "POST",
        headers,
        body:
          JSON.stringify(payload)
      }
    );

  const text =
    await response.text();

  let data;

  try {

    data =
      JSON.parse(text);

  } catch {

    throw new Error(
      `Réponse fournisseur non JSON. HTTP ${response.status}`
    );

  }

  console.log(
    "SMM:",
    payload.action,
    response.status,
    JSON.stringify(data)
  );

  if (!response.ok) {

    throw new Error(
      data.error ||
      data.message ||
      `Erreur fournisseur HTTP ${response.status}`
    );

  }

  if (data.error) {

    throw new Error(
      String(data.error)
    );

  }

  return data;

}

/*
==================================================
 CHARGER LES VRAIS SERVICES
==================================================

 IMPORTANT :

 Aucun serviceId: 0.

 Les IDs sont récupérés directement
 depuis SMM Africa.
==================================================
*/

async function loadServices() {

  try {

    console.log(
      "🔄 Chargement des services SMM Africa..."
    );

    const data =
      await smmAfricaRequest({
        action: "services"
      });

    if (!Array.isArray(data)) {

      console.error(
        "❌ Réponse services invalide."
      );

      SERVICES = [];

      return false;

    }

    const services =
      data
        .map(service => {

          const providerServiceId =
            Number(
              service.service ??
              service.serviceId ??
              service.id
            );

          /*
          ------------------------------------------
          IGNORER LES SERVICES SANS ID VALIDE
          ------------------------------------------
          */

          if (
            !Number.isInteger(
              providerServiceId
            ) ||
            providerServiceId <= 0
          ) {

            return null;

          }

          const rate =
            Number(
              service.rate ??
              service.pricePer1000 ??
              0
            );

          return {

            /*
            ID LOCAL = VRAI ID FOURNISSEUR
            */

            id:
              providerServiceId,

            providerServiceId:
              providerServiceId,

            name:
              service.name ||
              service.service_name ||
              "Service sans nom",

            category:
              service.category ||
              "Autres",

            pricePer1000:
              rate,

            min:
              Number(
                service.min ?? 1
              ),

            max:
              Number(
                service.max ?? 1000000
              ),

            refill:
              service.refill ||
              "NO REFILL",

            speed:
              service.speed ||
              "Normal"

          };

        })
        .filter(Boolean);

    SERVICES = services;

    console.log(
      `✅ ${SERVICES.length} services SMM Africa chargés.`
    );

    return true;

  } catch (error) {

    console.error(
      "❌ SMM SERVICES ERROR:",
      error.message
    );

    SERVICES = [];

    return false;

  }

}

/*
==================================================
 API SERVICES
==================================================
*/

app.get(
  "/api/services",
  async (req, res) => {

    /*
    Si les services ne sont pas encore chargés,
    on essaie maintenant.
    */

    if (
      SERVICES.length === 0
    ) {

      await loadServices();

    }

    res.json({

      success:
        SERVICES.length > 0,

      currency:
        "CDF",

      count:
        SERVICES.length,

      services:
        SERVICES

    });

  }
);

/*
==================================================
 REGISTER
==================================================
*/

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

    if (
      String(password).length < 6
    ) {

      return res.status(400).json({

        success: false,

        message:
          "Mot de passe : minimum 6 caractères."

      });

    }

    const cleanName =
      String(name).trim();

    const cleanEmail =
      String(email)
        .trim()
        .toLowerCase();

    const users =
      readJSON(
        USERS_FILE
      );

    if (
      users.some(
        user =>
          user.email ===
          cleanEmail
      )
    ) {

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
        cleanEmail,

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

    res.json({

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

/*
==================================================
 LOGIN
==================================================
*/

app.post(
  "/api/login",
  (req, res) => {

    const {
      email,
      password
    } = req.body;

    const users =
      readJSON(
        USERS_FILE
      );

    const cleanEmail =
      String(email || "")
        .trim()
        .toLowerCase();

    const user =
      users.find(
        item =>
          item.email ===
            cleanEmail &&
          item.password ===
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

/*
==================================================
 USER
==================================================
*/

app.get(
  "/api/user/:id",
  (req, res) => {

    const users =
      readJSON(
        USERS_FILE
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

    res.json({

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

/*
==================================================
 DEPOSIT
==================================================
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

    if (
      !userId ||
      !method
    ) {

      return res.status(400).json({

        success: false,

        message:
          "Utilisateur et paiement obligatoires."

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
          `Dépôt minimum : ${MIN_DEPOSIT.toLocaleString("fr-FR")} FC.`

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
      readJSON(
        USERS_FILE
      );

    const user =
      users.find(
        item =>
          item.id ===
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
      readJSON(
        ORDERS_FILE
      );

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

    res.json({

      success: true,

      message:
        "Demande de dépôt enregistrée. Attendez la validation.",

      deposit

    });

  }
);

/*
==================================================
 ADMIN DEPOSITS
==================================================
*/

app.get(
  "/api/admin/deposits",
  (req, res) => {

    const orders =
      readJSON(
        ORDERS_FILE
      );

    const deposits =
      orders.filter(
        item =>
          item.type ===
          "deposit"
      );

    res.json({

      success: true,

      deposits

    });

  }
);

/*
==================================================
 APPROVE DEPOSIT
==================================================
*/

app.post(
  "/api/admin/deposit/:id/approve",
  (req, res) => {

    const orders =
      readJSON(
        ORDERS_FILE
      );

    const users =
      readJSON(
        USERS_FILE
      );

    const deposit =
      orders.find(
        item =>
          item.id ===
            req.params.id &&
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
          "Dépôt déjà traité."

      });

    }

    const user =
      users.find(
        item =>
          item.id ===
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
==================================================
 REJECT DEPOSIT
==================================================
*/

app.post(
  "/api/admin/deposit/:id/reject",
  (req, res) => {

    const orders =
      readJSON(
        ORDERS_FILE
      );

    const deposit =
      orders.find(
        item =>
          item.id ===
            req.params.id &&
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
==================================================
 CREATE ORDER
==================================================
*/

app.post(
  "/api/order",
  async (req, res) => {

    const {
      userId,
      serviceId,
      link,
      quantity
    } = req.body;

    const numericServiceId =
      Number(serviceId);

    const numericQuantity =
      Number(quantity);

    /*
    ------------------------------------------
    VALIDATION
    ------------------------------------------
    */

    if (
      !userId ||
      !Number.isInteger(
        numericServiceId
      ) ||
      numericServiceId <= 0 ||
      !link ||
      !Number.isInteger(
        numericQuantity
      ) ||
      numericQuantity <= 0
    ) {

      return res.status(400).json({

        success: false,

        message:
          "Informations de commande invalides."

      });

    }

    /*
    ------------------------------------------
    SI SERVICES NON CHARGÉS
    ------------------------------------------
    */

    if (
      SERVICES.length === 0
    ) {

      await loadServices();

    }

    /*
    ------------------------------------------
    SERVICE
    ------------------------------------------
    */

    const service =
      getService(
        numericServiceId
      );

    if (!service) {

      return res.status(400).json({

        success: false,

        message:
          "Service introuvable ou ID fournisseur invalide."

      });

    }

    /*
    ------------------------------------------
    QUANTITÉ
    ------------------------------------------
    */

    if (
      numericQuantity <
        service.min ||
      numericQuantity >
        service.max
    ) {

      return res.status(400).json({

        success: false,

        message:
          `Quantité autorisée : ${service.min} à ${service.max}.`

      });

    }

    /*
    ------------------------------------------
    USER
    ------------------------------------------
    */

    const users =
      readJSON(
        USERS_FILE
      );

    const user =
      users.find(
        item =>
          item.id ===
          userId
      );

    if (!user) {

      return res.status(404).json({

        success: false,

        message:
          "Utilisateur introuvable."

      });

    }

    /*
    ------------------------------------------
    PRICE
    ------------------------------------------
    */

    const price =
      calculatePrice(
        service,
        numericQuantity
      );

    const balance =
      Number(
        user.balance
      ) || 0;

    if (
      balance < price
    ) {

      return res.status(400).json({

        success: false,

        message:
          `Solde insuffisant. Cette commande coûte ${price.toLocaleString("fr-FR")} FC.`

      });

    }

    /*
    ------------------------------------------
    VRAI ID FOURNISSEUR
    ------------------------------------------
    */

    const providerServiceId =
      Number(
        service.providerServiceId
      );

    if (
      !Number.isInteger(
        providerServiceId
      ) ||
      providerServiceId <= 0
    ) {

      return res.status(503).json({

        success: false,

        message:
          "Ce service n'a pas de vrai ID fournisseur."

      });

    }

    /*
    ------------------------------------------
    ENVOI FOURNISSEUR
    ------------------------------------------
    */

    const idempotencyKey =
      crypto.randomUUID();

    let providerData;

    try {

      providerData =
        await smmAfricaRequest(

          {

            action:
              "add",

            service:
              providerServiceId,

            link:
              String(link).trim(),

            quantity:
              numericQuantity

          },

          idempotencyKey

        );

    } catch (error) {

      console.error(
        "FOURNISSEUR ORDER:",
        error.message
      );

      return res.status(502).json({

        success: false,

        message:
          "Le fournisseur n'a pas accepté la commande. Votre solde reste intact."

      });

    }

    /*
    ------------------------------------------
    FOURNISSEUR CONFIRMATION
    ------------------------------------------
    */

    if (
      !providerData ||
      !providerData.order
    ) {

      return res.status(502).json({

        success: false,

        message:
          "Le fournisseur n'a pas confirmé la commande. Aucun débit effectué."

      });

    }

    /*
    ------------------------------------------
    DÉBIT CLIENT
    ------------------------------------------
    */

    user.balance =
      balance - price;

    /*
    ------------------------------------------
    ENREGISTREMENT
    ------------------------------------------
    */

    const orders =
      readJSON(
        ORDERS_FILE
      );

    const order = {

      id:
        crypto.randomUUID(),

      type:
        "order",

      userId:
        user.id,

      serviceId:
        providerServiceId,

      providerServiceId:
        providerServiceId,

      service:
        service.name,

      category:
        service.category,

      link:
        String(link).trim(),

      quantity:
        numericQuantity,

      price:
        price,

      pricePer1000:
        service.pricePer1000,

      provider:
        "SMM Africa",

      providerOrderId:
        String(
          providerData.order
        ),

      status:
        "pending",

      providerStatus:
        null,

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

    /*
    ------------------------------------------
    RÉPONSE
    ------------------------------------------
    */

    res.json({

      success: true,

      message:
        "🚀 Commande envoyée avec succès.",

      order,

      balance:
        user.balance

    });

  }
);

/*
==================================================
 ORDERS CLIENT
==================================================
*/

app.get(
  "/api/orders/:userId",
  (req, res) => {

    const orders =
      readJSON(
        ORDERS_FILE
      );

    const userOrders =
      orders.filter(
        order =>
          order.type ===
            "order" &&
          order.userId ===
            req.params.userId
      );

    res.json({

      success: true,

      orders:
        userOrders.reverse()

    });

  }
);

/*
==================================================
 ORDER STATUS
==================================================
*/

app.get(
  "/api/order-status/:userId/:orderId",
  async (req, res) => {

    const orders =
      readJSON(
        ORDERS_FILE
      );

    const order =
      orders.find(
        item =>
          item.id ===
            req.params.orderId &&
          item.userId ===
            req.params.userId &&
          item.type ===
            "order"
      );

    if (!order) {

      return res.status(404).json({

        success: false,

        message:
          "Commande introuvable."

      });

    }

    if (
      !order.providerOrderId
    ) {

      return res.status(400).json({

        success: false,

        message:
          "ID fournisseur manquant."

      });

    }

    try {

      const data =
        await smmAfricaRequest({

          action:
            "status",

          order:
            order.providerOrderId

        });

      order.providerStatus =
        data.status ||
        null;

      order.startCount =
        data.start_count ??
        null;

      order.remains =
        data.remains ??
        null;

      order.providerCharge =
        data.charge ??
        null;

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
        "STATUS ERROR:",
        error.message
      );

      res.status(502).json({

        success: false,

        message:
          "Impossible de vérifier le statut fournisseur."

      });

    }

  }
);

/*
==================================================
 FOURNISSEUR BALANCE
==================================================
*/

app.get(
  "/api/smm/balance",
  async (req, res) => {

    try {

      const data =
        await smmAfricaRequest({

          action:
            "balance"

        });

      res.json({

        success: true,

        balance:
          data.balance,

        currency:
          data.currency

      });

    } catch (error) {

      console.error(
        "BALANCE ERROR:",
        error.message
      );

      res.status(502).json({

        success: false,

        message:
          "Impossible de vérifier le solde fournisseur."

      });

    }

  }
);

/*
==================================================
 RECHARGEMENT SERVICES
==================================================

 Utile si Render démarre avant que
 l'API soit disponible.
==================================================
*/

setInterval(
  async () => {

    await loadServices();

  },
  10 * 60 * 1000
);

/*
==================================================
 START
==================================================
*/

async function startServer() {

  /*
  Essaie de charger les services
  avant de démarrer le serveur.
  */

  await loadServices();

  app.listen(
    PORT,
    () => {

      console.log(
        "========================================"
      );

      console.log(
        "👑 LEADER NOSMY BOOST"
      );

      console.log(
        `🚀 Serveur : ${PORT}`
      );

      console.log(
        `💳 Dépôt minimum : ${MIN_DEPOSIT} FC`
      );

      console.log(
        `📦 Services chargés : ${SERVICES.length}`
      );

      console.log(
        "🔗 Fournisseur : SMM Africa"
      );

      console.log(
        "========================================"
      );

    }
  );

}

startServer();
