const express = require("express");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const app = express();

const PORT = process.env.PORT || 10000;
const SMM_API_KEY = process.env.SMM_API_KEY;

const USERS_FILE = path.join(__dirname, "users.json");
const ORDERS_FILE = path.join(__dirname, "orders.json");
const DEPOSITS_FILE = path.join(__dirname, "deposits.json");

const MIN_DEPOSIT = 2500;

// ======================================================
// CONFIGURATION
// ======================================================

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ======================================================
// FICHIERS JSON
// ======================================================

function ensureFile(file, defaultValue = []) {
  if (!fs.existsSync(file)) {
    fs.writeFileSync(
      file,
      JSON.stringify(defaultValue, null, 2),
      "utf8"
    );
  }
}

ensureFile(USERS_FILE, []);
ensureFile(ORDERS_FILE, []);
ensureFile(DEPOSITS_FILE, []);

function readJSON(file) {
  try {
    return JSON.parse(
      fs.readFileSync(file, "utf8")
    );
  } catch {
    return [];
  }
}

function writeJSON(file, data) {
  fs.writeFileSync(
    file,
    JSON.stringify(data, null, 2),
    "utf8"
  );
}

// ======================================================
// SMM AFRICA API
// ======================================================

const SMM_URL = "https://smm.africa/api/v3";

async function smmAfricaRequest(payload) {

  if (!SMM_API_KEY) {
    throw new Error(
      "SMM_API_KEY manquante dans Render."
    );
  }

  const response = await fetch(
    SMM_URL,
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

  const text = await response.text();

  let data;

  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(
      `Réponse SMM invalide: ${text}`
    );
  }

  console.log(
    "SMM:",
    payload.action,
    response.status,
    JSON.stringify(data)
  );

  if (!response.ok || data.error) {

    throw new Error(
      data.error ||
      `Erreur API SMM (${response.status})`
    );

  }

  return data;
}

// ======================================================
// SERVICES SMM
// ======================================================

let smmServices = [];

// ======================================================
// PRIX LEADER NOSMY BOOST
// ======================================================
//
// IMPORTANT:
//
// Ces prix sont les prix CLIENT en CDF pour 1 000.
//
// Le tarif fournisseur SMM Africa reste séparé.
// Donc:
//
// fournisseur -> USD
// client      -> CDF
//
// ======================================================

