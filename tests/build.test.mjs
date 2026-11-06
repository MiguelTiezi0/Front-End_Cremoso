// Confere o que a Vercel vai servir: roda o build de produção e valida o
// dist/index.html e o rewrite de SPA do vercel.json.
// Rodar com: npm run test:build   (usa o test runner nativo do Node, sem dependências)
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const vercel = JSON.parse(readFileSync(path.join(RAIZ, 'vercel.json'), 'utf8'));
const DIST = path.join(RAIZ, vercel.outputDirectory ?? 'dist');
const INDEX = path.join(DIST, 'index.html');

before(() => {
  // Mesmo comando que a Vercel executa.
  execSync(vercel.buildCommand, { cwd: RAIZ, stdio: 'inherit' });
});

test('vercel.json reescreve qualquer rota para /index.html (SPA)', () => {
  assert.deepEqual(vercel.rewrites, [{ source: '/(.*)', destination: '/index.html' }]);
  const [regra] = vercel.rewrites;
  const re = new RegExp(`^${regra.source}$`);
  for (const rota of ['/', '/login', '/admin/produtos', '/pedidos/42']) {
    assert.match(rota, re, `rota ${rota} deveria cair no index.html`);
  }
});

test('o build gera dist/index.html', () => {
  assert.ok(existsSync(INDEX), `${INDEX} não foi gerado`);
});

test('o index.html é o do Cremoso, já compilado', () => {
  const html = readFileSync(INDEX, 'utf8');
  assert.match(html, /<html lang="pt-BR">/);
  assert.match(html, /<title>Cremoso — Delivery de Sorvetes<\/title>/);
  assert.match(html, /<div id="root"><\/div>/);
  // O HTML de dev aponta para /src/main.tsx; o de produção não pode.
  assert.doesNotMatch(html, /src\/main\.tsx/);
  assert.match(html, /<script type="module" crossorigin src="\/assets\/index-[\w-]+\.js"><\/script>/);
});

test('todos os assets referenciados no index.html existem no dist', () => {
  const html = readFileSync(INDEX, 'utf8');
  const refs = [...html.matchAll(/(?:src|href)="(\/[^"]+)"/g)].map((m) => m[1]);
  const locais = refs.filter((r) => !r.startsWith('//'));
  assert.ok(locais.some((r) => r.endsWith('.js')), 'nenhum bundle JS referenciado');
  assert.ok(locais.some((r) => r.endsWith('.css')), 'nenhum CSS referenciado');
  for (const ref of locais) {
    assert.ok(existsSync(path.join(DIST, ref)), `asset ausente no dist: ${ref}`);
  }
});
