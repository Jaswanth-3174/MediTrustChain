import { Link } from "react-router-dom";

export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-white">
      <div className="max-w-2xl mx-auto p-8 text-center">
        <h1 className="text-4xl font-bold mb-3">MediTrustChain</h1>
        <p className="text-gray-600 mb-8">Decentralized Health Record Portal</p>
        <div className="flex gap-4 justify-center">
          <Link className="px-6 py-3 bg-indigo-600 text-white rounded-lg" to="/hospital">Hospital Login</Link>
          <Link className="px-6 py-3 bg-gray-900 text-white rounded-lg" to="/patient">Patient Login</Link>
        </div>
      </div>
    </main>
  );
}