function getLocalPriceCDF(service) {

  const name = String(
    service.name ||
    service.service ||
    service.title ||
    ""
  ).toLowerCase();

  // ====================================================
  // FACEBOOK
  // ====================================================

  if (
    name.includes("facebook") &&
    name.includes("post") &&
    name.includes("like") &&
    !name.includes("reaction")
  ) {
    return 360;
  }

  if (
    name.includes("facebook") &&
    name.includes("reaction") &&
    name.includes("angry")
  ) {
    return 360;
  }

  if (
    name.includes("facebook") &&
    name.includes("reaction") &&
    name.includes("care")
  ) {
    return 360;
  }

  if (
    name.includes("facebook") &&
    name.includes("reaction") &&
    name.includes("haha")
  ) {
    return 360;
  }

  if (
    name.includes("facebook") &&
    name.includes("reaction") &&
    name.includes("love")
  ) {
    return 360;
  }

  if (
    name.includes("facebook") &&
    name.includes("reaction") &&
    name.includes("sad")
  ) {
    return 360;
  }

  if (
    name.includes("facebook") &&
    name.includes("reaction") &&
    name.includes("wow")
  ) {
    return 360;
  }

  if (
    name.includes("facebook") &&
    name.includes("post") &&
    name.includes("reaction") &&
    name.includes("likes")
  ) {
    return 840;
  }

  if (
    name.includes("facebook") &&
    name.includes("post") &&
    name.includes("reaction") &&
    name.includes("love") &&
    name.includes("100%")
  ) {
    return 840;
  }

  if (
    name.includes("facebook") &&
    name.includes("profile") &&
    name.includes("page") &&
    name.includes("followers") &&
    name.includes("lifetime")
  ) {
    return 1656;
  }

  if (
    name.includes("facebook") &&
    name.includes("profile") &&
    name.includes("page") &&
    name.includes("followers") &&
    name.includes("365")
  ) {
    return 1584;
  }

  if (
    name.includes("facebook") &&
    name.includes("profile") &&
    name.includes("page") &&
    name.includes("followers") &&
    name.includes("90")
  ) {
    return 1536;
  }

  if (
    name.includes("facebook") &&
    name.includes("shares")
  ) {
    return 192;
  }

  if (
    name.includes("facebook") &&
    (
      name.includes("video") ||
      name.includes("reels")
    ) &&
    name.includes("views") &&
    (
      name.includes("100k") ||
      name.includes("300k")
    )
  ) {
    return 72;
  }

  if (
    name.includes("facebook") &&
    (
      name.includes("video") ||
      name.includes("reels")
    ) &&
    name.includes("views")
  ) {
    return 96;
  }

  // ====================================================
  // TIKTOK
  // ====================================================

  if (
    name.includes("tiktok") &&
    name.includes("followers") &&
    (
      name.includes("real") ||
      name.includes("users")
    )
  ) {
    return 6624;
  }

  if (
    name.includes("tiktok") &&
    name.includes("likes") &&
    name.includes("views")
  ) {
    return 1488;
  }

  if (
    name.includes("tiktok") &&
    name.includes("save") &&
    name.includes("30d")
  ) {
    return 384;
  }

  if (
    name.includes("tiktok") &&
    name.includes("save") &&
    name.includes("lifetime")
  ) {
    return 384;
  }

  if (
    name.includes("tiktok") &&
    name.includes("share") &&
    name.includes("lifetime")
  ) {
    return 288;
  }

  if (
    name.includes("tiktok") &&
    name.includes("shares")
  ) {
    return 432;
  }

  if (
    name.includes("tiktok") &&
    name.includes("video") &&
    name.includes("views") &&
    name.includes("15d")
  ) {
    return 456;
  }

  if (
    name.includes("tiktok") &&
    name.includes("video") &&
    name.includes("views") &&
    name.includes("21d")
  ) {
    return 480;
  }

  if (
    name.includes("tiktok") &&
    name.includes("video") &&
    name.includes("views") &&
    name.includes("7d")
  ) {
    return 456;
  }

  if (
    name.includes("tiktok") &&
    name.includes("video") &&
    name.includes("views") &&
    name.includes("sans baisse")
  ) {
    return 336;
  }

  // ====================================================
  // YOUTUBE
  // ====================================================

  if (
    name.includes("youtube") &&
    name.includes("views") &&
    name.includes("native social ads") &&
    name.includes("lifetime")
  ) {
    return 5400;
  }

  if (
    name.includes("youtube") &&
    name.includes("views") &&
    name.includes("native social ads")
  ) {
    return 5328;
  }

  if (
    name.includes("youtube") &&
    name.includes("subscribers") &&
    name.includes("bot")
  ) {
    return 648;
  }

  if (
    name.includes("youtube") &&
    name.includes("views") &&
    (
      name.includes("video") ||
      name.includes("shorts")
    ) &&
    name.includes("30d")
  ) {
    return 2592;
  }

  if (
    name.includes("youtube") &&
    name.includes("views") &&
    (
      name.includes("video") ||
      name.includes("shorts")
    )
  ) {
    return 2304;
  }

  // ====================================================
  // INSTAGRAM
  // ====================================================

  if (
    name.includes("instagram") &&
    name.includes("followers") &&
    name.includes("hq") &&
    name.includes("no refill")
  ) {
    return 1464;
  }

  if (
    name.includes("instagram") &&
    name.includes("followers") &&
    name.includes("hq") &&
    name.includes("30d")
  ) {
    return 1728;
  }

  if (
    name.includes("instagram") &&
    name.includes("followers") &&
    name.includes("hq") &&
    name.includes("365d")
  ) {
    return 2040;
  }

  if (
    name.includes("instagram") &&
    name.includes("followers") &&
    name.includes("hq") &&
    name.includes("60d")
  ) {
    return 1800;
  }

  if (
    name.includes("instagram") &&
    name.includes("followers") &&
    name.includes("hq") &&
    name.includes("90d")
  ) {
    return 1848;
  }

  if (
    name.includes("instagram") &&
    name.includes("followers") &&
    name.includes("old") &&
    name.includes("real") &&
    name.includes("30d")
  ) {
    return 1848;
  }

  if (
    name.includes("instagram") &&
    name.includes("followers") &&
    name.includes("old") &&
    name.includes("real") &&
    name.includes("365d")
  ) {
    return 2136;
  }

  if (
    name.includes("instagram") &&
    name.includes("followers") &&
    name.includes("old") &&
    name.includes("real") &&
    name.includes("60d")
  ) {
    return 1944;
  }

  if (
    name.includes("instagram") &&
    name.includes("likes") &&
    name.includes("hq") &&
    name.includes("lifetime")
  ) {
    return 432;
  }

  if (
    name.includes("instagram") &&
    name.includes("likes") &&
    name.includes("hq") &&
    name.includes("365d")
  ) {
    return 408;
  }

  // ====================================================
  // PRIX PAR DÉFAUT
  // ====================================================
  //
  // Si un nouveau service apparaît chez SMM Africa
  // mais n'est pas encore dans ton catalogue prix,
  // on utilise son tarif fournisseur converti.
  //
  // Cela évite qu'un service soit affiché à 0 FC.
  // ====================================================

  const providerRate = Number(
    service.rate || 0
  );

  if (
    Number.isFinite(providerRate) &&
    providerRate > 0
  ) {

    const USD_TO_FC = 2800;

    return Math.ceil(
      providerRate * USD_TO_FC
    );

  }

  return 0;
}

