import React from "react";

export default function SliderCategorias() {
  const categorias = ["Casquinha", "Milk Shake", "Sundae", "Bolos"];

  return (
    <div style={{ display: "flex", overflowX: "auto", padding: "1rem 0" }}>
      {categorias.map((cat) => (
        <div
          key={cat}
          style={{
            minWidth: "120px",
            padding: "1rem",
            margin: "0 0.5rem",
            background: "#ffe0b2",
            borderRadius: "8px",
            textAlign: "center",
            cursor: "pointer",
          }}
        >
          {cat}
        </div>
      ))}
    </div>
  );
}
