import axios from "axios";

const PINATA_BASE = "https://api.pinata.cloud/pinning/pinFileToIPFS";

export async function uploadToPinata(file, { name } = {}) {
  const formData = new FormData();
  formData.append("file", file);
  if (name) {
    const metadata = JSON.stringify({ name });
    formData.append("pinataMetadata", metadata);
  }

  // Prefer JWT if provided; fallback to API key/secret
  const jwt = process.env.REACT_APP_PINATA_JWT;
  const apiKey = process.env.REACT_APP_PINATA_API_KEY;
  const secret = process.env.REACT_APP_PINATA_SECRET_KEY;

  const headers = {};
  if (jwt) {
    headers["Authorization"] = `Bearer ${jwt}`;
  } else if (apiKey && secret) {
    headers["pinata_api_key"] = apiKey;
    headers["pinata_secret_api_key"] = secret;
  } else {
    throw new Error("Pinata credentials missing. Add REACT_APP_PINATA_JWT or REACT_APP_PINATA_API_KEY/SECRET in .env, then restart the dev server.");
  }

  try {
    // Let axios set Content-Type with proper boundary
    const res = await axios.post(PINATA_BASE, formData, { headers });
    return res.data.IpfsHash;
  } catch (err) {
    const status = err?.response?.status;
    const detail = err?.response?.data ? JSON.stringify(err.response.data) : err.message;
    throw new Error(`Pinata upload failed${status ? ` (${status})` : ""}: ${detail}`);
  }
}

export const ipfsGatewayUrl = (cid) => `https://gateway.pinata.cloud/ipfs/${cid}`;

export async function testPinataAuth() {
  const jwt = process.env.REACT_APP_PINATA_JWT;
  const apiKey = process.env.REACT_APP_PINATA_API_KEY;
  const secret = process.env.REACT_APP_PINATA_SECRET_KEY;

  const headers = {};
  if (jwt) headers["Authorization"] = `Bearer ${jwt}`;
  else if (apiKey && secret) {
    headers["pinata_api_key"] = apiKey;
    headers["pinata_secret_api_key"] = secret;
  } else {
    throw new Error("Missing Pinata credentials in .env");
  }

  try {
    const res = await axios.get("https://api.pinata.cloud/data/testAuthentication", { headers });
    return res.data;
  } catch (err) {
    const status = err?.response?.status;
    const detail = err?.response?.data ? JSON.stringify(err.response.data) : err.message;
    throw new Error(`Pinata auth failed${status ? ` (${status})` : ""}: ${detail}`);
  }
}
