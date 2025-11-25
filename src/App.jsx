import React from "react";
import AppRoutes from "./routes/AppRoutes";
import Header from "./components/Header";
import Footer from "./components/Footer";

function App() {
  return (
    <div className="app">
      {/* Cabeçalho em todas as páginas */}
      <Header />

      {/* Rotas do aplicativo */}
      <main>
        <AppRoutes />
      </main>

      {/* Rodapé em todas as páginas */}
      <Footer />
    </div>
  );
}

export default App;