// ======================================================
// CHARGEMENT SERVICES
// ======================================================

async function loadSMMServices() {

  try {

    console.log(
      "🔄 Chargement des services SMM Africa..."
    );

    const result =
      await smmAfricaRequest({
        action: "services"
      });

    let services = result;

    if (
      result &&
      Array.isArray(result.services)
    ) {
      services = result.services;
    }

    if (!Array.isArray(services)) {
      throw new Error(
        "Catalogue services invalide."
      );
    }

    smmServices =
      services.map(service => {

        const localPrice =
          getLocalPriceCDF(service);

        return {
          ...service,

          // Prix affiché au client
          rateCDF: localPrice,

          // Alias utilisé par index.html
          priceCDF: localPrice
        };

      });

    console.log(
      `✅ ${smmServices.length} services chargés`
    );

    if (smmServices.length > 0) {

      console.log(
        "📦 Premier service:",
        JSON.stringify(
          smmServices[0]
        )
      );

    }

  } catch (error) {

    smmServices = [];

    console.error(
      "❌ SMM SERVICES ERROR:",
      error.message
    );

  }
}

// ======================================================
// SERVICES POUR LE SITE
// ======================================================

app.get(
  "/api/smm/services",
  async (req, res) => {

    try {

      if (smmServices.length === 0) {
        await loadSMMServices();
      }

      res.json({
        success: true,
        count: smmServices.length,
        services: smmServices
      });

    } catch (error) {

      res.status(500).json({
        success: false,
        message:
          "Impossible de récupérer les services.",
        error: error.message
      });

    }

  }
);

// ======================================================
// SOLDE FOURNISSEUR
// ======================================================

app.get(
  "/api/smm/balance",
  async (req, res) => {

    try {

      const balance =
        await smmAfricaRequest({
          action: "balance"
        });

      res.json({
        success: true,
        balance
      });

    } catch (error) {

      res.status(500).json({
        success: false,
        message: error.message
      });

    }

  }
);

// ======================================================
// INSCRIPTION
// ======================================================

