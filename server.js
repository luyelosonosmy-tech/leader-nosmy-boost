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
const PRINCE_FILE = path.join(__dirname, "prince.json");

/* ========================================
   FICHIERS JSON
======================================== */

function ensureFile(file, defaultData) {
  if (!fs.existsSync(file)) {
    fs.writeFileSync(
      file,
      JSON.stringify(defaultData, null, 2)
    );
  }
}

ensureFile(USERS_FILE, []);
ensureFile(ORDERS_FILE, []);

/* ========================================
   LECTURE / ÉCRITURE
======================================== */

function readJson(file, fallback = []) {
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
    console.error("Erreur lecture JSON:", error);
    return fallback;
  }
}

function writeJson(file, data) {
  fs.writeFileSync(
    file,
    JSON.stringify(data, null, 2)
  );
}

/* ========================================
   PRINCE.JSON
======================================== */

function getServices() {
  try {
    if (!fs.existsSync(PRINCE_FILE)) {
      return {};
    }

    const services =
      readJson(PRINCE_FILE, {});

    return services || {};

  } catch (error) {

    console.error(
      "Erreur prince.json:",
      error
    );

    return {};
  }
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
   ROUTE PRINCIPALE
======================================== */

app.get("/", (req, res) => {

  res.sendFile(
    path.join(__dirname, "index.html")
  );

});

/* ========================================
   SERVICES
======================================== */

app.get("/api/services", (req, res) => {

  try {

    const services = getServices();

    res.json({
      success: true,
      services
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      success: false,
      message: "Impossible de récupérer les services."
    });

  }

});

/* ========================================
   INSCRIPTION
======================================== */

app.post("/api/register", (req, res) => {

  try {

    const {
      name,
      email,
      password
    } = req.body;

    if (!name || !email || !password) {

      return res.json({
        success: false,
        message:
          "Tous les champs sont obligatoires."
      });

    }

    if (String(password).length < 6) {

      return res.json({
        success: false,
        message:
          "Le mot de passe doit contenir au moins 6 caractères."
      });

    }

    const users =
      readJson(USERS_FILE, []);

    const normalizedEmail =
      String(email)
        .trim()
        .toLowerCase();

    const existingUser =
      users.find(
        user =>
          String(user.email)
            .toLowerCase() ===
          normalizedEmail
      );

    if (existingUser) {

      return res.json({
        success: false,
        message:
          "Cette adresse e-mail existe déjà."
      });

    }

    const user = {

      id: generateId("user"),

      name:
        String(name).trim(),

      email:
        normalizedEmail,

      password:
        hashPassword(password),

      balance: 0,

      createdAt:
        new Date().toISOString()

    };

    users.push(user);

    writeJson(
      USERS_FILE,
      users
    );

    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      balance: user.balance
    };

    res.json({

      success: true,

      message:
        "Compte créé avec succès.",

      user: safeUser

    });

  } catch (error) {

    console.error(
      "Erreur inscription:",
      error
    );

    res.status(500).json({

      success: false,

      message:
        "Erreur du serveur."

    });

  }

});

/* ========================================
   CONNEXION
======================================== */

app.post("/api/login", (req, res) => {

  try {

    const {
      email,
      password
    } = req.body;

    if (!email || !password) {

      return res.json({

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

    const normalizedEmail =
      String(email)
        .trim()
        .toLowerCase();

    const hashedPassword =
      hashPassword(password);

    const user =
      users.find(
        item =>
          String(item.email)
            .toLowerCase() ===
            normalizedEmail &&
          item.password ===
            hashedPassword
      );

    if (!user) {

      return res.json({
