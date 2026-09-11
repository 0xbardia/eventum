const defaults = {
  APP_ENV: "test",
  APP_URL: "http://127.0.0.1:4187",
  APP_HOST: "127.0.0.1",
  APP_PORT: "4187",
  DATABASE_PATH: "./data/eventum-cache-test.json",
  LOG_LEVEL: "info",
  GENLAYER_NETWORK: "studionet",
  GENLAYER_RPC_URL: "https://studio.genlayer.com/api",
  GENLAYER_CHAIN_ID: "61999",
  GENLAYER_CONTRACT_ADDRESS: "",
  GENLAYER_EXPLORER_URL: "https://explorer-studio.genlayer.com/",
  GENLAYER_STUDIO_URL: "https://studio.genlayer.com/contracts",
  POLYMARKET_GAMMA_API_BASE_URL: "https://gamma-api.polymarket.com",
  POLYMARKET_GAMMA_API_ALLOWED_HOSTS: "gamma-api.polymarket.com",
  POLYMARKET_ALLOWED_HOSTS: "polymarket.com,www.polymarket.com",
  FETCH_TIMEOUT_MS: "10000",
  FETCH_MAX_BYTES: "1000000",
  MAX_REQUEST_BODY_BYTES: "65536",
  RATE_LIMIT_WINDOW_MS: "60000",
  RATE_LIMIT_MAX: "30",
} as const;

for (const [name, value] of Object.entries(defaults)) {
  process.env[name] = value;
}