app.post(
  "/api/register",
  (req, res) => {

    try {

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

      if (password.length < 6) {

        return res.status(400).json({
          success: false,
          message:
            "Le mot de passe doit contenir au moins 6 caractères."
        });

      }

      const users =
        readJSON(USERS_FILE);

      const exists =
        users.find(
          user =>
            String(user.email)
              .toLowerCase() ===
            String(email)
              .toLowerCase()
        );

      if (exists) {

        return res.status(400).json({
          success: false,
          message:
            "Cet email existe déjà."
        });

      }

      const user = {

        id:
          crypto.randomUUID(),

        name:
          String(name).trim(),

        email:
          String(email).trim(),

        password,

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

          balance: user.balance

        }

      });

    } catch (error) {

      console.error(error);

      res.status(500).json({

        success: false,

        message:
          "Erreur lors de l'inscription."

      });

    }

  }
);

// ======================================================
// CONNEXION
// ======================================================

app.post(
  "/api/login",
  (req, res) => {

    try {

      const {
        email,
        password
      } = req.body;

      const users =
        readJSON(USERS_FILE);

      const user =
        users.find(
          u =>
            String(u.email)
              .toLowerCase() ===
            String(email)
              .toLowerCase() &&
            u.password === password
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
            Number(user.balance || 0)

        }

      });

    } catch (error) {

      res.status(500).json({

        success: false,

        message:
          "Erreur de connexion."

      });

    }

  }
);

// ======================================================
// INFORMATIONS UTILISATEUR
// ======================================================

app.get(
  "/api/user/:id",
  (req, res) => {

    try {

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
            Number(user.balance || 0)

        }

      });

    } catch (error) {

      res.status(500).json({

        success: false,

        message:
          "Impossible de récupérer l'utilisateur."

      });

    }

  }
);

// ======================================================
// DEMANDE DE DEPOT
// ======================================================

