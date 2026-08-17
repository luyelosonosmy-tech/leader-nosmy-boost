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
 SERVICES DU FOURNISSEUR
==================================================

 On ne met PAS serviceId: 0 ici.

 Les vrais IDs sont récupérés automatiquement
 depuis SMM Africa avec /api/smm/services.

 Ensuite ils sont utilisés pour les commandes.
==================================================
*/

let PROVIDER_SERVICES = [];

/*
==================================================
 SERVICES CLIENT
==================================================

 Ces services sont construits à partir des services
 réels du fournisseur.

 Les prix ci-dessous sont des prix de vente client
 en CDF pour 1000 unités.

 Le mapping est fait selon le nom/catégorie.
==================================================
*/

const CLIENT_PRICE_RULES = {

  Facebook: {
    like: 360,
    reaction: 360,
    follower: 1656,
    share: 192,
    view: 72
  },

  Instagram: {
    follower: 1464,
    like: 432,
    view: 720,
    comment: 1000
  },

  TikTok: {
    follower: 6624,
    like: 1488,
    view: 456,
    save: 384,
    share: 288
  },

  YouTube: {
    subscriber: 648,
    view: 2304,
    like: 500,
    comment: 1000
  },

  Telegram: {
    follower: 1500,
    member: 1500,
    view: 500
  },

  WhatsApp: {
    follower: 1500,
    member: 1500,
    view: 500
  },

  Spotify: {
    follower: 2000,
    play: 500,
    stream: 500
  },

  Autres: {
    default: 1000
  }

};

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
 PRIX
==================================================
*/

function calculatePrice(service, quantity) {

  return Math.ceil(
    (Number(quantity) / 1000) *
    Number(service.pricePer1000)
  );
}

/*
==================================================
 TROUVER SERVICE
==================================================
*/

function getService(serviceId) {

  return PROVIDER_SERVICES.find(
    service =>
      Number(service.id) ===
      Number(serviceId)
  );
}

/*
==================================================
 CATÉGORIE
==================================================
*/

function detectCategory(service) {

  const text =
    `${service.name || ""} ${service.category || ""}`
      .toLowerCase();

  if (text.includes("facebook")) {
    return "Facebook";
  }

  if (text.includes("instagram")) {
    return "Instagram";
  }

  if (text.includes("tiktok") || text.includes("tik tok")) {
    return "TikTok";
  }

  if (text.includes("youtube")) {
    return "YouTube";
  }

  if (text.includes("telegram")) {
    return "Telegram";
  }

  if (text.includes("whatsapp")) {
    return "WhatsApp";
  }

  if (text.includes("spotify")) {
    return "Spotify";
  }

  return "Autres";
}

/*
==================================================
 TYPE SERVICE
==================================================
*/

function detectServiceType(service) {

  const text =
    `${service.name || ""} ${service.category || ""}`
      .toLowerCase();

  if (
    text.includes("follower") ||
    text.includes("followers") ||
    text.includes("abonné") ||
    text.includes("subscriber") ||
    text.includes("subscribers") ||
    text.includes("membre") ||
    text.includes("member")
  ) {
    return "follower";
  }

  if (
    text.includes("like") ||
    text.includes("likes")
  ) {
    return "like";
  }

  if (
    text.includes("view") ||
    text.includes("views") ||
    text.includes("vue") ||
    text.includes("vues")
  ) {
    return "view";
  }

  if (
    text.includes("save") ||
    text.includes("saves")
  ) {
    return "save";
  }

  if (
    text.includes("share") ||
    text.includes("shares") ||
    text.includes("partage")
  ) {
    return "share";
  }

  if (
    text.includes("play") ||
    text.includes("plays") ||
    text.includes("stream") ||
    text.includes("streams")
  ) {
    return "play";
  }

  if (
    text.includes("comment") ||
    text.includes("comments")
  ) {
    return "comment";
  }

  if (
    text.includes("reaction") ||
    text.includes("angry") ||
    text.includes("love") ||
    text.includes("haha") ||
    text.includes("wow") ||
    text.includes("sad") ||
    text.includes("care")
  ) {
    return "reaction";
  }

  return "default";
}

