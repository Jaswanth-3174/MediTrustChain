import { useEffect, useState } from "react";
import { isAddress, parseEther } from "ethers";
import { connectWallet, getRecordsAuthorized, getRecords, switchToGanache, getSelectedContractAddress, verifyContractDeployed, hasReadAccess, getContract, diagnoseContractMismatch, isInsurer, registerInsurer, submitClaim, getClaimsByPatient, updateClaimStatus } from "../lib/eth";
import { ipfsGatewayUrl } from "../lib/pinata";
import { decryptBlob } from "../lib/crypto";

export default function InsurerDashboard() {
  const [account, setAccount] = useState("");
  const [patient, setPatient] = useState("");
  const [records, setRecords] = useState([]);
  const [status, setStatus] = useState("");
  const [netInfo, setNetInfo] = useState({ chainId: "?", address: "?", hasCode: false });
  const [accessMsg, setAccessMsg] = useState("");
  const [mismatch, setMismatch] = useState(null);
  const [passphrase, setPassphrase] = useState("");
  const [isInsurerRole, setIsInsurerRole] = useState(false);
  const [claims, setClaims] = useState([]);
  const [claimAmountEth, setClaimAmountEth] = useState("");
  const [claimNote, setClaimNote] = useState("");

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
    // If the viewer is the patient, always authorized; skip polling
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
    // fire once quickly
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
            // Auto-refresh when access is granted for this viewer
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
            fetchForPatient();
          }
        };
        const onClaimSubmitted = (_id, _insurer, pAddr) => {
          if (!active || !patient) return;
          if (pAddr?.toLowerCase?.() === patient.toLowerCase()) {
            (async () => { try { const cs = await getClaimsByPatient(patient); if (!active) return; setClaims(cs); } catch {} })();
          }
        };
        const onClaimUpdated = (_id) => {
          if (!active || !patient) return;
          (async () => { try { const cs = await getClaimsByPatient(patient); if (!active) return; setClaims(cs); } catch {} })();
        };
        contract.on("AccessGranted", onGranted);
        contract.on("AccessRevoked", onRevoked);
        contract.on("RecordStored", onRecordStored);
        contract.on("ClaimSubmitted", onClaimSubmitted);
        contract.on("ClaimUpdated", onClaimUpdated);
      } catch {}
    })();
    return () => {
      active = false;
      try {
        if (contract) {
          contract.removeAllListeners?.("AccessGranted");
          contract.removeAllListeners?.("AccessRevoked");
          contract.removeAllListeners?.("RecordStored");
          contract.removeAllListeners?.("ClaimSubmitted");
          contract.removeAllListeners?.("ClaimUpdated");
        }
      } catch {}
    };
  }, [patient, account]);

  const onConnect = async () => {
    try {
      const { account } = await connectWallet();
      setAccount(account);
      try { setIsInsurerRole(await isInsurer(account)); } catch {}
    } catch (e) {
      setStatus(e.message);
    }
  };

  const fetchForPatient = async () => {
    if (!patient) return setStatus("Enter a patient wallet address.");
    if (!isAddress(patient)) return setStatus("Invalid patient address. Please enter a valid 0x address.");
    setStatus("Fetching records...");
    setRecords([]); // clear previous view to avoid showing stale records after revoke
    try {
      let list = await getRecordsAuthorized(patient);
      // If the viewer is the patient and nothing returned, try direct getRecords as a fallback
      if (list && list.length === 0 && account && patient && account.toLowerCase() === patient.toLowerCase()) {
        try { list = await getRecords(patient); } catch {}
      }
      setRecords(list || []);
      try { setClaims(await getClaimsByPatient(patient)); } catch {}
      setStatus("");
    } catch (err) {
      setRecords([]);
      const msg = err?.shortMessage || err?.message || String(err);
      // Common case after revoke: Not authorized
      if (/Not authorized/i.test(msg)) {
        setStatus("Not authorized by the patient to view records.");
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
    <div className="min-h-screen p-6 max-w-3xl mx-auto">
      <header className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold">Insurer Dashboard</h2>
        <button onClick={onConnect} className="px-4 py-2 bg-indigo-600 text-white rounded">
          {account ? account.slice(0, 6) + "..." + account.slice(-4) : "Connect MetaMask"}
        </button>
      </header>

      <div className="text-xs text-gray-600 flex items-center justify-between gap-3 flex-wrap mb-3">
        <div>
          ChainId: <span className="font-mono">{netInfo.chainId}</span> · Contract: <span className="font-mono">{netInfo.address}</span>
          <span className={`ml-2 ${netInfo.hasCode ? "text-green-700" : "text-red-700"}`}>[{netInfo.hasCode ? "code found" : "no code"}]</span>
        </div>
        <div className="flex gap-2">
          <button type="button" className="px-2 py-1 border rounded" onClick={refreshNetInfo}>Refresh</button>
          <button type="button" className="px-2 py-1 border rounded" onClick={async () => { try { await switchToGanache(); await refreshNetInfo(); } catch (e) { setStatus(e.message || String(e)); } }}>Switch to Ganache</button>
        </div>
      </div>
      {mismatch && mismatch.address && mismatch.localRpcHasCode && !mismatch.metaMaskHasCode && (
        <div className="mb-3 text-xs p-2 rounded bg-red-50 border border-red-200 text-red-800">
          Contract code exists on local RPC {mismatch.localRpc} but MetaMask provider shows no code at
          <span className="font-mono"> {mismatch.address} </span> on chain {mismatch.chainId}.
          Update your MetaMask network RPC URL to http://127.0.0.1:7545 (Chain ID 1337), then Refresh.
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-4 space-y-4">
        <div className="text-xs flex items-center gap-2">
          <span className={`px-2 py-1 rounded ${isInsurerRole ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
            {isInsurerRole ? 'Registered Insurer' : 'Not registered as Insurer'}
          </span>
          {!isInsurerRole && (
            <button className="px-2 py-1 border rounded" onClick={async() => { try { setStatus('Registering insurer...'); await registerInsurer(); setIsInsurerRole(true); setStatus(''); } catch(e){ setStatus(e.message||String(e)); } }}>Register</button>
          )}
        </div>
        {account && patient && account.toLowerCase() === patient.toLowerCase() && (
          <div className="text-xs p-2 rounded bg-yellow-50 border border-yellow-200 text-yellow-800">
            You are connected as the patient address. Access will always be allowed. To test revocation, switch MetaMask to the insurer account.
          </div>
        )}
        <div>
          <label className="block text-sm font-medium">Patient Wallet Address</label>
          <input value={patient} onChange={(e) => setPatient(e.target.value)} placeholder="0x..." className="mt-1 w-full border rounded px-3 py-2" />
          <div className="mt-2 flex gap-2 items-center text-xs">
            <button className="px-2 py-1 border rounded" onClick={async()=>{
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
          <label className="text-sm">Passphrase (if file is encrypted):</label>
          <input type="password" value={passphrase} onChange={(e) => setPassphrase(e.target.value)} className="border rounded px-2 py-1" />
        </div>
        <div className="flex gap-3 flex-wrap">
          <button onClick={fetchForPatient} disabled={!!(patient && account && patient.toLowerCase()!==account.toLowerCase() && accessMsg && /Not authorized/i.test(accessMsg))} className="px-4 py-2 bg-gray-900 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed">Load Records</button>
          {account && patient && account.toLowerCase()===patient.toLowerCase() && (
            <button onClick={async()=>{ try{ setStatus('Fetching my records...'); const list = await getRecords(account); setRecords(list||[]); try{ setClaims(await getClaimsByPatient(account)); }catch{} setStatus(''); } catch(e){ setStatus(e.message||String(e)); } }} className="px-4 py-2 border rounded">Load My Records (Direct)</button>
          )}
          <button onClick={() => { setRecords([]); setStatus(""); }} className="px-4 py-2 border rounded">Clear</button>
          <div className="flex items-center gap-2">
            <label className="text-sm">Claim amount (ETH):</label>
            <input value={claimAmountEth} onChange={(e)=>setClaimAmountEth(e.target.value)} className="border rounded px-2 py-1 w-32" placeholder="0.1" />
            <label className="text-sm">Note:</label>
            <input value={claimNote} onChange={(e)=>setClaimNote(e.target.value)} className="border rounded px-2 py-1 min-w-[180px]" placeholder="Short note" />
          </div>
        </div>
        {status && <p className="text-sm text-gray-600">{status}</p>}
      </div>

      {records.length > 0 && (
        <div className="mt-6 bg-white p-4 rounded shadow">
          <h3 className="font-medium mb-2">Patient Records</h3>
          {account && patient && account.toLowerCase()!==patient.toLowerCase() && (
            <p className="text-xs text-gray-600 mb-2">As an insurer, you are viewing billing records only.</p>
          )}
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left">
                <th className="p-2">Description</th>
                <th className="p-2">Date</th>
                <th className="p-2">IPFS</th>
                <th className="p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r, i) => (
                <tr key={i} className="border-t">
                  <td className="p-2">{r.description}</td>
                  <td className="p-2">{new Date(Number(r.timestamp) * 1000).toLocaleString()}</td>
                  <td className="p-2"><a href={ipfsGatewayUrl(r.cid)} target="_blank" rel="noreferrer" className="text-indigo-600">Open</a></td>
                  <td className="p-2">
                    <div className="flex gap-2 flex-wrap">
                      <button className="text-xs px-2 py-1 border rounded" onClick={() => onDecrypt(r.cid)}>Download & Decrypt</button>
                      {isInsurerRole && (
                        <button className="text-xs px-2 py-1 border rounded" onClick={async()=>{
                          try {
                            if (!claimAmountEth) return setStatus('Enter claim amount (ETH).');
                            const amountWei = parseEther(claimAmountEth);
                            setStatus('Submitting claim...');
                            await submitClaim(patient, r.cid, amountWei, claimNote || '');
                            const cs = await getClaimsByPatient(patient);
                            setClaims(cs);
                            setStatus('Claim submitted.');
                          } catch(e){ setStatus(e.message||String(e)); }
                        }}>Submit Claim</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {claims.length > 0 && (
        <div className="mt-6 bg-white p-4 rounded shadow">
          <h3 className="font-medium mb-2">Claims</h3>
          <table className="w-full text-sm">
            <thead><tr className="text-left"><th className="p-2">ID</th><th className="p-2">CID</th><th className="p-2">Amount (ETH)</th><th className="p-2">Status</th><th className="p-2">Note</th><th className="p-2">Actions</th></tr></thead>
            <tbody>
              {claims.map((c,i)=> (
                <tr key={i} className="border-t">
                  <td className="p-2">{String(c.id)}</td>
                  <td className="p-2 font-mono text-xs">{c.cid}</td>
                  <td className="p-2">{Number(c.amount)/1e18}</td>
                  <td className="p-2">{c.status}</td>
                  <td className="p-2">{c.note}</td>
                  <td className="p-2">
                    {isInsurerRole && (
                      <div className="flex gap-2 flex-wrap items-center">
                        <select className="border rounded px-2 py-1" defaultValue={c.status} onChange={async(e)=>{
                          try { setStatus('Updating claim...'); await updateClaimStatus(c.id, e.target.value, c.note||''); const cs = await getClaimsByPatient(patient); setClaims(cs); setStatus('Claim updated.'); } catch(err){ setStatus(err.message||String(err)); }
                        }}>
                          <option>Submitted</option>
                          <option>Approved</option>
                          <option>Rejected</option>
                        </select>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
