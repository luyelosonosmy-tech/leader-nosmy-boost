const express = require("express");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;

const SMM_API_URL =
  process.env.SMM_API_URL || "https://smm.africa/api/v2";

const SMM_API_KEY = process.env.SMM_API_KEY || "";
const ADMIN_KEY = process.env.ADMIN_KEY || "change-this-admin-key";

const USERS_FILE = path.join(__dirname, "users.json");
const ORDERS_FILE = path.join(__dirname, "orders.json");
const DEPOSITS_FILE = path.join(__dirname, "deposits.json");
const PRICES_FILE = path.join(__dirname, "prices.json");

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

function ensureFile(file, defaultValue) {
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, JSON.stringify(defaultValue, null, 2));
  }
}

ensureFile(USERS_FILE, []);
ensureFile(ORDERS_FILE, []);
ensureFile(DEPOSITS_FILE, []);
ensureFile(PRICES_FILE, {
  facebook: [],
  tiktok: [],
  youtube: [],
  instagram: []
});

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

function hashPassword(password) {
  return crypto
    .createHash("sha256")
    .update(String(password))
    .digest("hex");
}

function createId(prefix) {
  return `${prefix}_${Date.now()}_${crypto
    .randomBytes(4)
    .toString("hex")}`;
}

async function smmRequest(params) {
  if (!SMM_API_KEY) {
    throw new Error("SMM_API_KEY n'est pas configurée.");
  }

  const body = new URLSearchParams({
    key: SMM_API_KEY,
    ...params
  });

  const response = await fetch(SMM_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body
  });

  if (!response.ok) {
    throw new Error(`Erreur fournisseur SMM: ${response.status}`);
  }

  return await response.json();
}

/*
========================================
 ACCUEIL
========================================
*/

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

/*
========================================
 SERVICES / PRIX
========================================
*/

app.get("/api/services", (req, res) => {
  try {
    const prices = readJSON(PRICES_FILE);

    res.json({
      success: true,
      services: prices
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Impossible de charger les services."
    });
  }
});

/*
========================================
 INSCRIPTION
========================================
*/

app.post("/api/register", (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({
      success: false,
      message: "Tous les champs sont obligatoires."
    });
  }

  if (String(password).length < 6) {
    return res.status(400).json({
      success: false,
      message: "Le mot de passe doit contenir au moins 6 caractères."
    });
  }

  const users = readJSON(USERS_FILE);

  const normalizedEmail = String(email).trim().toLowerCase();

  if (
    users.some(
      user => String(user.email).toLowerCase() === normalizedEmail
    )
  ) {
    return res.status(400).json({
      success: false,
      message: "Cette adresse e-mail existe déjà."
    });
  }

  const user = {
    id: createId("user"),
    name: String(name).trim(),
    email: normalizedEmail,
    password: hashPassword(password),
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
});

/*
========================================
 CONNEXION
========================================
*/

app.post("/api/login", (req, res) => {
  const { email, password } = req.body;

  const users = readJSON(USERS_FILE);

  const user = users.find(
    u =>
      String(u.email).toLowerCase() ===
      String(email || "").trim().toLowerCase()
  );

  if (!user || user.password !== hashPassword(password || "")) {
    return res.status(401).json({
      success: false,
      message: "E-mail ou mot de passe incorrect."
    });
  }

  res.json({
    success: true,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      balance: user.balance || 0
    }
  });
});

/*
========================================
 PROFIL
========================================
*/

app.get("/api/user/:id", (req, res) => {
  const users = readJSON(USERS_FILE);

  const user = users.find(u => u.id === req.params.id);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "Utilisateur introuvable."
    });
  }

  res.json({
    success: true,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      balance: user.balance || 0
    }
  });
});

/*
========================================
 DEMANDE DE DÉPÔT
========================================
*/

app.post("/api/deposit", (req, res) => {
  const { userId, amount, method, transactionId } = req.body;

  const value = Number(amount);

  if (!userId || !value || value < 1000 || !method) {
    return res.status(400).json({
      success: false,
      message: "Dépôt invalide. Minimum: 1 000 FC."
    });
  }

  const users = readJSON(USERS_FILE);
  const deposits = readJSON(DEPOSITS_FILE);

  const user = users.find(u => u.id === userId);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "Utilisateur introuvable."
    });
  }

  const deposit = {
    id: createId("deposit"),
    userId,
    amount: value,
    method,
    transactionId: transactionId || "",
    status: "pending",
    createdAt: new Date().toISOString()
  };

  deposits.push(deposit);
  writeJSON(DEPOSITS_FILE, deposits);

  res.json({
    success: true,
    message: "Demande de dépôt envoyée.",
    deposit
  });
});

/*
========================================
 COMMANDER UN SERVICE
========================================
*/