/*
==================================================
 PRIX CLIENT AUTOMATIQUE
==================================================
*/

function getClientPrice(category, type) {

  const rules =
    CLIENT_PRICE_RULES[category] ||
    CLIENT_PRICE_RULES.Autres;

  return Number(
    rules[type] ||
    rules.default ||
    1000
  );
}

/*
==================================================
 FOURNISSEUR
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
 CHARGER SERVICES FOURNISSEUR
==================================================
*/

async function loadProviderServices() {

  try {

    const data =
      await smmAfricaRequest({
        action: "services"
      });

    if (!Array.isArray(data)) {

      console.error(
        "SMM SERVICES: réponse invalide"
      );

      PROVIDER_SERVICES = [];

      return false;
    }

    PROVIDER_SERVICES =
      data
        .map(service => {

          const id =
            Number(
              service.service ||
              service.serviceId ||
              service.id
            );

          if (
            !Number.isInteger(id) ||
            id <= 0
          ) {
            return null;
          }

          const name =
            service.name ||
            service.service_name ||
            "Service sans nom";

          const category =
            detectCategory(service);

          const type =
            detectServiceType(service);

          const pricePer1000 =
            getClientPrice(
              category,
              type
            );

          return {

            id,

            providerId:
              id,

            name,

            category,

            type,

            providerRate:
              Number(
                service.rate || 0
              ),

            pricePer1000,

            min:
              Number(
                service.min || 1
              ),

            max:
              Number(
                service.max || 1000000
              ),

            refill:
              service.refill ||
              "NO REFILL",

            speed:
              service.speed ||
              "Normal",

            provider: "SMM Africa"

          };

        })
        .filter(Boolean);

    console.log(
      `📦 ${PROVIDER_SERVICES.length} services fournisseur chargés`
    );

    return true;

  } catch (error) {

    console.error(
      "SMM SERVICES ERROR:",
      error.message
    );

    PROVIDER_SERVICES = [];

    return false;
  }
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
 ACCUEIL
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

/*
==================================================
 ADMIN
==================================================
*/

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
        PROVIDER_SERVICES.length,

      minimumDeposit:
        MIN_DEPOSIT,

      time:
        new Date().toISOString()

    });

  }
);

/*
==================================================
 SERVICES CLIENT
==================================================
*/

app.get(
  "/api/services",
  async (req, res) => {

    if (
      PROVIDER_SERVICES.length === 0
    ) {

      await loadProviderServices();
    }

    const services =
      PROVIDER_SERVICES.map(
        service => ({

          id:
            service.id,

          serviceId:
            service.id,

          name:
            service.name,

          category:
            service.category,

          type:
            service.type,

          pricePer1000:
            service.pricePer1000,

          min:
            service.min,

          max:
            service.max,

          refill:
            service.refill,

          speed:
            service.speed

        })
      );

    res.json({

      success: true,

      currency: "CDF",

      count:
        services.length,

      services

    });

  }
);

/*
==================================================
 SERVICES FOURNISSEUR
==================================================
*/

