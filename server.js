const express = require("express");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const app = express();

const PORT = process.env.PORT || 10000;
const SMM_API_KEY = process.env.SMM_API_KEY;

const USERS_FILE = path.join(__dirname, "users.json");
const ORDERS_FILE = path.join(__dirname, "orders.json");

const MIN_DEPOSIT = 2500;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ================================
// FICHIERS JSON
// ================================

function ensureFile(file, defaultValue = []) {
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, JSON.stringify(defaultValue, null, 2));
  }
}

ensureFile(USERS_FILE, []);
ensureFile(ORDERS_FILE, []);

function readJSON(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return [];
  }
}

function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// ================================
// SMM AFRICA API V3
// ================================

const SMM_URL = "https://smm.africa/api/v3";

async function smmAfricaRequest(payload) {
  if (!SMM_API_KEY) {
    throw new Error("SMM_API_KEY manquante dans Render");
  }

  const response = await fetch(SMM_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${SMM_API_KEY}`
    },
    body: JSON.stringify(payload)
  });

  const text = await response.text();

  let data;

  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Réponse SMM invalide: ${text}`);
  }

  console.log(
    `SMM: ${payload.action}`,
    response.status,
    JSON.stringify(data)
  );

  if (!response.ok || data.error) {
    throw new Error(data.error || `Erreur API SMM (${response.status})`);
  }

  return data;
}

// ================================
// SERVICES
// ================================

let smmServices = [];

async function loadSMMServices() {
  try {
    console.log("🔄 Chargement des services SMM Africa...");

    const services = await smmAfricaRequest({
      action: "services"
    });

    if (!Array.isArray(services)) {
      throw new Error("Catalogue services invalide");
    }

    smmServices = services;

    console.log(
      `✅ ${smmServices.length} services SMM chargés`
    );

    if (smmServices.length > 0) {
      console.log(
        "📦 Premier service:",
        JSON.stringify(smmServices[0])
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

// ================================
// API SERVICES POUR LE SITE
// ================================

app.get("/api/smm/services", async (req, res) => {
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
      message: "Impossible de récupérer les services.",
      error: error.message
    });

  }
});

// ================================
// SOLDE SMM AFRICA
// ================================

app.get("/api/smm/balance", async (req, res) => {
  try {

    const balance = await smmAfricaRequest({
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
});

// ================================
// INSCRIPTION
// ================================

app.post("/api/register", (req, res) => {

  try {

    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Tous les champs sont obligatoires."
      });
    }

    const users = readJSON(USERS_FILE);

    const exists = users.find(
      user => user.email.toLowerCase() === email.toLowerCase()
    );

    if (exists) {
      return res.status(400).json({
        success: false,
        message: "Cet email existe déjà."
      });
    }

    const user = {
      id: crypto.randomUUID(),
      name,
      email,
      password,
      balance: 0,
      createdAt: new Date().toISOString()
    };

    users.push(user);

    writeJSON(USERS_FILE, users);

    res.json({
      success: true,
      message: "Compte créé avec succès.",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        balance: user.balance
      }
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: "Erreur lors de l'inscription."
    });

  }
});

// ================================
// CONNEXION
// ================================

app.post("/api/login", (req, res) => {

  try {

    const { email, password } = req.body;

    const users = readJSON(USERS_FILE);

    const user = users.find(
      u =>
        u.email.toLowerCase() === String(email).toLowerCase() &&
        u.password === password
    );

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Email ou mot de passe incorrect."
      });
    }

    res.json({
      success: true,
      message: "Connexion réussie.",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        balance: user.balance
      }
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: "Erreur de connexion."
    });

  }
});

// ================================
// CREATION COMMANDE
// ================================

