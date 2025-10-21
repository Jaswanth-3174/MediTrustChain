import { useState, useEffect } from "react";
import { getAddress, isAddress } from "ethers";
import { connectWallet, storeRecord, getSelectedContractAddress, switchToGanache } from "../lib/eth";
import { uploadToPinata, ipfsGatewayUrl, testPinataAuth } from "../lib/pinata";
import { encryptFile } from "../lib/crypto";

export default function HospitalDashboard() {
  const [account, setAccount] = useState("");
  const [patient, setPatient] = useState("");
  const [desc, setDesc] = useState("");
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("");
  const [recent, setRecent] = useState([]);
  const [useEncryption, setUseEncryption] = useState(false);
  const [passphrase, setPassphrase] = useState("");
  const [netInfo, setNetInfo] = useState({ chainId: "?", address: "?" });

  const onTestPinata = async () => {
    setStatus("Testing Pinata authentication...");
    try {
      const res = await testPinataAuth();
      setStatus(`Pinata auth OK: ${JSON.stringify(res)}`);
    } catch (e) {
      setStatus(e.message || String(e));
    }
  };

  const refreshNetInfo = async () => {
    try {
      const { address, chainId } = await getSelectedContractAddress();
      setNetInfo({ chainId, address });
    } catch (e) {
      setNetInfo({ chainId: "?", address: e?.message || "n/a" });
    }
  };

  // initial network info
  useEffect(() => {
    refreshNetInfo();
  }, []);

  const onConnect = async () => {
    try {
      const { account } = await connectWallet();
      setAccount(account);
    } catch (e) {
      setStatus(e.message);
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!file) return setStatus("Please select a file to upload.");
    if (!patient) return setStatus("Please enter a patient wallet address (0x...).");

    // Validate and normalize patient address
    let patientAddr;
    try {
      if (!isAddress(patient)) throw new Error("Invalid address format");
      patientAddr = getAddress(patient);
    } catch {
      setStatus("Invalid patient wallet address. Please paste a 0x... address from MetaMask.");
      return;
    }

    setStatus("Uploading to IPFS via Pinata...");
    try {
      let toUpload = file;
      if (useEncryption) {
        if (!passphrase || passphrase.length < 6) {
          setStatus("Passphrase must be at least 6 characters");
          return;
        }
        const { blob } = await encryptFile(file, passphrase);
        toUpload = new File([blob], `${file.name}.enc`, { type: "application/octet-stream" });
      }
      const cid = await uploadToPinata(toUpload, { name: desc || file.name });
      setStatus(`Stored on IPFS: ${cid}. Writing to blockchain...`);
      try {
        await storeRecord(patientAddr, cid, desc || "");
      } catch (chainErr) {
        const msg = chainErr?.message || String(chainErr);
        setStatus(`Store on chain failed: ${msg}`);
        return;
      }
      setStatus("Record stored on blockchain.");
      setRecent((r) => [{ cid, desc, when: new Date().toISOString() }, ...r]);
      setDesc("");
      setFile(null);
    } catch (err) {
      const msg = err?.message || String(err);
      setStatus(`IPFS upload failed: ${msg}`);
    }
  };

  return (
    <div className="min-h-screen p-6 max-w-3xl mx-auto">
      <header className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold">Hospital Dashboard</h2>
        <button onClick={onConnect} className="px-4 py-2 bg-indigo-600 text-white rounded">
          {account ? account.slice(0, 6) + "..." + account.slice(-4) : "Connect MetaMask"}
        </button>
      </header>

      <form onSubmit={onSubmit} className="bg-white rounded-lg shadow p-4 space-y-4">
        <div className="text-xs text-gray-600 flex items-center justify-between">
          <div>ChainId: <span className="font-mono">{netInfo.chainId}</span> · Contract: <span className="font-mono">{netInfo.address}</span></div>
          <div className="flex gap-2">
            <button type="button" className="px-2 py-1 border rounded" onClick={refreshNetInfo}>Refresh</button>
            <button type="button" className="px-2 py-1 border rounded" onClick={async () => { try { await switchToGanache(); await refreshNetInfo(); } catch (e) { setStatus(e.message || String(e)); } }}>Switch to Ganache</button>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium">Patient Wallet Address</label>
          <input value={patient} onChange={(e) => setPatient(e.target.value)} placeholder="0x..." className="mt-1 w-full border rounded px-3 py-2" />
          <div className="mt-1">
            <button type="button" className="text-xs text-indigo-600 underline" onClick={() => account && setPatient(account)}>Use my connected address</button>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium">Description</label>
          <input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="X-Ray Report" className="mt-1 w-full border rounded px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm font-medium">File</label>
          <input type="file" onChange={(e) => setFile(e.target.files[0])} className="mt-1 w-full" />
        </div>
        <div className="flex items-center gap-2">
          <input id="encrypt" type="checkbox" checked={useEncryption} onChange={(e) => setUseEncryption(e.target.checked)} />
          <label htmlFor="encrypt" className="text-sm">Encrypt file in browser before upload (AES-GCM)</label>
        </div>
        {useEncryption && (
          <div>
            <label className="block text-sm font-medium">Passphrase</label>
            <input type="password" value={passphrase} onChange={(e) => setPassphrase(e.target.value)} className="mt-1 w-full border rounded px-3 py-2" />
            <p className="text-xs text-gray-500 mt-1">Keep this passphrase safe; it's required to decrypt the file.</p>
          </div>
        )}
        <div className="flex gap-3">
          <button type="submit" className="px-4 py-2 bg-gray-900 text-white rounded">Upload & Store</button>
          <button type="button" onClick={onTestPinata} className="px-4 py-2 border rounded">Test Pinata Auth</button>
        </div>
        {status && <p className="text-sm text-gray-600">{status}</p>}
      </form>

      {recent.length > 0 && (
        <div className="mt-6 bg-white p-4 rounded shadow">
          <h3 className="font-medium mb-2">Recent uploads</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left">
                <th className="p-2">CID</th>
                <th className="p-2">Description</th>
                <th className="p-2">When</th>
                <th className="p-2">Link</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((r, i) => (
                <tr key={i} className="border-t">
                  <td className="p-2 font-mono text-xs">{r.cid}</td>
                  <td className="p-2">{r.desc}</td>
                  <td className="p-2">{new Date(r.when).toLocaleString()}</td>
                  <td className="p-2"><a className="text-indigo-600" href={ipfsGatewayUrl(r.cid)} target="_blank" rel="noreferrer">View</a></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