app.get(
  "/api/smm/services",
  async (req, res) => {

    try {

      const data =
        await smmAfricaRequest({
          action: "services"
        });

      if (!Array.isArray(data)) {

        return res.status(502).json({

          success: false,

          message:
            "Réponse services invalide du fournisseur.",

          providerResponse:
            data

        });

      }

      const services =
        data
          .map(service => {

            const serviceId =
              Number(
                service.service ||
                service.serviceId ||
                service.id
              );

            if (
              !Number.isInteger(
                serviceId
              ) ||
              serviceId <= 0
            ) {
              return null;
            }

            return {

              serviceId,

              name:
                service.name ||
                service.service_name ||
                "Service sans nom",

              category:
                service.category ||
                detectCategory(service),

              rate:
                Number(
                  service.rate || 0
                ),

              min:
                Number(
                  service.min || 1
                ),

              max:
                Number(
                  service.max || 1000000
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

      res.json({

        success: true,

        currency: "CDF",

        count:
          services.length,

        services

      });

    } catch (error) {

      console.error(
        "SMM SERVICES ERROR:",
        error.message
      );

      res.status(502).json({

        success: false,

        message:
          "Impossible de récupérer les services.",

        error:
          error.message

      });

    }

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
          "Mot de passe: minimum 6 caractères."

      });

    }

    const cleanName =
      String(name).trim();

    const cleanEmail =
      String(email)
        .trim()
        .toLowerCase();

    const users =
      readJSON(USERS_FILE);

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
      readJSON(USERS_FILE);

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
          Number(user.balance) || 0

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
      readJSON(USERS_FILE);

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
          Number(user.balance) || 0

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
          `Dépôt minimum: ${MIN_DEPOSIT.toLocaleString("fr-FR")} FC.`

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
      readJSON(ORDERS_FILE);

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
      readJSON(ORDERS_FILE);

    const users =
      readJSON(USERS_FILE);

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
==================================================
 REJECT DEPOSIT
==================================================
*/

app.post(
  "/api/admin/deposit/:id/reject",
  (req, res) => {

    const orders =
      readJSON(ORDERS_FILE);

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
    ==============================================
    IMPORTANT
    ==============================================
    Le serviceId doit être un vrai ID fournisseur.
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

    if (
      numericQuantity <
        service.min ||
      numericQuantity >
        service.max
    ) {

      return res.status(400).json({

        success: false,

        message:
          `Quantité autorisée: ${service.min} à ${service.max}.`

      });

    }

    const users =
      readJSON(USERS_FILE);

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

    const price =
      calculatePrice(
        service,
        numericQuantity
      );

    const balance =
      Number(user.balance) || 0;

    if (
      balance <
      price
    ) {

      return res.status(400).json({

        success: false,

        message:
          `Solde insuffisant. Cette commande coûte ${price.toLocaleString("fr-FR")} FC.`

      });

    }

    /*
    ==============================================
    ENVOI FOURNISSEUR
    ==============================================
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
              Number(
                service.providerId
              ),

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
          "Le fournisseur n'a pas accepté la commande. Votre solde reste intact.",

        error:
          error.message

      });

    }

    if (
      !providerData.order
    ) {

      return res.status(502).json({

        success: false,

        message:
          "Le fournisseur n'a pas confirmé la commande. Aucun débit effectué."

      });

    }

    /*
    ==============================================
    FOURNISSEUR CONFIRMÉ
    ==============================================
    */

    user.balance =
      balance -
      price;

    const orders =
      readJSON(ORDERS_FILE);

    const order = {

      id:
        crypto.randomUUID(),

      type:
        "order",

      userId:
        user.id,

      serviceId:
        service.id,

      providerServiceId:
        service.providerId,

      service:
        service.name,

      category:
        service.category,

      typeService:
        service.type,

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
      readJSON(ORDERS_FILE);

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
      readJSON(ORDERS_FILE);

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
          "Impossible de vérifier le solde fournisseur.",

        error:
          error.message

      });

    }

  }
);

/*
==================================================
 RAFRAÎCHISSEMENT SERVICES
==================================================
*/

app.post(
  "/api/admin/refresh-services",
  async (req, res) => {

    const success =
      await loadProviderServices();

    if (!success) {

      return res.status(502).json({

        success: false,

        message:
          "Impossible de charger les services fournisseur."

      });

    }

    res.json({

      success: true,

      message:
        "Services fournisseur actualisés.",

      count:
        PROVIDER_SERVICES.length

    });

  }
);

/*
==================================================
 START
==================================================
*/

async function startServer() {

  console.log(
    "========================================"
  );

  console.log(
    "👑 LEADER NOSMY BOOST"
  );

  console.log(
    "🚀 Démarrage du serveur..."
  );

  console.log(
    `💳 Dépôt minimum: ${MIN_DEPOSIT} FC`
  );

  /*
  Charger les vrais services.
  Si la clé est invalide, le serveur reste
  quand même démarré mais les services fournisseur
  seront à 0 jusqu'à correction de la clé.
  */

  await loadProviderServices();

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
        `🚀 Serveur: ${PORT}`
      );

      console.log(
        `💳 Dépôt minimum: ${MIN_DEPOSIT} FC`
      );

      console.log(
        `📦 Services: ${PROVIDER_SERVICES.length}`
      );

      console.log(
        "========================================"
      );

    }
  );
}

startServer();
