import { Link } from "react-router-dom";

export default function Home() {
  return (
    <main className="min-h-[85vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-5xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
            MediTrustChain
          </h1>
          <p className="text-xl text-gray-600 mb-2">Decentralized Health Record Management</p>
          <p className="text-gray-500">Secure, transparent, and accessible healthcare data on blockchain</p>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white shadow-2xl p-8 md:p-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Select Your Portal</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <Link 
              className="group relative overflow-hidden px-8 py-6 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 text-white rounded-2xl text-center shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40 transform hover:-translate-y-1" 
              to="/hospital"
            >
              <div className="relative z-10">
                <svg className="w-12 h-12 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <div className="text-xl font-bold mb-1">Hospital</div>
                <div className="text-sm opacity-90">Upload patient records</div>
              </div>
            </Link>

            <Link 
              className="group relative overflow-hidden px-8 py-6 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 transition-all duration-300 text-white rounded-2xl text-center shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/40 transform hover:-translate-y-1" 
              to="/patient"
            >
              <div className="relative z-10">
                <svg className="w-12 h-12 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <div className="text-xl font-bold mb-1">Patient</div>
                <div className="text-sm opacity-90">View & manage records</div>
              </div>
            </Link>

            <Link 
              className="group relative overflow-hidden px-8 py-6 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 transition-all duration-300 text-white rounded-2xl text-center shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40 transform hover:-translate-y-1" 
              to="/insurer"
            >
              <div className="relative z-10">
                <svg className="w-12 h-12 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <div className="text-xl font-bold mb-1">Insurer</div>
                <div className="text-sm opacity-90">Review billing & claims</div>
              </div>
            </Link>

            <Link 
              className="group relative overflow-hidden px-8 py-6 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 transition-all duration-300 text-white rounded-2xl text-center shadow-lg shadow-teal-500/30 hover:shadow-xl hover:shadow-teal-500/40 transform hover:-translate-y-1" 
              to="/pharmacy"
            >
              <div className="relative z-10">
                <svg className="w-12 h-12 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
                <div className="text-xl font-bold mb-1">Pharmacy</div>
                <div className="text-sm opacity-90">View prescriptions</div>
              </div>
            </Link>
          </div>

          <div className="mt-10 pt-8 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
              <div>
                <div className="text-3xl mb-2">🔒</div>
                <h3 className="font-semibold text-gray-900 mb-1">Secure</h3>
                <p className="text-sm text-gray-600">End-to-end encryption with AES-GCM</p>
              </div>
              <div>
                <div className="text-3xl mb-2">🔗</div>
                <h3 className="font-semibold text-gray-900 mb-1">Decentralized</h3>
                <p className="text-sm text-gray-600">IPFS storage + Blockchain integrity</p>
              </div>
              <div>
                <div className="text-3xl mb-2">🌐</div>
                <h3 className="font-semibold text-gray-900 mb-1">Accessible</h3>
                <p className="text-sm text-gray-600">Role-based access control</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
