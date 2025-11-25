import { useContext } from "react";
import { CarrinhoContext } from "../context/CarrinhoContext";

export default function useCarrinho() {
  const context = useContext(CarrinhoContext);
  if (!context) throw new Error("useCarrinho deve ser usado dentro de CarrinhoProvider");
  return context;
}
