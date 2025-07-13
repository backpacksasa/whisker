import express from "express";
import { registerRoutes } from "../server/routes.js";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.removeHeader('X-Frame-Options');
  res.header('X-Frame-Options', 'ALLOWALL');
  res.header('Content-Security-Policy', 
    "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: *; " +
    "frame-src 'self' https://auth.privy.io https://verify.walletconnect.com https://verify.walletconnect.org *; " +
    "connect-src 'self' https://auth.privy.io https://api.privy.io https://rpc.hyperliquid.xyz https://api.hyperliquid.xyz *; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://auth.privy.io *; " +
    "style-src 'self' 'unsafe-inline' *; " +
    "img-src 'self' data: https: *; " +
    "font-src 'self' data: https: *;"
  );
  next();
});

(async () => {
  await registerRoutes(app);
})();

export default app;
