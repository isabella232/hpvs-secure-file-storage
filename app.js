const cookieParser = require("cookie-parser");
const compression = require("compression");
const morgan = require("morgan");

const express = require("express");
const session = require("express-session");
const passport = require("passport");
const helmet = require("helmet");
const express_enforces_ssl = require("express-enforces-ssl");

const port = 80;

const custom =
  ':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" :response-time ms :pid :local-address';

const system = require("./utils/logger").systemLog('');
const access = require("./utils/logger").accessLog('');

// Load environment variables from .env file
require("dotenv").config({
  path: "secrets/credentials.env"
});

const config = require("./secrets/config.json");
const { database_service, express: { session_secret } } = config;

let db;
switch (database_service) {
  case "mongodb":
    db = require("./database/mongodb");
    break;
  case "postgresql":
    db = require("./database/postgresql");
    break;
  default:
    db = require("./database/postgresql");
}

// Define routes
const app = express();

app.use(compression());

morgan.token("pid", req => process.pid);
morgan.token("local-address", req => req.socket.address().port);

app.use(morgan(custom, { skip: (req, res) => res.statusCode < 400 }));
app.use(morgan(custom, { stream: access }));

app.use(helmet());
app.use(cookieParser());
app.use(helmet.noCache());

// if placing behind a proxy and SSL uncomment the following two lines and set the cookie secure to true in the app.use(session(...)) configuration
// app.set("trust proxy", true);
// app.use(express_enforces_ssl());

app.use(
  session({
    secret: session_secret,
    resave: true,
    saveUninitialized: true,
    proxy: true,
    cookie: {
      httpOnly: true,
      secure: false, // if placing behind a proxy and SSL set to true
      maxAge: 3600000
    }
  })
);

app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser(function(user, cb) {
  cb(null, user);
});

passport.deserializeUser(function(obj, cb) {
  cb(null, obj);
});

app.use("/", express.static(__dirname + "/public"));

require("./routes/appid")(app,system);

db.connectDatabase();
require("./routes/files")(app, db, system);

app.get("/api/tokens", function(req, res) {
  res.send(req.user);
});

const server = app.listen(port, () => {
  console.log(`Listening on port http://0.0.0.0:${server.address().port}`);
  system.info(`Listening on port http://0.0.0.0:${server.address().port}`);
});