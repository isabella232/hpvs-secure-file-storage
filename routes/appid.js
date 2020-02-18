const passport = require("passport");

const appid = require("../secrets/appid.json");
const config = require("../secrets/config.json");
const { appid: { redirect_uri } } = config;

module.exports = function(app, system) {
  const WebAppStrategy = require("ibmcloud-appid").WebAppStrategy;

  const LANDING_PAGE_URL = "/";
  const LOGIN_URL = "/appid_login";
  const LOGOUT_URL = "/appid_logout";
  const CALLBACK_URL = "/appid_callback";
  const ERROR_URL = "/appid_callback";

  passport.use(
    new WebAppStrategy({
      tenantId: appid.tenantId,
      clientId: appid.clientId,
      secret: appid.secret,
      oauthServerUrl: appid.oAuthServerUrl,
      redirectUri: redirect_uri
    })
  );

  app.get(
    LOGIN_URL,
    passport.authenticate(WebAppStrategy.STRATEGY_NAME, {
      successRedirect: LANDING_PAGE_URL,
      forceLogin: true
    })
  );

  app.get(CALLBACK_URL, passport.authenticate(WebAppStrategy.STRATEGY_NAME));

  app.get(LOGOUT_URL, (req, res) => {
    WebAppStrategy.logout(req);
    res.redirect(LANDING_PAGE_URL);
  });

  app.get(ERROR_URL, (req, res) => {
    res.send('Authentication Error');
  });

  // Serves the identity token payload provided by App ID
  app.get("/appid/idPayload", (req, res) => {
    system.info(`Received request on /appid/idPayload route`);
    res.send(req.session[WebAppStrategy.AUTH_CONTEXT].identityTokenPayload);
  });

  // Serves the JWT Token provided by App ID
  app.get("/appid/accessToken", (req, res) => {
    system.info(`Received request on /appid/accessToken route`);
    res.send(req.session[WebAppStrategy.AUTH_CONTEXT].accessToken);
  });

};
