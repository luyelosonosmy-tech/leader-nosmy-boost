const express = require("express");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;

/*
==================================================
 LEADER NOSMY BOOST
 SERVER V2
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

 IMPORTANT:
 Remplace UNIQUEMENT les serviceId par les vrais
 IDs retournés par ton fournisseur.

 Le prix est ton prix de vente client.
 Le prix est calculé pour 1K.
*/

const SERVICES = [

  // FACEBOOK
  {
    serviceId: 0,
    name: "Facebook Post Likes 👍",
    category: "Facebook",
    pricePer1000: 360,
    min: 10,
    max: 100000,
    refill: "NO REFILL",
    speed: "Instant"
  },

  {
    serviceId: 0,
    name: "Facebook Post Reaction - Angry 😡",
    category: "Facebook",
    pricePer1000: 360,
    min: 10,
    max: 100000,
    refill: "NO REFILL",
    speed: "Instant"
  },

  {
    serviceId: 0,
    name: "Facebook Post Reaction - Care 🤗",
    category: "Facebook",
    pricePer1000: 360,
    min: 10,
    max: 100000,
    refill: "NO REFILL",
    speed: "Instant"
  },

  {
    serviceId: 0,
    name: "Facebook Post Reaction - Haha 😂",
    category: "Facebook",
    pricePer1000: 360,
    min: 10,
    max: 100000,
    refill: "NO REFILL",
    speed: "Instant"
  },

  {
    serviceId: 0,
    name: "Facebook Post Reaction - Likes 👍 Real",
    category: "Facebook",
    pricePer1000: 840,
    min: 10,
    max: 100000,
    refill: "NO REFILL",
    speed: "Instant"
  },

  {
    serviceId: 0,
    name: "Facebook Post Reaction - Love ❤️ Real",
    category: "Facebook",
    pricePer1000: 840,
    min: 10,
    max: 100000,
    refill: "NO REFILL",
    speed: "Instant"
  },

  {
    serviceId: 0,
    name: "Facebook Post Reaction - Love 💖",
    category: "Facebook",
    pricePer1000: 360,
    min: 10,
    max: 100000,
    refill: "NO REFILL",
    speed: "Instant"
  },

  {
    serviceId: 0,
    name: "Facebook Post Reaction - Sad 😭",
    category: "Facebook",
    pricePer1000: 360,
    min: 10,
    max: 100000,
    refill: "NO REFILL",
    speed: "Instant"
  },

  {
    serviceId: 0,
    name: "Facebook Post Reaction - Wow 😮",
    category: "Facebook",
    pricePer1000: 360,
    min: 10,
    max: 100000,
    refill: "NO REFILL",
    speed: "Instant"
  },

  {
    serviceId: 0,
    name: "Facebook Profile/Page Followers - Lifetime",
    category: "Facebook",
    pricePer1000: 1656,
    min: 10,
    max: 100000,
    refill: "Lifetime",
    speed: "Instant"
  },

  {
    serviceId: 0,
    name: "Facebook Profile/Page Followers - Refill 365D",
    category: "Facebook",
    pricePer1000: 1584,
    min: 10,
    max: 100000,
    refill: "365D",
    speed: "Instant"
  },

  {
    serviceId: 0,
    name: "Facebook Profile/Page Followers - Refill 90D",
    category: "Facebook",
    pricePer1000: 1536,
    min: 10,
    max: 100000,
    refill: "90D",
    speed: "Instant"
  },

  {
    serviceId: 0,
    name: "Facebook Shares",
    category: "Facebook",
    pricePer1000: 192,
    min: 10,
    max: 50000,
    refill: "30D",
    speed: "Instant"
  },

  {
    serviceId: 0,
    name: "Facebook Video/Reels Views - Refill 30D",
    category: "Facebook",
    pricePer1000: 72,
    min: 10,
    max: 1000000,
    refill: "30D",
    speed: "Instant"
  },

  {
    serviceId: 0,
    name: "Facebook Video/Reels Views - Refill 30D Premium",
    category: "Facebook",
    pricePer1000: 96,
    min: 10,
    max: 5000000,
    refill: "30D",
    speed: "Instant"
  },

  // INSTAGRAM
  {
    serviceId: 0,
    name: "Instagram Followers - HQ - NO REFILL",
    category: "Instagram",
    pricePer1000: 1464,
    min: 10,
    max: 1000000,
    refill: "NO REFILL",
    speed: "Instant"
  },

  {
    serviceId: 0,
    name: "Instagram Followers - HQ - Refill 30D",
    category: "Instagram",
    pricePer1000: 1728,
    min: 10,
    max: 1000000,
    refill: "30D",
    speed: "Instant"
  },

  {
    serviceId: 0,
    name: "Instagram Followers - HQ - Refill 365D",
    category: "Instagram",
    pricePer1000: 2040,
    min: 10,
    max: 1000000,
    refill: "365D",
    speed: "Instant"
  },

  {
    serviceId: 0,
    name: "Instagram Followers - HQ - Refill 60D",
    category: "Instagram",
    pricePer1000: 1800,
    min: 10,
    max: 1000000,
    refill: "60D",
    speed: "Instant"
  },

  {
    serviceId: 0,
    name: "Instagram Followers - HQ - Refill 90D",
    category: "Instagram",
    pricePer1000: 1848,
    min: 10,
    max: 1000000,
    refill: "90D",
    speed: "Instant"
  },

  {
    serviceId: 0,
    name: "Instagram Followers - Old & Real - Refill 30D",
    category: "Instagram",
    pricePer1000: 1848,
    min: 10,
    max: 100000,
    refill: "30D",
    speed: "Instant"
  },

  {
    serviceId: 0,
    name: "Instagram Followers - Old & Real - Refill 365D",
    category: "Instagram",
    pricePer1000: 2136,
    min: 10,
    max: 100000,
    refill: "365D",
    speed: "Instant"
  },

  {
    serviceId: 0,
    name: "Instagram Likes - HQ - Lifetime",
    category: "Instagram",
    pricePer1000: 432,
    min: 10,
    max: 5000000,
    refill: "Lifetime",
    speed: "Instant"
  },

  {
    serviceId: 0,
    name: "Instagram Likes - HQ - Refill 365D",
    category: "Instagram",
    pricePer1000: 408,
    min: 10,
    max: 5000000,
    refill: "365D",
    speed: "Instant"
  },

  // TIKTOK
  {
    serviceId: 0,
    name: "TikTok Followers - Real Users",
    category: "TikTok",
    pricePer1000: 6624,
    min: 10,
    max: 1000000,
    refill: "NO REFILL",
    speed: "Instant"
  },

  {
    serviceId: 0,
    name: "TikTok Likes + Views - Best Speed",
    category: "TikTok",
    pricePer1000: 1488,
    min: 10,
    max: 100000,
    refill: "NO REFILL",
    speed: "Fast"
  },

  {
    serviceId: 0,
    name: "TikTok Save - Refill 30D",
    category: "TikTok",
    pricePer1000: 384,
    min: 10,
    max: 10000000,
    refill: "30D",
    speed: "Instant"
  },

  {
    serviceId: 0,
    name: "TikTok Save - Lifetime",
    category: "TikTok",
    pricePer1000: 384,
    min: 10,
    max: 10000000,
    refill: "Lifetime",
    speed: "Instant"
  },

  {
    serviceId: 0,
    name: "TikTok Share - Lifetime",
    category: "TikTok",
    pricePer1000: 288,
    min: 10,
    max: 10000000,
    refill: "Lifetime",
    speed: "Instant"
  },

  {
    serviceId: 0,
    name: "TikTok Shares - NO REFILL",
    category: "TikTok",
    pricePer1000: 432,
    min: 10,
    max: 10000000,
    refill: "NO REFILL",
    speed: "Instant"
  },

  {
    serviceId: 0,
    name: "TikTok Video Views - Refill 15D",
    category: "TikTok",
    pricePer1000: 456,
    min: 10,
    max: 100000000,
    refill: "15D",
    speed: "Instant"
  },

  {
    serviceId: 0,
    name: "TikTok Video Views - Refill 21D",
    category: "TikTok",
    pricePer1000: 480,
    min: 10,
    max: 100000000,
    refill: "21D",
    speed: "Instant"
  },

  {
    serviceId: 0,
    name: "TikTok Video Views - Refill 7D",
    category: "TikTok",
    pricePer1000: 456,
    min: 10,
    max: 100000000,
    refill: "7D",
    speed: "Instant"
  },

  {
    serviceId: 0,
    name: "TikTok Video Views - Sans baisse",
    category: "TikTok",
    pricePer1000: 336,
    min: 10,
    max: 100000000,
    refill: "Sans baisse",
    speed: "Instant"
  },

  // YOUTUBE
  {
    serviceId: 0,
    name: "YouTube Views - Native Social Ads",
    category: "YouTube",
    pricePer1000: 5328,
    min: 500,
    max: 100000000,
    refill: "Lifetime",
    speed: "0-3h"
  },

  {
    serviceId: 0,
    name: "YouTube Subscribers - BOT",
    category: "YouTube",
    pricePer1000: 648,
    min: 10,
    max: 100000,
    refill: "NO REFILL",
    speed: "Instant"
  },

  {
    serviceId: 0,
    name: "YouTube Views - Native Social Ads",
    category: "YouTube",
    pricePer1000: 5400,
    min: 1000,
    max: 100000000,
    refill: "Lifetime",
    speed: "0-3h"
  },

  {
    serviceId: 0,
    name: "YouTube Views - Video/Shorts",
    category: "YouTube",
    pricePer1000: 2304,
    min: 10,
    max: 1000000,
    refill: "NO REFILL",
    speed: "Instant"
  },

  {
    serviceId: 0,
    name: "YouTube Views - Video/Shorts - Refill 30D",
    category: "YouTube",
    pricePer1000: 2592,
    min: 10,
    max: 1000000,
    refill: "30D",
    speed: "Instant"
  }

];

