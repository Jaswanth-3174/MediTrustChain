import { useState, useEffect } from "react";
import { getAddress, isAddress } from "ethers";
import { connectWallet, storeRecord, storeRecordCategorized, getSelectedContractAddress, switchToGanache, setContractOverride, clearContractOverride, verifyContractDeployed, diagnoseContractMismatch, pingLocalRpc } from "../lib/eth";
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
  const [category, setCategory] = useState("General");
  const [netInfo, setNetInfo] = useState({ chainId: "?", address: "?", source: "?", hasCode: false });
  const [overrideInput, setOverrideInput] = useState("");
  const [mismatch, setMismatch] = useState(null);

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
      const { address, chainId, source } = await getSelectedContractAddress();
      let hasCode = false;
      if (address && address.startsWith("0x") && address.length === 42) {
        try { hasCode = await verifyContractDeployed(address); } catch {}
      }
      setNetInfo({ chainId, address, source, hasCode });
      try { setMismatch(await diagnoseContractMismatch()); } catch {}
    } catch (e) {
      setNetInfo({ chainId: "?", address: e?.message || "n/a", source: "?", hasCode: false });
    }
  };

  // initial network info
  useEffect(() => {
    (async () => {
      const alive = await pingLocalRpc();
      if (!alive) setStatus("Ganache is not running on http://127.0.0.1:7545. Start Ganache GUI workspace or run the persistent script.");
      await refreshNetInfo();
      // Force MetaMask prompt on page open as requested
      try { const { account } = await connectWallet(); setAccount(account); } catch (e) { /* user may reject */ }
    })();
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
        if (category && category !== "General") {
          await storeRecordCategorized(patientAddr, cid, desc || "", category);
        } else {
          await storeRecord(patientAddr, cid, desc || "");
        }
      } catch (chainErr) {
        const msg = chainErr?.message || String(chainErr);
        setStatus(`Store on chain failed: ${msg}`);
        return;
      }
      setStatus("Record stored on blockchain.");
      setRecent((r) => [{ cid, desc, category, when: new Date().toISOString() }, ...r]);
      setDesc("");
      setFile(null);
      setCategory("General");
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
        <div className="text-xs text-gray-600 flex items-center justify-between gap-3 flex-wrap">
          <div>
            ChainId: <span className="font-mono">{netInfo.chainId}</span> · Contract: <span className="font-mono">{netInfo.address}</span>
            <span className={`ml-2 ${netInfo.hasCode ? "text-green-700" : "text-red-700"}`}>[{netInfo.hasCode ? "code found" : "no code"}]</span>
            {netInfo.source && <span className="ml-2 text-gray-500">({netInfo.source})</span>}
          </div>
          <div className="flex gap-2">
            <button type="button" className="px-2 py-1 border rounded" onClick={refreshNetInfo}>Refresh</button>
            <button type="button" className="px-2 py-1 border rounded" onClick={async () => { try { await switchToGanache(); await refreshNetInfo(); } catch (e) { setStatus(e.message || String(e)); } }}>Switch to Ganache</button>
          </div>
        </div>
        <div className="bg-gray-50 border rounded p-2 text-xs">
          <div className="font-medium mb-1">Contract address override (use if Ganache restarted)</div>
          <div className="flex gap-2 items-center flex-wrap">
            <input value={overrideInput} onChange={(e) => setOverrideInput(e.target.value)} placeholder="0x... custom address" className="border rounded px-2 py-1 text-sm min-w-[280px]" />
            <button type="button" className="px-2 py-1 border rounded" onClick={async () => {
              try {
                if (!netInfo.chainId || netInfo.chainId === "?") throw new Error("Unknown chainId");
                await setContractOverride(netInfo.chainId, overrideInput);
                setStatus("Override set.");
                await refreshNetInfo();
              } catch (e) {
                setStatus(e.message || String(e));
              }
            }}>Set Override</button>
            <button type="button" className="px-2 py-1 border rounded" onClick={async () => {
              try {
                if (!netInfo.chainId || netInfo.chainId === "?") throw new Error("Unknown chainId");
                await clearContractOverride(netInfo.chainId);
                setStatus("Override cleared.");
                await refreshNetInfo();
              } catch (e) {
                setStatus(e.message || String(e));
              }
            }}>Clear Override</button>
          </div>
        </div>

        {mismatch && mismatch.address && mismatch.metaMaskHasCode === false && mismatch.localRpcHasCode === true && (
          <div className="bg-yellow-50 border border-yellow-300 rounded p-3 text-xs">
            <div className="font-medium text-yellow-800 mb-1">Network mismatch detected</div>
            <p className="text-yellow-800">
              Your MetaMask is on chain {mismatch.chainId} but reports no code at {mismatch.address}. The local RPC {mismatch.localRpc} has code at this address.
              This usually means your MetaMask Ganache network is pointing to a different RPC URL.
            </p>
            <ul className="list-disc ml-5 mt-1 text-yellow-800">
              <li>Open MetaMask → Networks → select your Ganache network.</li>
              <li>Set RPC URL to <span className="font-mono">{mismatch.localRpc}</span> and Chain ID to 1337.</li>
              <li>Back here, click “Switch to Ganache” and then “Refresh”.</li>
            </ul>
          </div>
        )}
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
          <label className="block text-sm font-medium">Category</label>
          <select value={category} onChange={(e)=>setCategory(e.target.value)} className="mt-1 w-full border rounded px-3 py-2">
            <option>General</option>
            <option>Prescription</option>
            <option>Billing</option>
            <option>Lab</option>
            <option>Imaging</option>
            <option>Note</option>
          </select>
          <p className="text-xs text-gray-500 mt-1">Pharmacies see only Prescription; insurers see only Billing.</p>
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
                <th className="p-2">Category</th>
                <th className="p-2">When</th>
                <th className="p-2">Link</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((r, i) => (
                <tr key={i} className="border-t">
                  <td className="p-2 font-mono text-xs">{r.cid}</td>
                  <td className="p-2">{r.desc}</td>
                  <td className="p-2">{r.category || 'General'}</td>
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