app.post(
  "/api/deposit",
  (req, res) => {

    try {

      const {
        userId,
        amount,
        method
      } = req.body;

      const depositAmount =
        Number(amount);

      if (!userId) {

        return res.status(400).json({

          success: false,

          message:
            "Utilisateur invalide."

        });

      }

      if (
        !Number.isFinite(
          depositAmount
        ) ||
        depositAmount < MIN_DEPOSIT
      ) {

        return res.status(400).json({

          success: false,

          message:
            `Le dépôt minimum est de ${MIN_DEPOSIT.toLocaleString("fr-FR")} FC.`

        });

      }

      if (!method) {

        return res.status(400).json({

          success: false,

          message:
            "Choisissez un moyen de paiement."

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

      const deposits =
        readJSON(DEPOSITS_FILE);

      const deposit = {

        id:
          crypto.randomUUID(),

        userId,

        userName:
          user.name,

        amount:
          depositAmount,

        method,

        status:
          "pending",

        createdAt:
          new Date().toISOString()

      };

      deposits.push(deposit);

      writeJSON(
        DEPOSITS_FILE,
        deposits
      );

      res.json({

        success: true,

        message:
          "Demande de dépôt enregistrée. Attendez la validation.",

        deposit

      });

    } catch (error) {

      console.error(
        "DEPOSIT ERROR:",
        error
      );

      res.status(500).json({

        success: false,

        message:
          "Impossible d'enregistrer la demande."

      });

    }

  }
);

// ======================================================
// CREATION COMMANDE
// ======================================================
//
// IMPORTANT:
//
// /api/order est utilisé par ton index.html.
//
// Le client envoie:
// userId
// serviceId
// service
// link
// quantity
//
// Le serveur récupère lui-même:
// - le vrai service fournisseur
// - le vrai prix fournisseur
// - le prix CDF du catalogue LEADER NOSMY
//
// ======================================================

app.post(
  "/api/order",
  async (req, res) => {

    try {

      const {
        userId,
        serviceId,
        service,
        link,
        quantity
      } = req.body;

      if (
        !userId ||
        !serviceId ||
        !link ||
        !quantity
      ) {

        return res.status(400).json({

          success: false,

          message:
            "Informations de commande invalides."

        });

      }

      const users =
        readJSON(USERS_FILE);

      const userIndex =
        users.findIndex(
          u =>
            u.id === userId
        );

      if (userIndex === -1) {

        return res.status(404).json({

          success: false,

          message:
            "Utilisateur introuvable."

        });

      }

      if (smmServices.length === 0) {
        await loadSMMServices();
      }

      const selectedService =
        smmServices.find(
          s =>
            String(
              s.service ??
              s.id ??
              s.service_id
            ) ===
            String(serviceId)
        );

      if (!selectedService) {

        return res.status(400).json({

          success: false,

          message:
            "Service ID invalide ou service indisponible."

        });

      }

      const qty =
        Number(quantity);

      const min =
        Number(
          selectedService.min ??
          selectedService.minimum ??
          1
        );

      const max =
        Number(
          selectedService.max ??
          selectedService.maximum ??
          1000000
        );

      if (
        !Number.isInteger(qty) ||
        qty <= 0
      ) {

        return res.status(400).json({

          success: false,

          message:
            "Quantité invalide."

        });

      }

      if (
        qty < min ||
        qty > max
      ) {

        return res.status(400).json({

          success: false,

          message:
            `Quantité autorisée: ${min.toLocaleString("fr-FR")} à ${max.toLocaleString("fr-FR")}.`

        });

      }

      // =================================================
      // PRIX CLIENT CDF
      // =================================================

      const pricePer1000CDF =
        getLocalPriceCDF(
          selectedService
        );

      if (
        !Number.isFinite(
          pricePer1000CDF
        ) ||
        pricePer1000CDF <= 0
      ) {

        return res.status(400).json({

          success: false,

          message:
            "Prix de ce service non configuré."

        });

      }

      const chargeFC =
        Math.ceil(
          (
            pricePer1000CDF *
            qty
          ) / 1000
        );

      // =================================================
      // SOLDE
      // =================================================

      const balance =
        Number(
          users[userIndex].balance || 0
        );

      if (balance < chargeFC) {

        return res.status(400).json({

          success: false,

          message:
            "Solde insuffisant. Rechargez votre compte.",

          required:
            chargeFC,

          balance

        });

      }

      // =================================================
      // VRAI TARIF FOURNISSEUR
      // =================================================

      const providerRate =
        Number(
          selectedService.rate || 0
        );

      if (
        !Number.isFinite(
          providerRate
        )
      ) {

        return res.status(400).json({

          success: false,

          message:
            "Tarif fournisseur invalide."

        });

      }

      // =================================================
      // ENVOI SMM AFRICA
      // =================================================

      const idempotencyKey =
        crypto.randomUUID();

      const providerServiceId =
        Number(
          selectedService.service ??
          selectedService.id ??
          selectedService.service_id
        );

      const smmOrder =
        await smmAfricaRequest({

          action: "add",

          service:
            providerServiceId,

          link,

          quantity: qty,

          idempotency_key:
            idempotencyKey

        });

      if (!smmOrder.order) {

        throw new Error(
          "SMM Africa n'a pas retourné d'ID de commande."
        );

      }

      // =================================================
      // DEDUCTION SOLDE
      // =================================================

      users[userIndex].balance =
        balance - chargeFC;

      writeJSON(
        USERS_FILE,
        users
      );

      // =================================================
      // ENREGISTREMENT COMMANDE
      // =================================================

      const orders =
        readJSON(ORDERS_FILE);

      const order = {

        id:
          crypto.randomUUID(),

        userId,

        service:
          providerServiceId,

        serviceName:
          selectedService.name ||
          service ||
          "Service",

        link,

        quantity:
          qty,

        price:
          chargeFC,

        pricePer1000:
          pricePer1000CDF,

        providerRate,

        chargeFC,

        smmOrderId:
          smmOrder.order,

        providerOrderId:
          smmOrder.order,

        status:
          smmOrder.queued
            ? "Pending"
            : "Processing",

        providerStatus:
          smmOrder.queued
            ? "Pending"
            : "Processing",

        createdAt:
          new Date().toISOString()

      };

      orders.push(order);

      writeJSON(
        ORDERS_FILE,
        orders
      );

      // =================================================
      // REPONSE INDEX
      // =================================================

      res.json({

        success: true,

        message:
          "Commande envoyée avec succès.",

        balance:
          users[userIndex].balance,

        order

      });

    } catch (error) {

      console.error(
        "❌ ORDER ERROR:",
        error.message
      );

      res.status(500).json({

        success: false,

        message:
          error.message ||
          "Erreur lors de la commande."

      });

    }

  }
);

// ======================================================
// COMPATIBILITE ANCIENNE ROUTE
// ======================================================

app.post(
  "/api/smm/order",
  async (req, res) => {

    try {

      req.body.serviceId =
        req.body.serviceId ||
        req.body.service;

      const {
        userId,
        serviceId,
        link,
        quantity
      } = req.body;

      const fakeReq = {
        body: {
          userId,
          serviceId,
          service:
            req.body.service,
          link,
          quantity
        }
      };

      req.body = fakeReq.body;

      // La route principale est appelée
      // via une fonction séparée plus bas.
      //
      // Pour compatibilité, on redirige
      // vers /api/order côté client.
      //
      // Si ancien client utilisé:
      return res.status(307).json({

        success: false,

        message:
          "Utilisez maintenant /api/order."

      });

    } catch (error) {

      res.status(500).json({

        success: false,

        message:
          error.message

      });

    }

  }
);

// ======================================================
// STATUT COMMANDE FOURNISSEUR
// ======================================================

app.get(
  "/api/smm/order/:id",
  async (req, res) => {

    try {

      const orderId =
        Number(
          req.params.id
        );

      if (!Number.isFinite(orderId)) {

        return res.status(400).json({

          success: false,

          message:
            "ID commande invalide."

        });

      }

      const result =
        await smmAfricaRequest({

          action:
            "status",

          order:
            orderId

        });

      res.json({

        success: true,

        order:
          result

      });

    } catch (error) {

      res.status(500).json({

        success: false,

        message:
          error.message

      });

    }

  }
);

// ======================================================
// COMMANDES UTILISATEUR
// ======================================================

app.get(
  "/api/orders/:userId",
  (req, res) => {

    try {

      const orders =
        readJSON(ORDERS_FILE);

      const userOrders =
        orders.filter(
          order =>
            order.userId ===
            req.params.userId
        );

      res.json({

        success: true,

        orders:
          userOrders

      });

    } catch (error) {

      res.status(500).json({

        success: false,

        message:
          "Impossible de récupérer les commandes."

      });

    }

  }
);

// ======================================================
// DEPOTS UTILISATEUR
// ======================================================

app.get(
  "/api/deposits/:userId",
  (req, res) => {

    try {

      const deposits =
        readJSON(
          DEPOSITS_FILE
        );

      const userDeposits =
        deposits.filter(
          deposit =>
            deposit.userId ===
            req.params.userId
        );

      res.json({

        success: true,

        deposits:
          userDeposits

      });

    } catch (error) {

      res.status(500).json({

        success: false,

        message:
          "Impossible de récupérer les dépôts."

      });

    }

  }
);

// ======================================================
// HEALTH
// ======================================================

app.get(
  "/api/health",
  (req, res) => {

    res.json({

      success: true,

      server:
        "LEADER NOSMY BOOST",

      smmConfigured:
        Boolean(SMM_API_KEY),

      servicesLoaded:
        smmServices.length,

      minDeposit:
        MIN_DEPOSIT,

      currency:
        "CDF"

    });

  }
);

// ======================================================
// SITE WEB
// ======================================================

app.use(
  express.static(
    path.join(__dirname)
  )
);

// ======================================================
// 404 API
// ======================================================

app.use(
  (req, res) => {

    if (
      req.path.startsWith("/api/")
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

// ======================================================
// DEMARRAGE
// ======================================================

app.listen(
  PORT,
  async () => {

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
      `💰 Devise client: CDF`
    );

    console.log(
      `🔐 API SMM configurée: ${Boolean(SMM_API_KEY)}`
    );

    console.log(
      "========================================"
    );

    await loadSMMServices();

    console.log(
      "========================================"
    );

    console.log(
      `📦 Services chargés: ${smmServices.length}`
    );

    console.log(
      "========================================"
    );

  }
);
