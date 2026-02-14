import { Link, Navigate, Route, Routes } from "react-router-dom";

function Layout({ title, children }) {
  return (
    <main className="page">
      <h1>{title}</h1>
      <nav className="nav">
        <Link to="/">Gate</Link>
        <Link to="/game">Game</Link>
        <Link to="/valentines">Valentines</Link>
      </nav>
      <section className="content">{children}</section>
    </main>
  );
}

function GatePage() {
  return (
    <Layout title="Valentine's Gate">
      <p>Welcome! This is the gate page (`/`).</p>
    </Layout>
  );
}

function GamePage() {
  return (
    <Layout title="Game">
      <p>Game route is ready at `/game`.</p>
    </Layout>
  );
}

function ValentinesPage() {
  return (
    <Layout title="Valentines">
      <p>Valentines route is ready at `/valentines`.</p>
    </Layout>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<GatePage />} />
      <Route path="/game" element={<GamePage />} />
      <Route path="/valentines" element={<ValentinesPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