app.post("/api/order", async (req, res) => {
  try {
    const {
      userId,
      serviceId,
      link,
      quantity
    } = req.body;

    const users = readJSON(USERS_FILE);
    const orders = readJSON(ORDERS_FILE);
    const prices = readJSON(PRICES_FILE);

    const user = users.find(u => u.id === userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Utilisateur introuvable."
      });
    }

    if (!serviceId || !link || !quantity) {
      return res.status(400).json({
        success: false,
        message: "Informations de commande invalides."
      });
    }

    let service = null;

    for (const platform of Object.keys(prices)) {
      const found = prices[platform].find(
        item => String(item.id) === String(serviceId)
      );

      if (found) {
        service = found;
        break;
      }
    }

    if (!service) {
      return res.status(400).json({
        success: false,
        message: "Service introuvable."
      });
    }

    const qty = Number(quantity);

    if (!Number.isInteger(qty) || qty < 1000) {
      return res.status(400).json({
        success: false,
        message: "Quantité minimale: 1 000."
      });
    }

    const pricePer1000 = Number(service.price);

    const total = Math.ceil((qty / 1000) * pricePer1000);

    if ((user.balance || 0) < total) {
      return res.status(400).json({
        success: false,
        message: "Solde insuffisant."
      });
    }

    let providerOrder = null;

    /*
      Si le service possède un ID fournisseur,
      on envoie réellement la commande à l'API SMM.
    */

    if (service.providerServiceId && SMM_API_KEY) {
      const result = await smmRequest({
        action: "add",
        service: String(service.providerServiceId),
        link: String(link),
        quantity: String(qty)
      });

      providerOrder = result.order || null;

      if (!providerOrder) {
        throw new Error(
          result.error || "Le fournisseur n'a pas accepté la commande."
        );
      }
    }

    user.balance = Number(user.balance || 0) - total;

    const order = {
      id: createId("order"),
      userId,
      serviceId: service.id,
      serviceName: service.name,
      link: String(link),
      quantity: qty,
      price: total,
      providerOrderId: providerOrder,
      status: providerOrder ? "processing" : "pending",
      createdAt: new Date().toISOString()
    };

    orders.push(order);

    writeJSON(USERS_FILE, users);
    writeJSON(ORDERS_FILE, orders);

    res.json({
      success: true,
      message: "Commande créée avec succès.",
      order
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: error.message || "Erreur lors de la commande."
    });
  }
});

/*
========================================
 COMMANDES CLIENT
========================================
*/

app.get("/api/orders/:userId", (req, res) => {
  const orders = readJSON(ORDERS_FILE);

  const userOrders = orders.filter(
    order => order.userId === req.params.userId
  );

  res.json({
    success: true,
    orders: userOrders.reverse()
  });
});

/*
========================================
 ADMIN — CONNEXION SIMPLE
========================================
*/

function checkAdmin(req, res, next) {
  const key =
    req.headers["x-admin-key"] ||
    req.query.key ||
    req.body.adminKey;

  if (!key || key !== ADMIN_KEY) {
    return res.status(403).json({
      success: false,
      message: "Accès administrateur refusé."
    });
  }

  next();
}

/*
========================================
 ADMIN — VOIR DÉPÔTS
========================================
*/

app.get("/api/admin/deposits", checkAdmin, (req, res) => {
  const deposits = readJSON(DEPOSITS_FILE);

  res.json({
    success: true,
    deposits: deposits.reverse()
  });
});

/*
========================================
 ADMIN — VALIDER DÉPÔT
========================================
*/

app.post("/api/admin/deposit/approve", checkAdmin, (req, res) => {
  const { depositId } = req.body;

  const deposits = readJSON(DEPOSITS_FILE);
  const users = readJSON(USERS_FILE);

  const deposit = deposits.find(d => d.id === depositId);

  if (!deposit) {
    return res.status(404).json({
      success: false,
      message: "Dépôt introuvable."
    });
  }

  if (deposit.status !== "pending") {
    return res.status(400).json({
      success: false,
      message: "Ce dépôt a déjà été traité."
    });
  }

  const user = users.find(u => u.id === deposit.userId);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "Utilisateur introuvable."
    });
  }

  user.balance = Number(user.balance || 0) + Number(deposit.amount);

  deposit.status = "approved";
  deposit.approvedAt = new Date().toISOString();

  writeJSON(USERS_FILE, users);
  writeJSON(DEPOSITS_FILE, deposits);

  res.json({
    success: true,
    message: "Dépôt validé.",
    balance: user.balance
  });
});

/*
========================================
 ADMIN — REFUSER DÉPÔT
========================================
*/

app.post("/api/admin/deposit/reject", checkAdmin, (req, res) => {
  const { depositId } = req.body;

  const deposits = readJSON(DEPOSITS_FILE);

  const deposit = deposits.find(d => d.id === depositId);

  if (!deposit) {
    return res.status(404).json({
      success: false,
      message: "Dépôt introuvable."
    });
  }

  if (deposit.status !== "pending") {
    return res.status(400).json({
      success: false,
      message: "Ce dépôt a déjà été traité."
    });
  }

  deposit.status = "rejected";
  deposit.rejectedAt = new Date().toISOString();

  writeJSON(DEPOSITS_FILE, deposits);

  res.json({
    success: true,
    message: "Dépôt refusé."
  });
});

/*
========================================
 ADMIN — COMMANDES
========================================
*/

app.get("/api/admin/orders", checkAdmin, (req, res) => {
  const orders = readJSON(ORDERS_FILE);

  res.json({
    success: true,
    orders: orders.reverse()
  });
});

/*
========================================
 TEST API
========================================
*/

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    panel: "LEADER NOSMY BOOST",
    status: "online",
    apiConfigured: Boolean(SMM_API_KEY)
  });
});

/*
========================================
 SERVEUR
========================================
*/

app.listen(PORT, () => {
  console.log("====================================");
  console.log(" LEADER NOSMY BOOST");
  console.log(" SMM PANEL ONLINE");
  console.log(` Port: ${PORT}`);
  console.log("====================================");
});
