import React from "react";
import AppRoutes from "./routes/AppRoutes";
import Footer from "./components/Footer";

function App() {
  return (
    <div className="app">
      {/* Cabeçalho em todas as páginas */}


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
