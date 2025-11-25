import React from "react";
import { Link } from "react-router-dom";

export default function Header() {
  return (
    <header style={{ padding: "1rem", background: "#f2f2f2", display: "flex", justifyContent: "space-between" }}>
      <h1>🍦 Cremoso Delivery</h1>
      <nav>
        {/* Links fixos, sem autenticação */}
        <Link to="/">Home</Link>{" | "}
        
      
      </nav>
    </header>
  );
}
