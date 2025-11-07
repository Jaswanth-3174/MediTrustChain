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
    <div className="min-h-screen px-4 py-8">
      <div className="max-w-7xl mx-auto">
      {/* Modern Header with gradient accent */}
      <header className="mb-8">
        <div className="flex justify-between items-center mb-2">
          <div>
            <h2 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Hospital Dashboard
            </h2>
            <p className="text-gray-600 mt-2">Upload and manage patient medical records securely</p>
          </div>
          <button 
            onClick={onConnect} 
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 text-white shadow-lg shadow-indigo-500/30 font-semibold"
          >
            {account ? account.slice(0, 6) + "..." + account.slice(-4) : "Connect MetaMask"}
          </button>
        </div>
      </header>
      
      <form onSubmit={onSubmit} className="rounded-2xl border border-gray-200 bg-white shadow-xl p-6 md:p-8 space-y-6">
        {/* Network Info Card */}
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-4 border border-gray-200">
          <div className="text-sm text-gray-700 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-gray-500">Chain ID:</span>
                <span className="font-mono font-semibold text-gray-900">{netInfo.chainId}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-500">Contract:</span>
                <span className="font-mono font-semibold text-gray-900 text-xs">{netInfo.address}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${netInfo.hasCode ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                  {netInfo.hasCode ? "✓ Active" : "✗ No Code"}
                </span>
              </div>
              {netInfo.source && <span className="text-xs text-gray-500">({netInfo.source})</span>}
            </div>
            <div className="flex gap-2">
              <button type="button" className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium" onClick={refreshNetInfo}>
                Refresh
              </button>
              <button type="button" className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium" onClick={async () => { try { await switchToGanache(); await refreshNetInfo(); } catch (e) { setStatus(e.message || String(e)); } }}>
                Switch to Ganache
              </button>
            </div>
          </div>
        </div>
        
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm">
          <div className="font-semibold mb-2 text-gray-800">Contract Address Override</div>
          <p className="text-xs text-gray-600 mb-3">Use this if Ganache restarted with a new contract address</p>
          <div className="flex gap-2 items-center flex-wrap">
            <input value={overrideInput} onChange={(e) => setOverrideInput(e.target.value)} placeholder="0x... custom address" className="border border-gray-300 rounded-lg px-3 py-2 text-sm min-w-[280px] bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
            <button type="button" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium" onClick={async () => {
              try {
                if (!netInfo.chainId || netInfo.chainId === "?") throw new Error("Unknown chainId");
                await setContractOverride(netInfo.chainId, overrideInput);
                setStatus("Override set.");
                await refreshNetInfo();
              } catch (e) {
                setStatus(e.message || String(e));
              }
            }}>Set Override</button>
            <button type="button" className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium" onClick={async () => {
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
          <div className="bg-yellow-50 border-l-4 border-yellow-400 rounded-lg p-4 text-sm">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">⚠️</span>
              <div className="font-semibold text-yellow-900">Network Mismatch Detected</div>
            </div>
            <p className="text-yellow-800 mb-3">
              Your MetaMask is on chain {mismatch.chainId} but reports no code at {mismatch.address}. The local RPC {mismatch.localRpc} has code at this address.
              This usually means your MetaMask Ganache network is pointing to a different RPC URL.
            </p>
            <ul className="list-disc ml-5 mt-2 text-yellow-800 space-y-1">
              <li>Open MetaMask → Networks → select your Ganache network.</li>
              <li>Set RPC URL to <span className="font-mono">{mismatch.localRpc}</span> and Chain ID to 1337.</li>
              <li>Back here, click “Switch to Ganache” and then “Refresh”.</li>
            </ul>
          </div>
        )}
        
        {/* Form Fields with modern styling */}
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Patient Wallet Address</label>
            <input 
              value={patient} 
              onChange={(e) => setPatient(e.target.value)} 
              placeholder="0x..." 
              className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow" 
            />
            <div className="mt-2">
              <button type="button" className="text-sm text-indigo-600 hover:text-indigo-800 underline font-medium" onClick={() => account && setPatient(account)}>
                Use my connected address
              </button>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Category</label>
            <select 
              value={category} 
              onChange={(e)=>setCategory(e.target.value)} 
              className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow"
            >
            <option>General</option>
            <option>Prescription</option>
            <option>Billing</option>
            <option>Lab</option>
            <option>Imaging</option>
            <option>Note</option>
            </select>
            <p className="text-xs text-gray-500 mt-2">Pharmacies see only Prescription; insurers see only Billing.</p>
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
          <input 
            value={desc} 
            onChange={(e) => setDesc(e.target.value)} 
            placeholder="X-Ray Report" 
            className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow" 
          />
        </div>
        
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">File</label>
          <input 
            type="file" 
            onChange={(e) => setFile(e.target.files[0])} 
            className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer" 
          />
        </div>
        
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <div className="flex items-center gap-3">
            <input 
              id="encrypt" 
              type="checkbox" 
              checked={useEncryption} 
              onChange={(e) => setUseEncryption(e.target.checked)} 
              className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
            />
            <label htmlFor="encrypt" className="text-sm font-medium text-gray-700">
              Encrypt file in browser before upload (AES-GCM)
            </label>
          </div>
          
          {useEncryption && (
            <div className="mt-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Passphrase</label>
              <input 
                type="password" 
                value={passphrase} 
                onChange={(e) => setPassphrase(e.target.value)} 
                className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow" 
                placeholder="Enter a secure passphrase"
              />
              <p className="text-xs text-gray-500 mt-2">⚠️ Keep this passphrase safe; it's required to decrypt the file.</p>
            </div>
          )}
        </div>
        
        <div className="flex gap-4 pt-4">
          <button 
            type="submit" 
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 text-white font-semibold shadow-lg shadow-indigo-500/30 flex-1 md:flex-none"
          >
            Upload & Store
          </button>
          <button 
            type="button" 
            onClick={onTestPinata} 
            className="px-6 py-3 border-2 border-gray-300 rounded-xl hover:bg-gray-50 transition-colors font-semibold"
          >
            Test Pinata Auth
          </button>
        </div>
        
        {status && (
          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-lg">
            <p className="text-sm text-blue-800 font-medium">{status}</p>
          </div>
        )}
      </form>

      {recent.length > 0 && (
        <div className="mt-8 rounded-2xl bg-white border border-gray-200 shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4">
            <h3 className="text-xl font-bold text-white">Recent Uploads</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[720px]">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr className="text-left">
                  <th className="px-6 py-4 font-semibold text-gray-700">CID</th>
                  <th className="px-6 py-4 font-semibold text-gray-700">Description</th>
                  <th className="px-6 py-4 font-semibold text-gray-700">Category</th>
                  <th className="px-6 py-4 font-semibold text-gray-700">Timestamp</th>
                  <th className="px-6 py-4 font-semibold text-gray-700">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recent.map((r, i) => (
                  <tr key={i} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs break-all max-w-[360px] text-gray-600">{r.cid}</td>
                    <td className="px-6 py-4 whitespace-normal break-words max-w-[320px] text-gray-800">{r.desc}</td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium">
                        {r.category || 'General'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600">{new Date(r.when).toLocaleString()}</td>
                    <td className="px-6 py-4">
                      <a 
                        className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 transition-colors text-sm font-medium" 
                        href={ipfsGatewayUrl(r.cid)} 
                        target="_blank" 
                        rel="noreferrer"
                      >
                        View
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
