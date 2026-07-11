import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdfkit lê arquivos .afm de fonte do disco em tempo de execução (não é só JS) — sem isso o
  // Turbopack empacota o pacote e quebra esses caminhos relativos (erro ENOENT em produção/dev).
  serverExternalPackages: ["pdfkit"],
};

export default nextConfig;
