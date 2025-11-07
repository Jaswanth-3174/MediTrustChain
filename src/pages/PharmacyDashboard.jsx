import { useEffect, useState } from "react";
import { isAddress } from "ethers";
import { connectWallet, getRecordsAuthorized, getRecords, switchToGanache, getSelectedContractAddress, verifyContractDeployed, hasReadAccess, getContract, diagnoseContractMismatch, isPharmacy, registerPharmacy, dispensePrescription, getDispensesByPatient } from "../lib/eth";
import { ipfsGatewayUrl } from "../lib/pinata";
import { decryptBlob } from "../lib/crypto";

export default function PharmacyDashboard() {
  const [account, setAccount] = useState("");
  const [patient, setPatient] = useState("");
  const [records, setRecords] = useState([]);
  const [status, setStatus] = useState("");
  const [accessMsg, setAccessMsg] = useState("");
  const [netInfo, setNetInfo] = useState({ chainId: "?", address: "?", hasCode: false });
  const [mismatch, setMismatch] = useState(null);
  const [passphrase, setPassphrase] = useState("");
  const [isPharmRole, setIsPharmRole] = useState(false);
  const [dispenses, setDispenses] = useState([]);

  const refreshNetInfo = async () => {
    try {
      const { address, chainId } = await getSelectedContractAddress();
      let hasCode = false;
      if (address && address.startsWith("0x") && address.length === 42) {
        try { hasCode = await verifyContractDeployed(address); } catch {}
      }
      setNetInfo({ chainId, address, hasCode });
      try { setMismatch(await diagnoseContractMismatch()); } catch {}
    } catch (e) {
      setNetInfo({ chainId: "?", address: e?.message || "n/a", hasCode: false });
    }
  };

  useEffect(() => { refreshNetInfo(); }, []);

  // Clear UI on account or chain changes to avoid stale records lingering
  useEffect(() => {
    if (!window.ethereum) return;
    const handleAccountsChanged = () => {
      setRecords([]);
      setStatus("");
    };
    const handleChainChanged = () => {
      setRecords([]);
      setStatus("");
      refreshNetInfo();
    };
    window.ethereum.on("accountsChanged", handleAccountsChanged);
    window.ethereum.on("chainChanged", handleChainChanged);
    return () => {
      window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
      window.ethereum.removeListener("chainChanged", handleChainChanged);
    };
  }, []);

  // Periodically verify authorization when a patient is selected; if revoked, clear records
  useEffect(() => {
    if (!patient || !account) return;
    if (patient.toLowerCase() === account.toLowerCase()) return;
    let cancelled = false;
    const tick = async () => {
      try {
        const ok = await hasReadAccess(patient, account);
        if (!ok && !cancelled) {
          setRecords([]);
          setStatus("Not authorized by the patient to view records.");
        }
      } catch {}
    };
    const id = setInterval(tick, 5000);
    tick();
    return () => { cancelled = true; clearInterval(id); };
  }, [patient, account]);

  // Listen to on-chain access events to react immediately
  useEffect(() => {
    let contract;
    let active = true;
    (async () => {
      try {
        contract = await getContract(false);
        const onGranted = (p, v) => {
          if (!active || !patient || !account) return;
          if (p?.toLowerCase?.() === patient.toLowerCase() && v?.toLowerCase?.() === account.toLowerCase()) {
            fetchForPatient();
          }
        };
        const onRevoked = (p, v) => {
          if (!active || !patient || !account) return;
          if (p?.toLowerCase?.() === patient.toLowerCase() && v?.toLowerCase?.() === account.toLowerCase()) {
            setRecords([]);
            setStatus("Not authorized by the patient to view records.");
          }
        };
        const onRecordStored = (p) => {
          if (!active || !patient) return;
          if (p?.toLowerCase?.() === patient.toLowerCase()) {
            // New data available; re-fetch (role-based filter happens in contract)
            fetchForPatient();
          }
        };
        const onPrescriptionDispensed = (_pharmacy, pAddr) => {
          if (!active || !patient) return;
          if (pAddr?.toLowerCase?.() === patient.toLowerCase()) {
            // Refresh dispense history live
            (async () => { try { const d = await getDispensesByPatient(patient); if (!active) return; setDispenses(d); } catch {} })();
          }
        };
        contract.on("AccessGranted", onGranted);
        contract.on("AccessRevoked", onRevoked);
        contract.on("RecordStored", onRecordStored);
        contract.on("PrescriptionDispensed", onPrescriptionDispensed);
      } catch {}
    })();
    return () => {
      active = false;
      try {
        if (contract) {
          contract.removeAllListeners?.("AccessGranted");
          contract.removeAllListeners?.("AccessRevoked");
          contract.removeAllListeners?.("RecordStored");
          contract.removeAllListeners?.("PrescriptionDispensed");
        }
      } catch {}
    };
  }, [patient, account]);

  const onConnect = async () => {
    try {
      const { account } = await connectWallet();
      setAccount(account);
      try { setIsPharmRole(await isPharmacy(account)); } catch {}
    } catch (e) {
      setStatus(e.message);
    }
  };

  const fetchForPatient = async () => {
    if (!patient) return setStatus("Enter a patient wallet address.");
    if (!isAddress(patient)) return setStatus("Invalid patient address. Please enter a valid 0x address.");
    setStatus("Fetching records...");
    setRecords([]);
    try {
      // Check if authorized first
      const authorized = patient.toLowerCase() === account.toLowerCase() || await hasReadAccess(patient, account);
      
      if (!authorized) {
        setStatus("Not authorized by the patient to view records.");
        setRecords([]);
        setAccessMsg("Not authorized");
        return;
      }
      
      // Use getRecords to fetch ALL records (not filtered by category)
      let list = await getRecords(patient);
      setRecords(list || []);
      try { setDispenses(await getDispensesByPatient(patient)); } catch {}
      setAccessMsg("Authorized: records loaded.");
      setStatus("");
    } catch (err) {
      setRecords([]);
      const msg = err?.shortMessage || err?.message || String(err);
      if (/Not authorized/i.test(msg)) {
        setStatus("Not authorized by the patient to view records.");
        setAccessMsg("Not authorized");
      } else {
        setStatus(msg);
      }
    }
  };

  const onDecrypt = async (cid) => {
    try {
      if (!passphrase || passphrase.length < 6) return setStatus("Provide a passphrase (min 6 chars)");
      setStatus("Downloading encrypted file...");
      const res = await fetch(ipfsGatewayUrl(cid));
      const blob = await res.blob();
      setStatus("Decrypting...");
      const plain = await decryptBlob(blob, passphrase);
      const url = URL.createObjectURL(plain);
      const a = document.createElement("a");
      a.href = url;
      a.download = `decrypted-${cid}`;
      a.click();
      URL.revokeObjectURL(url);
      setStatus("");
    } catch (e) {
      setStatus(e.message || String(e));
    }
  };

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="max-w-7xl mx-auto">
      {/* Modern Header with gradient accent */}
      <header className="mb-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
          <div>
            <h2 className="text-4xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">
              Pharmacy Dashboard
            </h2>
            <p className="text-gray-600 mt-2">View prescriptions and dispense medications</p>
          </div>
          <button 
            onClick={onConnect} 
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 transition-all duration-300 text-white shadow-lg shadow-teal-500/30 font-semibold whitespace-nowrap"
          >
            {account ? account.slice(0, 6) + "..." + account.slice(-4) : "Connect MetaMask"}
          </button>
        </div>
      </header>

      {/* Network Info Card */}
      <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-4 border border-gray-200 mb-6">
        <div className="text-sm text-gray-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-4">
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
          </div>
          <div className="flex gap-2">
            <button type="button" className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium" onClick={refreshNetInfo}>Refresh</button>
            <button type="button" className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium" onClick={async () => { try { await switchToGanache(); await refreshNetInfo(); } catch (e) { setStatus(e.message || String(e)); } }}>Switch to Ganache</button>
          </div>
        </div>
      </div>
      {mismatch && mismatch.address && mismatch.localRpcHasCode && !mismatch.metaMaskHasCode && (
        <div className="mb-6 bg-yellow-50 border-l-4 border-yellow-400 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">⚠️</span>
            <div className="font-semibold text-yellow-900">Network Mismatch Detected</div>
          </div>
          <p className="text-sm text-yellow-800">
            Contract code exists on local RPC {mismatch.localRpc} but MetaMask provider shows no code at
            <span className="font-mono"> {mismatch.address} </span> on chain {mismatch.chainId}.
            Update your MetaMask network RPC URL to http://127.0.0.1:7545 (Chain ID 1337), then Refresh.
          </p>
        </div>
      )}

      <div className="rounded-2xl p-6 md:p-8 space-y-6 bg-white border border-gray-200 shadow-xl">
        <div className="flex items-center gap-3 pb-4 border-b border-gray-200">
          <span className={`px-4 py-2 rounded-lg font-medium ${isPharmRole ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
            {isPharmRole ? '✓ Registered Pharmacy' : 'Not registered as Pharmacy'}
          </span>
          {!isPharmRole && (
            <button className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium" onClick={async() => { try { setStatus('Registering pharmacy...'); await registerPharmacy(); setIsPharmRole(true); setStatus(''); } catch(e){ setStatus(e.message||String(e)); } }}>Register Now</button>
          )}
        </div>
        {account && patient && account.toLowerCase() === patient.toLowerCase() && (
          <div className="text-xs p-2 rounded-lg bg-yellow-50/80 border border-yellow-200 text-yellow-800 backdrop-blur-sm">
            You are connected as the patient address. Access will always be allowed. To test revocation, switch MetaMask to the pharmacy account.
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-gray-800">Patient Wallet Address</label>
          <input value={patient} onChange={(e) => setPatient(e.target.value)} placeholder="0x..." className="mt-1 w-full border rounded-lg px-3 py-2 bg-white/80" />
          <div className="mt-2 flex gap-2 items-center text-xs">
            <button className="px-2 py-1 border rounded-lg hover:bg-white/60 transition-colors" onClick={async()=>{
              try {
                if (!patient || !isAddress(patient)) return setAccessMsg("Enter a valid 0x address first.");
                if (!account) return setAccessMsg("Connect MetaMask as the viewer.");
                if (patient.toLowerCase() === account.toLowerCase()) { setAccessMsg("You are the patient. Access is allowed."); return; }
                const ok = await hasReadAccess(patient, account);
                setAccessMsg(ok ? "Authorized" : "Not authorized (ask patient to grant access)");
              } catch (e) { setAccessMsg(e.message||String(e)); }
            }}>Check Access</button>
            {accessMsg && <span className="text-gray-600">{accessMsg}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-800">Passphrase (if file is encrypted):</label>
          <input type="password" value={passphrase} onChange={(e) => setPassphrase(e.target.value)} className="border rounded-lg px-2 py-1 bg-white/80" />
        </div>
        <div className="flex gap-3">
          <button onClick={fetchForPatient} disabled={!!(patient && account && patient.toLowerCase()!==account.toLowerCase() && accessMsg && /Not authorized/i.test(accessMsg))} className="px-4 py-2 rounded-lg bg-gray-900 hover:bg-black text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors">Load Records</button>
          {account && patient && account.toLowerCase()===patient.toLowerCase() && (
            <button onClick={async()=>{ try{ setStatus('Fetching my records...'); const list = await getRecords(account); setRecords(list||[]); try{ setDispenses(await getDispensesByPatient(account)); }catch{} setStatus(''); } catch(e){ setStatus(e.message||String(e)); } }} className="px-4 py-2 border rounded-lg hover:bg-white/60 transition-colors">Load My Records (Direct)</button>
          )}
          <button onClick={() => { setRecords([]); setStatus(""); }} className="px-4 py-2 border rounded-lg hover:bg-white/60 transition-colors">Clear</button>
        </div>
        {status && <p className="text-sm text-gray-700">{status}</p>}
        <p className="text-xs text-gray-600">Records loaded: {records.length}</p>
      </div>

      {records.length > 0 && (
        <div className="mt-6 p-4 rounded-xl bg-white/70 backdrop-blur-sm border border-white/20 shadow-lg overflow-x-auto">
          <h3 className="font-medium mb-2 text-gray-900">Patient Records</h3>
          <p className="text-xs text-gray-700 mb-2">Showing all patient medical records (you have authorized access).</p>
          <table className="w-full text-sm min-w-[720px]">
            <thead>
              <tr className="text-left">
                <th className="p-2">Description</th>
                <th className="p-2">Category</th>
                <th className="p-2">Date</th>
                <th className="p-2">IPFS</th>
                <th className="p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r, i) => (
                <tr key={i} className="border-t">
                  <td className="p-2 whitespace-normal break-words max-w-[320px]">{r.description}</td>
                  <td className="p-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      r.category === 'Prescription' ? 'bg-purple-100 text-purple-700' :
                      r.category === 'Billing' ? 'bg-emerald-100 text-emerald-700' :
                      r.category === 'Lab' ? 'bg-blue-100 text-blue-700' :
                      r.category === 'Imaging' ? 'bg-orange-100 text-orange-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {r.category || 'General'}
                    </span>
                  </td>
                  <td className="p-2">{new Date(Number(r.timestamp) * 1000).toLocaleString()}</td>
                  <td className="p-2"><a href={ipfsGatewayUrl(r.cid)} target="_blank" rel="noreferrer" className="text-indigo-600 hover:text-indigo-700 transition-colors text-xs break-all">Open</a></td>
                  <td className="p-2"><div className="flex gap-2 flex-wrap">
                    <button className="text-xs px-2 py-1 border rounded-lg hover:bg-white/60 transition-colors" onClick={() => onDecrypt(r.cid)}>Download & Decrypt</button>
                    {isPharmRole && (
                      <button className="text-xs px-2 py-1 border rounded-lg hover:bg-white/60 transition-colors" onClick={async() => { try { setStatus('Marking dispensed...'); await dispensePrescription(patient, r.cid); const d = await getDispensesByPatient(patient); setDispenses(d); setStatus('Dispensed.'); } catch(e){ setStatus(e.message||String(e)); } }}>Mark Dispensed</button>
                    )}
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {dispenses.length > 0 && (
        <div className="mt-6 p-4 rounded-xl bg-white/70 backdrop-blur-sm border border-white/20 shadow-lg overflow-x-auto">
          <h3 className="font-medium mb-2 text-gray-900">Dispense History</h3>
          <table className="w-full text-sm min-w-[640px]">
            <thead><tr className="text-left"><th className="p-2">CID</th><th className="p-2">Pharmacy</th><th className="p-2">Date</th></tr></thead>
            <tbody>
              {dispenses.map((d,i)=>(
                <tr key={i} className="border-t">
                  <td className="p-2 font-mono text-xs break-all max-w-[360px]">{d.cid}</td>
                  <td className="p-2 text-xs break-all max-w-[280px]">{d.pharmacy}</td>
                  <td className="p-2">{new Date(Number(d.timestamp)*1000).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      </div>
    </div>
  );
}