app.post("/api/smm/order", async (req, res) => {

  try {

    const {
      userId,
      service,
      link,
      quantity
    } = req.body;

    if (!userId || !service || !link || !quantity) {
      return res.status(400).json({
        success: false,
        message: "Informations de commande invalides."
      });
    }

    const users = readJSON(USERS_FILE);

    const userIndex = users.findIndex(
      u => u.id === userId
    );

    if (userIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Utilisateur introuvable."
      });
    }

    const selectedService = smmServices.find(
      s => String(s.service) === String(service)
    );

    if (!selectedService) {
      return res.status(400).json({
        success: false,
        message: "Service ID invalide ou service indisponible."
      });
    }

    const qty = Number(quantity);
    const min = Number(selectedService.min);
    const max = Number(selectedService.max);

    if (!Number.isFinite(qty)) {
      return res.status(400).json({
        success: false,
        message: "Quantité invalide."
      });
    }

    if (qty < min || qty > max) {
      return res.status(400).json({
        success: false,
        message: `Quantité autorisée: ${min} à ${max}.`
      });
    }

    /*
      SMM Africa renvoie les tarifs en USD.
      rate = prix pour 1000 unités.
    */

    const rate = Number(selectedService.rate);

    if (!Number.isFinite(rate)) {
      return res.status(400).json({
        success: false,
        message: "Tarif du service invalide."
      });
    }

    const chargeUSD = (rate / 1000) * qty;

    // Pour l'instant conversion affichage interne.
    // À ajuster selon ton vrai taux USD -> FC.
    const USD_TO_FC = 2800;

    const chargeFC = Math.ceil(
      chargeUSD * USD_TO_FC
    );

    if (users[userIndex].balance < chargeFC) {
      return res.status(400).json({
        success: false,
        message: "Solde insuffisant.",
        required: chargeFC,
        balance: users[userIndex].balance
      });
    }

    const idempotencyKey =
      crypto.randomUUID();

    const smmOrder = await smmAfricaRequest({
      action: "add",
      service: Number(service),
      link,
      quantity: qty,
      idempotency_key: idempotencyKey
    });

    if (!smmOrder.order) {
      throw new Error(
        "SMM Africa n'a pas retourné d'ID de commande."
      );
    }

    // Déduction après confirmation API
    users[userIndex].balance -= chargeFC;

    writeJSON(USERS_FILE, users);

    const orders = readJSON(ORDERS_FILE);

    const order = {
      id: crypto.randomUUID(),
      userId,
      service: Number(service),
      serviceName: selectedService.name,
      link,
      quantity: qty,
      chargeUSD,
      chargeFC,
      smmOrderId: smmOrder.order,
      status: smmOrder.queued
        ? "Pending"
        : "Processing",
      createdAt: new Date().toISOString()
    };

    orders.push(order);

    writeJSON(ORDERS_FILE, orders);

    res.json({
      success: true,
      message: "Commande envoyée avec succès.",
      order
    });

  } catch (error) {

    console.error(
      "❌ ORDER ERROR:",
      error.message
    );

    res.status(500).json({
      success: false,
      message: error.message
    });

  }
});

// ================================
// STATUT COMMANDE
// ================================

app.get("/api/smm/order/:id", async (req, res) => {

  try {

    const orderId = req.params.id;

    const result = await smmAfricaRequest({
      action: "status",
      order: Number(orderId)
    });

    res.json({
      success: true,
      order: result
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message
    });

  }
});

// ================================
// COMMANDES UTILISATEUR
// ================================

app.get("/api/orders/:userId", (req, res) => {

  try {

    const orders = readJSON(ORDERS_FILE);

    const userOrders = orders.filter(
      order => order.userId === req.params.userId
    );

    res.json({
      success: true,
      orders: userOrders
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: "Impossible de récupérer les commandes."
    });

  }
});

// ================================
// SANTE DU SERVEUR
// ================================

app.get("/api/health", (req, res) => {

  res.json({
    success: true,
    server: "LEADER NOSMY BOOST",
    smmConfigured: Boolean(SMM_API_KEY),
    servicesLoaded: smmServices.length
  });

});

// ================================
// SITE WEB
// ================================

app.use(express.static(path.join(__dirname)));

// ================================
// 404 API
// ================================

app.use((req, res) => {

  if (req.path.startsWith("/api/")) {
    return res.status(404).json({
      success: false,
      message: "Route API introuvable."
    });
  }

  res.sendFile(
    path.join(__dirname, "index.html")
  );

});

// ================================
// DEMARRAGE
// ================================

app.listen(PORT, async () => {

  console.log("========================================");
  console.log("👑 LEADER NOSMY BOOST");
  console.log(`🚀 Serveur: ${PORT}`);
  console.log(`💳 Dépôt minimum: ${MIN_DEPOSIT} FC`);
  console.log(
    `🔐 API SMM configurée: ${Boolean(SMM_API_KEY)}`
  );
  console.log("========================================");

  await loadSMMServices();

  console.log("========================================");
  console.log(
    `📦 Services chargés: ${smmServices.length}`
  );
  console.log("========================================");

});
