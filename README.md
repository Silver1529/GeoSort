<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="public/logo-escuro.png">
    <img alt="GeoSort" src="public/logo-claro.png" width="480">
  </picture>
</p>

Sistema em C que compara o desempenho de seis algoritmos de ordenação (Bubble, Insertion, Shell, Merge, Quick e Heap Sort) sobre um catálogo de imagens de satélite da Amazônia, ordenado pela data e hora de captura de cada imagem. Inclui um painel web com gráficos, mapa 3D e geração de cenários.

APS de Estrutura de Dados – Ciência da Computação, UNIP, 2026/2.

## Ver online

**https://geosort.onrender.com**

O site fica no plano gratuito do Render: depois de um tempo sem acessos ele "dorme", e o primeiro acesso pode levar de 30 a 60 segundos. Na versão online o botão "Rodar benchmark" fica desativado.

## Rodar no seu computador

### 1. Instale o necessário

Você precisa do **GCC** (compilador C) e do **Node.js 18 ou mais novo**.

**Ubuntu / Debian / WSL**

```bash
sudo apt update
sudo apt install -y build-essential nodejs npm
```

**macOS**

```bash
xcode-select --install     # instala o compilador C
brew install node          # requer o Homebrew (https://brew.sh)
```

**Windows**: use o WSL. Abra o PowerShell como administrador, rode `wsl --install`, reinicie o computador, abra o aplicativo **Ubuntu** e siga os comandos de Ubuntu acima. O projeto não foi testado direto no Windows, fora do WSL.

Para conferir:

```bash
gcc --version
node -v
```

### 2. Baixe o código

```bash
git clone https://github.com/Silver1529/GeoSort.git
cd GeoSort
```

Sem git: na página do repositório, clique em **Code → Download ZIP**, extraia o arquivo e abra um terminal dentro da pasta extraída.

### 3. Execute

**Sistema completo (programa em C + painel no navegador)**

```bash
gcc -O2 -Wall -Wextra -std=c99 -o geosort geosort.c
node server.js
```

Abra **http://localhost:3000** no navegador. Para encerrar, use Ctrl+C no terminal.

**Só o programa em C (menu no terminal)**

```bash
gcc -O2 -Wall -Wextra -std=c99 -o geosort geosort.c
./geosort
```

O menu tem as opções: 1 a 4 geram dados (aleatórios, ordenados, inversos ou semi-ordenados), 5 carrega um arquivo, 6 permite digitar registros, 7 salva, 8 lista e 9 compara os seis algoritmos. A opção 0 sai.

**Benchmark completo (gera o CSV com os tempos)**

```bash
./geosort --benchmark resultados.csv
```

São 120 medições (4 cenários × 5 tamanhos × 6 algoritmos, média de 3 execuções). Leva alguns minutos. O arquivo gerado pode ser aberto no painel pelo botão **Abrir CSV**.

### Atalhos com Yarn (opcional)

Se tiver o Yarn instalado (`sudo npm install -g yarn`), os mesmos comandos ficam mais curtos:

| Comando | O que faz |
|---|---|
| `yarn dev` | Compila e inicia o painel em http://localhost:3000 |
| `yarn menu` | Compila e abre o menu do terminal |
| `yarn benchmark` | Compila e grava o benchmark em `resultados.csv` |

O projeto não tem dependências externas, então não é preciso rodar `yarn install`.

## Problemas comuns

| Problema | Solução |
|---|---|
| `gcc: command not found` | Instale o compilador (passo 1) |
| `node: command not found` | Instale o Node.js (passo 1) |
| `EADDRINUSE` ao iniciar o servidor | A porta 3000 já está em uso. Use outra: `PORT=8080 node server.js` e abra http://localhost:8080 |
| O painel abre, mas o Laboratório pede `yarn start` | A página foi aberta direto do arquivo. Acesse pelo endereço http://localhost:3000 com o servidor rodando |

## Estrutura

| Arquivo | Conteúdo |
|---|---|
| `geosort.c` | Programa em C: menu, seis algoritmos e modo benchmark |
| `server.js` | Servidor local que executa o programa e serve o painel |
| `dashboard/` | Painel web (HTML, CSS e JavaScript) |
| `public/` | Logotipo e ícones |
| `resultados_benchmark.csv` | Resultado de um benchmark completo |
| `RELATORIO_ALTERACOES.md` | Documentação técnica detalhada |
| `Dockerfile`, `render.yaml` | Configuração da versão online |