/*
==================================================
 OUTILS
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

    const data = JSON.parse(content);

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

function hashPassword(password) {

  return crypto
    .createHash("sha256")
    .update(String(password))
    .digest("hex");
}

function calculatePrice(service, quantity) {

  return Math.ceil(
    (Number(quantity) / 1000) *
    Number(service.pricePer1000)
  );
}

function getService(serviceId) {

  return SERVICES.find(
    service =>
      Number(service.serviceId) ===
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
==================================================
 HEALTH
==================================================
*/

app.get("/api/health", (req, res) => {

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

    time:
      new Date().toISOString()

  });

});

/*
==================================================
 SERVICES LOCAUX
==================================================

 Plus besoin de demander au fournisseur
 la liste des services à chaque visite.
==================================================
*/

app.get(
  "/api/services",
  (req, res) => {

    const services =
      SERVICES.map(service => ({

        id:
          service.serviceId,

        name:
          service.name,

        category:
          service.category,

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

      }));

    res.json({

      success: true,

      currency: "CDF",

      services

    });

  }
);


      /*
      ------------------------------------------
      Vérification réponse fournisseur
      ------------------------------------------
      */

      if (!Array.isArray(data)) {

        return res.status(502).json({

          success: false,

          message:
            "Réponse services invalide du fournisseur.",

          providerResponse:
            data

        });

      }

      /*
      ------------------------------------------
      Retourner les vrais services
      ------------------------------------------
      */

      const services =
        data.map(service => ({

          serviceId:
            Number(
              service.service ||
              service.serviceId ||
              service.id
            ),

          name:
            service.name ||
            service.service_name ||
            "Service sans nom",

          category:
            service.category ||
            "Autres",

          pricePer1000:
            Number(
              service.rate ||
              service.pricePer1000 ||
              0
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

        }));

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

    if (!name || !email || !password) {

      return res.status(400).json({

        success: false,

        message:
          "Tous les champs sont obligatoires."

      });

    }

    if (String(password).length < 6) {

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
          item.email === cleanEmail &&
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
          item.id === userId
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

    const service =
      getService(
        numericServiceId
      );

    if (!service) {

      return res.status(400).json({

        success: false,

        message:
          "Service introuvable."

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

    if (balance < price) {

      return res.status(400).json({

        success: false,

        message:
          `Solde insuffisant. Cette commande coûte ${price.toLocaleString("fr-FR")} FC.`

      });

    }

    /*
    ------------------------------------------
    IMPORTANT
    ------------------------------------------
    Le service doit avoir son vrai ID fournisseur.
    ------------------------------------------
    */

    if (
      !Number.isInteger(
        Number(service.serviceId)
      ) ||
      Number(service.serviceId) <= 0
    ) {

      return res.status(503).json({

        success: false,

        message:
          "Ce service n'est pas encore relié au fournisseur. Ajoute son vrai serviceId avant de commander."

      });

    }

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
                service.serviceId
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
          "Le fournisseur n'a pas accepté la commande. Votre solde reste intact."

      });

    }

    if (!providerData.order) {

      return res.status(502).json({

        success: false,

        message:
          "Le fournisseur n'a pas confirmé la commande. Aucun débit effectué."

      });

    }

    /*
    ------------------------------------------
    FOURNISSEUR CONFIRMÉ
    ------------------------------------------
    */

    user.balance =
      balance - price;

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
        numericServiceId,

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

    if (!order.providerOrderId) {

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
 START
==================================================
*/

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
      `📦 Services: ${SERVICES.length}`
    );

    console.log(
      "========================================"
    );

  }
);
