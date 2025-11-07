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
    <div className="min-h-screen px-4 py-8">
      <div className="max-w-7xl mx-auto">
      {/* Modern Header with gradient accent */}
      <header className="mb-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
          <div>
            <h2 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Patient Dashboard
            </h2>
            <p className="text-gray-600 mt-2">View and manage your medical records</p>
          </div>
          <button 
            onClick={onConnect} 
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 text-white shadow-lg shadow-indigo-500/30 font-semibold whitespace-nowrap"
          >
            {account ? account.slice(0, 6) + "..." + account.slice(-4) : "Connect MetaMask"}
          </button>
        </div>
      </header>

      {!status && !records.length && (
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-lg mb-6">
          <p className="text-sm text-blue-800 font-medium">Loading your records from the blockchain…</p>
        </div>
      )}
      {status && (
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-lg mb-6">
          <p className="text-sm text-blue-800 font-medium">{status}</p>
        </div>
      )}
      
  <div className="rounded-2xl border border-gray-200 bg-white shadow-xl p-6 md:p-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-900">My Records</h3>
          <button
            className="px-4 py-2 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 transition-colors font-medium"
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
          <div className="text-center py-12">
            <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-gray-500 text-sm">No medical records found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[600px]">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr className="text-left">
                  <th className="px-6 py-4 font-semibold text-gray-700">Description</th>
                  <th className="px-6 py-4 font-semibold text-gray-700">Date</th>
                  <th className="px-6 py-4 font-semibold text-gray-700">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {records.map((r, i) => (
                  <tr key={i} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-normal break-words max-w-[400px] text-gray-800">{r.description}</td>
                    <td className="px-6 py-4 text-gray-600">{new Date(Number(r.timestamp) * 1000).toLocaleString()}</td>
                    <td className="px-6 py-4">
                      <a 
                        href={ipfsGatewayUrl(r.cid)} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 transition-colors font-medium"
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
        )}
      </div>

      <div className="mt-8 rounded-2xl border border-gray-200 bg-white shadow-xl p-6 md:p-8">
        <h3 className="text-xl font-bold text-gray-900 mb-4">Share Access</h3>
        <p className="text-sm text-gray-600 mb-4">Grant or revoke access to your medical records for insurers and pharmacies</p>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <input 
            value={shareAddr} 
            onChange={(e) => setShareAddr(e.target.value)} 
            placeholder="Insurer/Pharmacy 0x... address" 
            className="flex-1 border border-gray-300 rounded-lg px-4 py-3 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow min-w-0" 
          />
          <div className="flex gap-2">
            <button className="px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium" onClick={async () => {
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
            <button className="px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium" onClick={async () => {
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
            <button className="px-4 py-3 border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium" onClick={async () => {
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
        </div>
        {shareStatus && (
          <div className="mt-4 bg-blue-50 border-l-4 border-blue-400 p-4 rounded-lg">
            <p className="text-sm text-blue-800 font-medium">{shareStatus}</p>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
