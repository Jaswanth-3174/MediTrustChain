import { useEffect, useState } from "react";
import { isAddress } from "ethers";
import { connectWallet, getRecordsAuthorized, grantReadAccess, revokeReadAccess, hasReadAccess } from "../lib/eth";
import { cacheGet, cacheSet } from "../lib/cache";
import { ipfsGatewayUrl } from "../lib/pinata";

export default function PatientDashboard() {
  const [account, setAccount] = useState("");
  const [records, setRecords] = useState([]);
  const [status, setStatus] = useState("");
  const [shareAddr, setShareAddr] = useState("");
  const [shareStatus, setShareStatus] = useState("");

  const onConnect = async () => {
    try {
      const { account } = await connectWallet();
      setAccount(account);
      try { localStorage.setItem("lastAccount", account); } catch {}
    } catch (e) {
      setStatus(e.message);
    }
  };

  // Force MetaMask prompt on page open as requested
  useEffect(() => {
    (async () => {
      try {
        const { account } = await connectWallet();
        setAccount(account);
        try { localStorage.setItem("lastAccount", account); } catch {}
      } catch {}
    })();
  }, []);

  // React to account/chain changes from MetaMask
  useEffect(() => {
    if (!window.ethereum) return;
    const handleAccountsChanged = (accs) => {
      setAccount(accs && accs.length ? accs[0] : "");
    };
    const handleChainChanged = () => {
      setStatus("");
      setRecords([]);
      // Silent refresh records will be triggered by account effect below
    };
    window.ethereum.on("accountsChanged", handleAccountsChanged);
    window.ethereum.on("chainChanged", handleChainChanged);
    return () => {
      window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
      window.ethereum.removeListener("chainChanged", handleChainChanged);
    };
  }, []);

  useEffect(() => {
    if (!account) return;
    // show cached records instantly
    const cached = cacheGet(account);
    if (cached.length) setRecords(cached);

    (async () => {
      setStatus("Fetching records from blockchain...");
      try {
        const list = await getRecordsAuthorized(account);
        setRecords(list);
        cacheSet(account, list);
        setStatus("");
      } catch (err) {
        setStatus(err.message || String(err));
      }
    })();
  }, [account]);

  return (
    <div className="min-h-screen p-6 max-w-3xl mx-auto">
      <header className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold">Patient Dashboard</h2>
        <button onClick={onConnect} className="px-4 py-2 bg-indigo-600 text-white rounded">
          {account ? account.slice(0, 6) + "..." + account.slice(-4) : "Connect MetaMask"}
        </button>
      </header>

      {!status && !records.length && (
        <p className="text-sm text-gray-600 mb-2">Loading your records from the blockchain…</p>
      )}
      {status && <p className="text-sm text-gray-600 mb-4">{status}</p>}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-medium">My Records</h3>
          <button
            className="text-xs px-2 py-1 border rounded"
            onClick={() => {
              if (!account) return setStatus("Connect MetaMask to refresh records.");
              setStatus("Refreshing records...");
              (async () => {
                try {
                  const list = await getRecordsAuthorized(account);
                  setRecords(list);
                  cacheSet(account, list);
                  setStatus("");
                } catch (err) {
                  setStatus(err.message || String(err));
                }
              })();
            }}
          >Refresh</button>
        </div>
        {records.length === 0 ? (
          <p className="text-gray-500 text-sm">No records yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left">
                <th className="p-2">Description</th>
                <th className="p-2">Date</th>
                <th className="p-2">IPFS</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r, i) => (
                <tr key={i} className="border-t">
                  <td className="p-2">{r.description}</td>
                  <td className="p-2">{new Date(Number(r.timestamp) * 1000).toLocaleString()}</td>
                  <td className="p-2"><a href={ipfsGatewayUrl(r.cid)} target="_blank" rel="noreferrer" className="text-indigo-600">View</a></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="mt-6 bg-white rounded-lg shadow p-4">
        <h3 className="font-medium mb-2">Share Access</h3>
        <div className="flex items-center gap-2 flex-wrap">
          <input value={shareAddr} onChange={(e) => setShareAddr(e.target.value)} placeholder="Insurer/Pharmacy 0x... address" className="border rounded px-3 py-2 min-w-[320px]" />
          <button className="px-3 py-2 border rounded" onClick={async () => {
            if (!shareAddr) return setShareStatus("Enter an address");
            if (!isAddress(shareAddr)) return setShareStatus("Invalid address. Please enter a valid 0x address.");
            try {
              setShareStatus("Granting access...");
              await grantReadAccess(shareAddr);
              // verify on-chain state
              const ok = await hasReadAccess(account, shareAddr);
              setShareStatus(ok ? "Access granted." : "Granted, but could not verify immediately. Try Check.");
            } catch (e) {
              setShareStatus(e.message || String(e));
            }
          }}>Grant</button>
          <button className="px-3 py-2 border rounded" onClick={async () => {
            if (!shareAddr) return setShareStatus("Enter an address");
            if (!isAddress(shareAddr)) return setShareStatus("Invalid address. Please enter a valid 0x address.");
            try {
              setShareStatus("Revoking access...");
              await revokeReadAccess(shareAddr);
              setShareStatus("Access revoked.");
            } catch (e) {
              setShareStatus(e.message || String(e));
            }
          }}>Revoke</button>
          <button className="px-3 py-2 border rounded" onClick={async () => {
            if (!shareAddr) return setShareStatus("Enter an address");
            if (!isAddress(shareAddr)) return setShareStatus("Invalid address. Please enter a valid 0x address.");
            try {
              const ok = await hasReadAccess(account, shareAddr);
              setShareStatus(ok ? "Has access" : "No access");
            } catch (e) {
              setShareStatus(e.message || String(e));
            }
          }}>Check</button>
        </div>
        {shareStatus && <p className="text-sm text-gray-600 mt-2">{shareStatus}</p>}
      </div>
    </div>
  );
}
