# Relatório de alterações do GeoSort

**Projeto:** GeoSort — Sistema para Análise de Performance de Algoritmos de Ordenação
**Disciplina:** Estrutura de Dados — APS 2026/2 — Ciência da Computação (UNIP)
**Data do levantamento:** 30/10/2026
**Base de comparação:** versão original composta apenas pelo arquivo `geosort.c` (367 linhas): menu de terminal com opções 0 a 9, seis algoritmos de ordenação, modo `--benchmark` que gera um arquivo CSV e medição de tempo com `clock()`.

Todas as afirmações deste relatório foram conferidas no código-fonte atual. Os comportamentos descritos como testados foram executados na data acima, e as saídas reais estão reproduzidas nas seções 6 e 7.

---

## 1. Visão geral

### 1.1 O que o sistema é hoje

O GeoSort continua tendo como núcleo o programa `geosort.c`, escrito em C99. Ele gera ou carrega registros de imagens de satélite da Floresta Amazônica (identificador, instante de captura, latitude, longitude e cobertura de nuvens) e compara o desempenho de seis algoritmos de ordenação — Bubble Sort, Insertion Sort, Shell Sort, Merge Sort, Quick Sort e Heap Sort —, usando o instante de captura (`timestamp`) como chave. O programa mantém o menu interativo de terminal (opções 0 a 9) e o modo `--benchmark`, que executa 120 medições e grava os tempos médios em CSV. As alterações feitas nesse arquivo foram corretivas: validação de entrada, verificação de alocação de memória e leitura de caminhos de arquivo. Os algoritmos, a geração de dados e a medição de tempo não foram modificados.

Em torno do programa foi construída uma camada de visualização, composta por um servidor local em Node.js (`server.js`), sem dependências externas, e por um painel web (pasta `dashboard/`). O servidor executa o mesmo executável `geosort` como processo filho de duas formas: acionando o menu (opções 1 a 4, 7 e 9) para gerar e comparar um cenário sob demanda, e executando o modo `--benchmark` para a bateria completa de medições. O painel apresenta os resultados em gráficos, em um mapa 3D das coordenadas geradas e em uma apresentação introdutória exibida na primeira visita. O programa em C continua utilizável de forma independente, exatamente como na versão original.

### 1.2 Estrutura de pastas e arquivos

```
GeoSort/
├── geosort.c                  Programa em C: menu 0–9, seis algoritmos e modo --benchmark (401 linhas)
├── geosort                    Executável gerado na compilação (não versionado: está no .gitignore)
├── server.js                  Servidor HTTP local em Node.js; executa o geosort e serve o painel (298 linhas)
├── package.json               Scripts build, start, dev, menu e benchmark; exige Node.js 18 ou superior
├── yarn.lock                  Gerado pelo Yarn; sem conteúdo, pois o projeto não tem dependências
├── node_modules/              Criada pelo Yarn; contém apenas o arquivo .yarn-integrity
├── .gitignore                 Exclui do versionamento o executável, o CSV temporário e node_modules
├── resultados_benchmark.csv   Resultado do benchmark completo executado para este relatório (seção 7)
├── RELATORIO_ALTERACOES.md    Este relatório
├── prints/                    Capturas de tela para a monografia (seção 8)
├── dashboard/                 Painel web (HTML, CSS e JavaScript, sem bibliotecas)
│   ├── index.html             Estrutura da página: topo, banner, Laboratório, Benchmark e janelas (267 linhas)
│   ├── style.css              Estilos, temas claro e escuro e layout responsivo (1.183 linhas)
│   ├── app.js                 Seção Benchmark: leitura do CSV, gráficos, tabela e execução do benchmark (624 linhas)
│   ├── laboratorio.js         Seção Laboratório: gera cenários pelo servidor e exibe os resultados (330 linhas)
│   ├── mapa3d.js              Mapa 3D, em canvas, das imagens geradas (914 linhas)
│   └── intro.js               Apresentação em cinco etapas exibida na primeira visita (397 linhas)
└── public/                    Identidade visual (imagens PNG)
    ├── logo-claro.png         Logotipo completo, fundo claro (960 × 400 px); não usado pelo painel, serve para documentos
    ├── logo-escuro.png        Logotipo completo, fundo escuro (960 × 400 px); idem
    ├── marca-claro.png        Símbolo e nome, fundo transparente (449 × 116 px); topo e rodapé no tema claro
    ├── marca-escuro.png       Idem, para o tema escuro
    ├── simbolo.png            Apenas o símbolo (globo), fundo transparente (512 × 512 px)
    ├── simbolo-escuro.png     Idem, para fundo escuro; usado no banner e na apresentação
    ├── favicon.png            Ícone da aba do navegador (64 × 64 px)
    └── apple-touch-icon.png   Ícone para atalho em celulares (180 × 180 px)
```

Arquivos criados apenas durante a execução:

- `resultados.csv`: gravado pelo servidor quando o benchmark é executado pelo painel; é o arquivo que o painel carrega automaticamente.
- `resultados.tmp.csv`: arquivo temporário do benchmark em andamento; ao final é renomeado para `resultados.csv` ou apagado.
- `geosort-<pid>-<horário>.txt`, no diretório temporário do sistema: conjunto de dados de cada cenário gerado pelo Laboratório; é apagado logo após a leitura.

---

## 2. Alterações no geosort.c

### 2.1 Resumo

O arquivo passou de 367 para 401 linhas. Nenhuma função foi removida, duas funções auxiliares foram criadas e quatro foram alteradas; também foram removidos uma diretiva `#include` sem uso e um comentário desatualizado. Os parâmetros de linha de comando, os algoritmos, a geração de dados, a medição de tempo e os formatos de entrada e saída de dados permanecem os mesmos.

### 2.2 Mudanças, função por função

| Elemento | Versão original | Versão atual |
|---|---|---|
| `#include <ctype.h>` | Incluído, sem uso | Removido |
| Constantes | `MAX_LINHA`, `NUM_ALGORITMOS`, `T_BASE` | Acrescentadas `MAX_CAMINHO` (200) e `MAX_REGISTROS` (1.000.000) |
| `ler_arquivo()` (opção 5) | `malloc` inicial sem verificação. Um arquivo sem registros válidos devolvia um vetor com 0 elementos, que substituía os dados carregados | Verifica o `malloc` inicial (em caso de falha, fecha o arquivo e retorna `NULL`). Se nenhum registro for válido, libera o vetor, informa `Nenhum registro valido no arquivo.` e retorna `NULL`, preservando os dados anteriores |
| `ler_usuario()` (opção 6) | Rejeitava apenas quantidade menor ou igual a 0; `malloc` sem verificação | Aceita de 1 a 1.000.000 registros (o mesmo limite das opções 1 a 4), verifica o `malloc` e libera a memória em todas as saídas de erro |
| `ler_long()` (opção do menu e quantidade) | Chamava `exit(0)` ao encontrar o fim da entrada (EOF), sem liberar a memória | Retorna −1 no EOF, para que `main()` encerre pelo caminho normal; descarta o restante de linhas maiores que o buffer de 64 bytes |
| `descartar_linha()` | Não existia. O descarte era feito com `while (getchar() != '\n');`, que entra em laço infinito no EOF | Nova: lê caracteres até `'\n'` ou EOF |
| `ler_caminho()` | Não existia. Os caminhos eram lidos com `scanf("%199s")`, que para no primeiro espaço | Nova: lê com `fgets`, remove `\r` e `\n` finais, aceita espaços e rejeita caminho vazio ou com mais de 198 caracteres |
| `main()` | Liberava os dados atuais antes de gerar os novos; opções 5 e 7 liam o caminho com `scanf`; somente a opção 0 encerrava | Gera os novos dados antes de liberar os anteriores; opções 5 e 7 usam `ler_caminho()`; a opção 6 usa `descartar_linha()`; opção 0 ou EOF encerram; a saída sempre passa por `free(dados)` e imprime `Encerrado.` |
| `benchmark()` | Continha o comentário "algoritmos O(n^2) limitados a 50k para tempo razoavel", que não correspondia ao código | Comentário removido; nenhuma linha de código alterada |

**Parâmetros de linha de comando (inalterados):** `./geosort` abre o menu; `./geosort --benchmark [arquivo]` executa o benchmark e grava o CSV no arquivo indicado (padrão: `resultados.csv`). Nenhum parâmetro novo foi criado.

**Mensagens novas ou alteradas:**

- `Nenhum registro valido no arquivo.` (opção 5);
- `Caminho vazio.` e `Caminho muito longo (max 198 caracteres).` (opções 5 e 7);
- `Quantidade invalida (entre 1 e 1000000).` (opção 6; antes era `Quantidade invalida.`);
- `Erro: memoria insuficiente.` (agora também no `malloc` inicial de `ler_arquivo()` e em `ler_usuario()`).

<details>
<summary>Trechos alterados entre a versão original e a atual (diff resumido; linhas com "-" saíram, linhas com "+" entraram)</summary>

```diff
@@ -7,9 +7,10 @@
 #include <stdlib.h>
 #include <string.h>
 #include <time.h>
-#include <ctype.h>
 
 #define MAX_LINHA 256
+#define MAX_CAMINHO 200
+#define MAX_REGISTROS 1000000L
 #define NUM_ALGORITMOS 6
 
@@ ler_arquivo @@
     Imagem *v = (Imagem *) malloc(cap * sizeof(Imagem));
+    if (!v) { fprintf(stderr, "Erro: memoria insuficiente.\n"); fclose(f); return NULL; }
     char linha[MAX_LINHA];
@@
     fclose(f);
+    if (cont == 0) { /* nada aproveitavel: mantem os dados anteriores */
+        fprintf(stderr, "Nenhum registro valido no arquivo.\n");
+        free(v);
+        return NULL;
+    }
     *n = cont;
     return v;
@@ ler_usuario @@
-    if (scanf("%ld", &qtd) != 1 || qtd <= 0) { fprintf(stderr, "Quantidade invalida.\n"); return NULL; }
+    if (scanf("%ld", &qtd) != 1 || qtd < 1 || qtd > MAX_REGISTROS) {
+        fprintf(stderr, "Quantidade invalida (entre 1 e %ld).\n", MAX_REGISTROS);
+        return NULL;
+    }
     Imagem *v = (Imagem *) malloc(qtd * sizeof(Imagem));
+    if (!v) { fprintf(stderr, "Erro: memoria insuficiente.\n"); return NULL; }
@@ benchmark @@
             for (int a = 0; a < NUM_ALGORITMOS; a++) {
-                /* algoritmos O(n^2) limitados a 50k para tempo razoavel */
                 double soma = 0; int rep = 3;
@@ menu @@
+/* descarta o resto da linha atual do stdin (para em EOF) */
+static void descartar_linha(void) {
+    int c;
+    while ((c = getchar()) != '\n' && c != EOF);
+}
+
+/* retorna -1 em fim de entrada (EOF) */
 static long ler_long(const char *msg, long min, long max) {
     long x; char buf[64];
     for (;;) {
         printf("%s", msg);
-        if (!fgets(buf, sizeof buf, stdin)) exit(0);
+        if (!fgets(buf, sizeof buf, stdin)) return -1;
+        if (!strchr(buf, '\n')) descartar_linha(); /* linha maior que o buffer */
         if (sscanf(buf, "%ld", &x) == 1 && x >= min && x <= max) return x;
         printf("Valor invalido (entre %ld e %ld).\n", min, max);
     }
 }
 
+/* le um caminho com fgets (aceita espacos); retorna 0 se vazio, longo demais ou EOF */
+static int ler_caminho(const char *msg, char *caminho, size_t tam) {
+    printf("%s", msg);
+    if (!fgets(caminho, (int) tam, stdin)) return 0;
+    if (!strchr(caminho, '\n') && !feof(stdin)) {
+        descartar_linha();
+        fprintf(stderr, "Caminho muito longo (max %d caracteres).\n", (int) tam - 2);
+        return 0;
+    }
+    caminho[strcspn(caminho, "\r\n")] = '\0';
+    if (caminho[0] == '\0') { fprintf(stderr, "Caminho vazio.\n"); return 0; }
+    return 1;
+}
+
@@ main @@
         long op = ler_long("Opcao: ", 0, 9);
-        if (op == 0) break;
+        if (op <= 0) break; /* 0 ou EOF */
+        /* novos dados so substituem os atuais apos sucesso (sem vazamento) */
         if (op >= 1 && op <= 4) {
-            long q = ler_long("Quantidade de registros (1 a 1000000): ", 1, 1000000);
-            free(dados); dados = gerar_dados(q, (int)(op - 1)); n = q;
+            long q = ler_long("Quantidade de registros (1 a 1000000): ", 1, MAX_REGISTROS);
+            if (q < 0) break;
+            Imagem *v = gerar_dados(q, (int)(op - 1));
+            free(dados); dados = v; n = q;
             printf("%ld registros gerados.\n", n);
         } else if (op == 5) {
-            char caminho[200]; printf("Caminho do arquivo: ");
-            if (scanf("%199s", caminho) != 1) continue;
-            while (getchar() != '\n');
-            long m; Imagem *v = ler_arquivo(caminho, &m);
+            char caminho[MAX_CAMINHO];
+            if (!ler_caminho("Caminho do arquivo: ", caminho, sizeof caminho)) continue;
+            long m = 0; Imagem *v = ler_arquivo(caminho, &m);
             if (v) { free(dados); dados = v; n = m; printf("%ld registros carregados.\n", n); }
         } else if (op == 6) {
-            long m; Imagem *v = ler_usuario(&m); while (getchar() != '\n');
+            long m = 0; Imagem *v = ler_usuario(&m);
+            descartar_linha();
             if (v) { free(dados); dados = v; n = m; }
         } else if (op == 7) {
             if (!dados) { printf("Nenhum dado carregado.\n"); continue; }
-            char caminho[200]; printf("Nome do arquivo de saida: ");
-            if (scanf("%199s", caminho) != 1) continue;
-            while (getchar() != '\n');
+            char caminho[MAX_CAMINHO];
+            if (!ler_caminho("Nome do arquivo de saida: ", caminho, sizeof caminho)) continue;
             if (salvar_arquivo(caminho, dados, n)) printf("Arquivo salvo.\n");
```

</details>

### 2.3 O que não mudou

- **Algoritmos:** o código das seis funções de ordenação é idêntico ao original: Bubble Sort com parada antecipada; Insertion Sort; Shell Sort com lacunas n/2, n/4, ..., 1; Merge Sort recursivo com vetor auxiliar; Quick Sort com mediana de três, recursão sobre a menor partição e inserção direta nos trechos de até três elementos; e Heap Sort.
- **Medição de tempo:** `medir()` continua chamando `clock()` imediatamente antes e depois da função de ordenação e convertendo a diferença para milissegundos com `1000.0 * (fim - ini) / CLOCKS_PER_SEC`. Como na versão original, `clock()` mede o tempo de processador consumido pelo processo, e não o tempo de relógio.
- **Tamanhos testados:** 1.000, 5.000, 10.000, 50.000 e 100.000 registros, para todos os algoritmos e cenários.
- **Cenários:** aleatório; ordenado; inverso; e semi-ordenado, que consiste no vetor ordenado seguido de n/10 trocas entre posições sorteadas.
- **Repetições:** cada medição do benchmark é a média aritmética de 3 execuções, cada uma sobre uma cópia nova do mesmo vetor-base.
- **Semente:** `srand(42)` no modo benchmark (os dados são os mesmos em todas as execuções) e `srand(time(NULL))` no menu.
- **Formato do CSV:** cabeçalho `cenario,n,algoritmo,tempo_ms` e uma linha por medição, com três casas decimais (`%.3f`), totalizando 120 linhas de dados.
- **Formato do arquivo texto:** cabeçalho `# id;timestamp;latitude;longitude;nuvens` e linhas `id;timestamp;latitude;longitude;nuvens`, com latitude e longitude em quatro casas decimais.
- **Demais elementos:** estrutura `Imagem`, textos e ordem do menu, listagens e tabela de resultados da opção 9.

### 2.4 Diferenças de comportamento comprovadas por execução

Os casos abaixo foram executados nas duas versões, compiladas com as mesmas opções (`gcc -O2 -Wall -Wextra -std=c99`). As saídas completas estão na seção 6.4.

| Situação | Versão original | Versão atual |
|---|---|---|
| Carregar arquivo só com cabeçalho, com 3 registros já carregados | `0 registros carregados.`; os 3 registros anteriores são descartados | `Nenhum registro valido no arquivo.`; os 3 registros anteriores são mantidos |
| Carregar `meus dados.txt` (caminho com espaço) | `Erro: nao foi possivel abrir 'meus'.` | `20 registros carregados.` |
| Fim da entrada no meio da opção 6 | O programa trava e é encerrado pelo `timeout` de 5 s (código 124) | Encerra normalmente (código 0) |
| Caminho sem quebra de linha final na opção 5 | O programa trava (código 124) | Encerra normalmente (código 0) |
| Memória em uso ao encerrar por EOF com 5 registros carregados (valgrind) | 200 bytes em 1 bloco | 0 bytes |
| Quantidade 2.000.000 na opção 6 | Aceita a quantidade e passa a ler os registros (ao faltar entrada, imprime `Entrada invalida. Abortando.`) | `Quantidade invalida (entre 1 e 1000000).` |

### 2.5 Requisitos atendidos pelo código

**Requisitos funcionais do programa em C**

- **RF01** — Gerar de 1 a 1.000.000 registros em quatro cenários: aleatório, ordenado, inverso e semi-ordenado (opções 1 a 4).
- **RF02** — Carregar registros de arquivo texto no formato `id;timestamp;latitude;longitude;nuvens`, ignorando linhas iniciadas por `#` e linhas vazias e informando o número das linhas inválidas (opção 5).
- **RF03** — Digitar de 1 a 1.000.000 registros manualmente (opção 6).
- **RF04** — Salvar os dados atuais em arquivo texto com cabeçalho (opção 7).
- **RF05** — Listar até 20 registros (opção 8).
- **RF06** — Executar os seis algoritmos sobre cópias idênticas dos dados, verificar se cada resultado ficou ordenado e exibir os 10 primeiros registros antes e depois da ordenação (resultado do Heap Sort), o tempo de cada algoritmo e o mais rápido (opção 9).
- **RF07** — Executar o benchmark (4 cenários × 5 tamanhos × 6 algoritmos, média de 3 execuções, semente 42) e gravar o resultado em CSV (`--benchmark`).

**Requisitos funcionais do servidor e do painel**

- **RF08** — Gerar e comparar um cenário pelo navegador, executando o menu do programa (`POST /api/cenario`).
- **RF09** — Executar o benchmark completo pelo navegador, com progresso a cada medição e possibilidade de cancelamento (`POST /api/benchmark`).
- **RF10** — Exibir os resultados do benchmark em cartões de resumo, gráfico de linhas, ranking em barras, mapa de calor e tabela, a partir do `resultados.csv` do servidor ou de um CSV aberto pelo usuário.
- **RF11** — Exibir as coordenadas dos registros gerados em um mapa 3D interativo e reproduzir as capturas em ordem cronológica.
- **RF12** — Apresentar o sistema em uma sequência de cinco etapas na primeira visita.

**Requisitos não funcionais**

- **RNF01** — Código C99 que compila sem nenhum aviso com `gcc -O2 -Wall -Wextra -std=c99` (verificado também com `-Wpedantic`).
- **RNF02** — Todas as alocações dinâmicas são verificadas. Em `gerar_dados()`, `copiar_vetor()` e `merge_sort()`, uma falha encerra o programa com mensagem de erro (`exit(1)`). Em `ler_arquivo()` e `ler_usuario()`, a função retorna `NULL` e o menu mantém os dados anteriores.
- **RNF03** — Ausência de vazamentos de memória e de acessos inválidos nos casos testados (valgrind, AddressSanitizer e UndefinedBehaviorSanitizer; seção 6.4).
- **RNF04** — Profundidade de recursão limitada: o Quick Sort recorre apenas sobre a menor partição (pilha O(log n)) e a profundidade do Merge Sort é ⌈log₂ n⌉. A ordenação de 1.000.000 de registros executa sem estouro de pilha.
- **RNF05** — Entrada robusta no menu: valores fora do intervalo, texto não numérico, fim de entrada (EOF), linhas maiores que o buffer e caminhos com espaços não travam nem encerram o programa de forma anormal.
- **RNF06** — Medição isolada: apenas a chamada da função de ordenação fica entre as duas chamadas de `clock()`; a cópia do vetor e a verificação de ordenação ficam fora da medição.
- **RNF07** — Reprodutibilidade dos dados do benchmark, garantida pela semente fixa 42.
- **RNF08** — Servidor e painel sem bibliotecas de terceiros: o servidor usa somente módulos nativos do Node.js, e o painel usa HTML, CSS e JavaScript do próprio navegador. O único recurso externo é a fonte Space Grotesk (Google Fonts); sem internet, o painel usa a fonte do sistema.
- **RNF09** — Painel responsivo (de celular a desktop), com tema claro e escuro e respeito à preferência do sistema por movimento reduzido (`prefers-reduced-motion`).

---

## 3. Arquitetura nova

### 3.1 Componentes e comunicação

```
┌──────────────────────────┐  HTTP (porta 3000)  ┌─────────────────────────┐  processo filho   ┌──────────────────┐
│ Navegador                │ ──────────────────▶ │ server.js (Node.js)     │ ────────────────▶ │ ./geosort        │
│ dashboard/: HTML, CSS,   │ ◀────────────────── │ módulos nativos:        │ ◀──────────────── │ programa em C    │
│ JavaScript               │  JSON, NDJSON, CSV, │ http, fs, os, path,     │  entrada/saída    │                  │
└──────────────────────────┘  arquivos estáticos │ child_process           │  padrão, arquivos └──────────────────┘
                                                 └─────────────────────────┘
```

- **Navegador ↔ servidor:** requisições HTTP comuns. **Não há WebSocket.** Durante o benchmark, a resposta HTTP do `POST /api/benchmark` permanece aberta e o servidor escreve nela uma linha JSON por evento (formato NDJSON, *newline-delimited JSON*). O navegador lê essa resposta em partes, à medida que chega, com `fetch` e `ReadableStream`.
- **Servidor ↔ programa em C:** o servidor inicia o executável com `child_process.spawn` e se comunica com ele pela entrada padrão (sequência de opções do menu), pela saída padrão (texto impresso pelo programa) e por arquivos (conjunto salvo pela opção 7 e CSV do benchmark).
- **Concorrência:** apenas um processo do `geosort` é executado por vez. Uma segunda solicitação, de cenário ou de benchmark, recebe a resposta HTTP 409.

### 3.2 Rotas do servidor

| Método | Rota | Entrada | Resposta |
|---|---|---|---|
| GET | `/api/status` | — | JSON com `binario` (executável existe), `resultados` (existe `resultados.csv`), `rodando`, `tarefa` (`benchmark`, `cenario` ou `null`), `total` (120) e `limites` (`n`: 100.000; `ordenado`: 1.000.000) |
| POST | `/api/cenario` | JSON `{"cenario": "aleatorio" \| "ordenado" \| "inverso" \| "semi", "n": inteiro}` | JSON com tempos, algoritmo mais rápido, erros de ordenação, listagens antes e depois, amostra de pontos e resumo (seção 3.3) |
| POST | `/api/benchmark` | — | NDJSON com eventos `progresso`, `fim` ou `erro` (seção 3.4) |
| GET | `/resultados.csv` | — | CSV do último benchmark executado pelo painel (404 se não existir) |
| GET | `/public/<arquivo>` | — | Imagens da pasta `public/` |
| GET | `/favicon.ico` | — | Conteúdo de `public/favicon.png` |
| GET | `/` e demais caminhos | — | Arquivos da pasta `dashboard/` (`/` devolve `index.html`) |

Regras gerais: caminhos que tentam sair das pastas `dashboard/` ou `public/` recebem 403; arquivo inexistente, 404; métodos diferentes de GET fora das rotas de API, 405. Todas as respostas usam `Cache-Control: no-store`. O servidor escuta a porta 3000 por padrão, alterável pela variável de ambiente `PORT`.

### 3.3 Geração de um cenário (`POST /api/cenario`)

1. O servidor valida o corpo: JSON válido, cenário entre os quatro aceitos e `n` inteiro de 1 a 100.000 — ou até 1.000.000 no cenário ordenado, em que Bubble Sort e Insertion Sort executam em tempo linear. Em caso de erro responde 400; se outro processo estiver em execução, 409; se o executável não existir, 500.
2. Inicia `./geosort` sem argumentos e escreve na entrada padrão a sequência do menu:
   ```
   <opção do cenário: 1 a 4>
   <n>
   7
   <arquivo temporário>
   9
   0
   ```
   Isto é: gera os dados, salva o conjunto em arquivo (opção 7), executa a comparação (opção 9) e encerra (opção 0).
3. Ao término do processo, interpreta a saída padrão: a tabela `=== RESULTADOS COMPARATIVOS`, a linha `Mais rapido:`, eventuais linhas `ERRO:` e as listagens `--- ANTES DA ORDENACAO` e `--- DEPOIS DA ORDENACAO (Heap Sort)`, com 10 registros cada.
4. Lê o arquivo salvo pela opção 7 e calcula: uma amostra de até 2.500 registros para o mapa (um a cada ⌊total/2.500⌋ linhas); o total de registros; a média de cobertura de nuvens; a quantidade de registros com nuvens ≤ 20%; o primeiro e o último `timestamp`; e a contagem por faixa de 10% de nuvens. Em seguida, apaga o arquivo temporário.
5. Responde com JSON contendo `cenario`, `n`, `segundos` (tempo total do processo, medido pelo servidor), `tempos` (lista de `{algoritmo, tempo_ms}` impressa pelo programa), `mais_rapido`, `erros_ordenacao`, `antes`, `depois`, `algoritmo_listado`, `pontos` (cada ponto é `[id, timestamp, latitude, longitude, nuvens]`) e `resumo`.
6. O processo é encerrado se ultrapassar 10 minutos ou se o navegador cancelar a requisição.

Os tempos exibidos no Laboratório correspondem a uma única execução de cada algoritmo (opção 9, sem média). Os tempos do benchmark são médias de três execuções.

### 3.4 Benchmark pelo painel (`POST /api/benchmark`)

1. O servidor inicia `./geosort --benchmark resultados.tmp.csv`, descartando a saída padrão e capturando a saída de erros.
2. Como o programa grava cada linha do CSV com `fflush`, o servidor lê o arquivo temporário a cada 400 ms. Sempre que o número de linhas aumenta, envia um evento `progresso` com: medições concluídas, total (120), última linha gravada, segundos decorridos e conteúdo parcial do CSV.
3. Se o processo termina com código 0, o servidor renomeia o arquivo para `resultados.csv` e envia o evento `fim` com o CSV completo. Em caso de falha ou interrupção, apaga o arquivo temporário e envia `erro` com a mensagem correspondente.
4. Se o navegador cancela a requisição, o servidor encerra o processo com o sinal SIGTERM. Ao receber Ctrl+C (SIGINT) ou SIGTERM, o próprio servidor encerra o processo filho em andamento e apaga o arquivo temporário antes de sair.

### 3.5 Fluxo completo do usuário

1. No terminal, na pasta do projeto, o usuário executa `yarn dev` (equivalente a `yarn start`). O Yarn compila `geosort.c` com `gcc -O2 -Wall -Wextra -std=c99` e inicia `node server.js`, que exibe o endereço `http://localhost:3000`.
2. Ao abrir o endereço, o navegador carrega `index.html`, os estilos e os scripts. Na primeira visita é exibida a apresentação de cinco etapas (`intro.js`), que pode ser fechada a qualquer momento e reaberta pelo botão "Como funciona".
3. O painel consulta `GET /api/status`. Com o servidor disponível, o botão "Rodar benchmark" é exibido e, se existir `resultados.csv`, a seção Benchmark é preenchida automaticamente.
4. O Laboratório gera automaticamente os quatro cenários com n = 10.000, por meio de quatro chamadas a `POST /api/cenario`, uma de cada vez. Cada resultado aparece como um cartão com o ranking dos seis algoritmos. O primeiro cenário fica selecionado e preenche o mapa 3D, as estatísticas, o histograma de nuvens e as tabelas de antes e depois.
5. O usuário pode escolher outro tamanho (1.000, 10.000, 50.000, 100.000 ou um valor digitado) e um cenário ou todos, e clicar em "Gerar".
6. Para a bateria completa, clica em "Rodar benchmark", confirma na janela que descreve as 120 medições e acompanha o progresso no painel flutuante do canto da tela, enquanto os gráficos da seção Benchmark são atualizados a cada medição concluída. Ao final, o resultado fica salvo em `resultados.csv`.
7. Alternativamente, um CSV gerado pelo terminal (por exemplo, `resultados_benchmark.csv`) pode ser aberto pelo botão "Abrir CSV" ou arrastado para a página.

### 3.6 Tecnologias utilizadas

O `package.json` declara nome `geosort`, versão `1.0.0`, os scripts `build`, `start`, `dev`, `menu` e `benchmark` e a exigência `"engines": { "node": ">=18" }`. **Não há `dependencies` nem `devDependencies`**: o projeto não usa bibliotecas de terceiros.

| Tecnologia | Versão usada nos testes | Uso |
|---|---|---|
| Linguagem C (padrão C99) e GCC | gcc 15.2.0 (Ubuntu 15.2.0-16ubuntu1) | Programa principal |
| Node.js | v22.22.1 (mínimo exigido: 18) | Servidor; módulos nativos `http`, `fs`, `os`, `path` e `child_process` |
| Yarn | 1.22.22 (instalado com npm 9.2.0) | Execução dos scripts do `package.json` |
| HTML5, CSS3 e JavaScript | — | Painel, sem frameworks |
| APIs do navegador | — | Canvas 2D (mapa 3D); SVG (gráficos e apresentação); animação SVG `animateMotion` (apresentação); `fetch` com `ReadableStream` e `AbortController` (benchmark com progresso e cancelamento); `FileReader` e arrastar e soltar (abrir CSV local); `localStorage` (tema e apresentação já vista); `IntersectionObserver` e `ResizeObserver` (pausa e redimensionamento do mapa); `Path2D` |
| Google Fonts | Space Grotesk (pesos 500 e 700) | Títulos; opcional, pois sem internet é usada a fonte do sistema |
| valgrind | 3.26.0 | Verificação de memória (somente nos testes) |

---

## 4. Dashboard

### 4.1 Estrutura da página (`index.html` e `style.css`)

- **Topo fixo:** marca do sistema, atalhos para as seções Laboratório e Benchmark e os botões "Como funciona", "Rodar benchmark" (visível somente quando o servidor está disponível), "Abrir CSV" e alternância de tema.
- **Banner inicial:** pergunta que resume o trabalho, descrição, botões "Gerar cenários" e "Ver benchmark", símbolo do sistema e quatro números de referência (6 algoritmos, 4 cenários, até 1M de registros, medição com `clock()`).
- **Seções:** Laboratório (4.3), com o mapa 3D (4.4), e Benchmark (4.5). Completam a página a janela de confirmação do benchmark, o painel flutuante de progresso e o rodapé.
- **Estilos (`style.css`):** cores definidas por variáveis CSS a partir da paleta da marca (verdes `#0F3D2E`, `#1F8A4C` e `#5FD08F` e laranja `#E8952B`) e uma cor fixa por algoritmo, a mesma em todos os gráficos: Bubble Sort azul, Insertion Sort laranja, Shell Sort verde-água, Merge Sort amarelo, Quick Sort rosa e Heap Sort verde. O tema escuro segue a preferência do sistema ou o botão do topo, e a escolha fica salva no navegador (`localStorage`, chave `geosort-tema`). O layout em grade se reorganiza em larguras menores que 960, 820 e 520 px, e as animações são desativadas quando o sistema pede movimento reduzido.

### 4.2 Apresentação inicial (`intro.js`)

- **Quando aparece:** na primeira visita (o navegador registra em `localStorage`, chave `geosort-intro-vista`, que ela já foi vista), ao clicar em "Como funciona" ou ao abrir o endereço com `#apresentacao`.
- **Etapas:**
  1. *Bem-vindo ao GeoSort* — o que o sistema compara (6 algoritmos, 4 cenários, até um milhão de imagens). Animação: o símbolo do sistema com um satélite em órbita e miniaturas de fotos com datas, de caráter decorativo.
  2. *Por que ele foi feito?* — contexto do trabalho: as imagens chegam fora de ordem; mostrar a diferença entre O(n²) e O(n log n); medir tempos reais em C. Animação: satélite cruzando um mapa estilizado e soltando imagens com datas fora de ordem.
  3. *O que é ordenar?* — corrida entre Bubble Sort e Quick Sort: 16 barras com a mesma ordem inicial sorteada, um passo de comparação a cada 70 ms em cada pista, comparações destacadas em laranja, contador de comparações e indicação de qual algoritmo terminou primeiro. O botão "Repetir corrida" sorteia uma nova lista.
  4. *Como os testes são feitos* — roteiro do benchmark em cinco passos (gerar, copiar, medir com `clock()`, conferir e repetir 3 vezes), destacados em sequência, e o formato dos quatro cenários desenhado em barras.
  5. *Como ler os gráficos* — curvas ilustrativas de crescimento quadrático e n log n, desenhadas progressivamente, e orientações sobre escala logarítmica, mapa de calor e Laboratório.
- **Interações:** botões Voltar e Próximo; indicadores de etapa clicáveis; setas do teclado; Esc, "Pular", × ou clique fora da caixa para fechar. O último botão ("Explorar o painel") fecha a apresentação e rola a página até o Laboratório.
- **Dados:** conteúdo fixo; não consome dados do servidor.
- **Observação para a monografia:** a corrida da etapa 3 usa implementações em JavaScript criadas para a animação: Bubble Sort com parada antecipada (como no programa em C) e Quick Sort com partição de Lomuto (pivô no último elemento), diferente do Quick Sort do programa, que usa mediana de três e inserção nos trechos de até três elementos. Os números de comparações da corrida e as curvas da etapa 5 são ilustrativos e não são medições do programa.

### 4.3 Laboratório (`laboratorio.js`)

- **Disponibilidade:** funciona apenas quando o painel é aberto pelo servidor. Se a página for aberta diretamente do arquivo, a seção mostra um aviso pedindo para executar `yarn start`.
- **Controles:** tamanho da entrada (atalhos 1k, 10k, 50k e 100k ou campo numérico de 1 a 1.000.000), cenário (Todos, Aleatório, Ordenado, Inverso ou Semi-ordenado) e botão "Gerar" (ou Enter no campo). O painel avisa que acima de 100.000 registros apenas o cenário ordenado é aceito e que, a partir de 50.000, Bubble Sort e Insertion Sort levam alguns segundos por cenário.
- **Execução:** para cada cenário escolhido, o painel envia um `POST /api/cenario`, um após o outro, e mostra o cartão em estado de carregamento. Erros (400, 409 ou 500) aparecem no próprio cartão; um 409 interrompe a sequência.
- **Geração automática:** ao abrir o painel com o servidor livre, os quatro cenários são gerados com n = 10.000.
- **Cartão de cada cenário:** nome e ícone do cenário; n e tempo total do processo; destaque do algoritmo mais rápido com seu tempo; seis barras horizontais, ordenadas do mais rápido para o mais lento, com comprimento proporcional ao tempo (relativo ao maior tempo do cartão); frase com a razão entre o mais lento e o mais rápido; e as linhas `ERRO:` impressas pelo programa, caso algum algoritmo não ordene corretamente.
- **Detalhes do cenário selecionado** (clique no cartão ou nas abas acima do mapa):
  - mapa 3D (seção 4.4);
  - estatísticas: imagens geradas, média de nuvens, percentual de céu limpo (nuvens ≤ 20%) e período de captura;
  - histograma da cobertura de nuvens em 10 faixas;
  - tabelas "Antes" e "Depois", com os 10 primeiros registros impressos pelo programa, data e hora convertidas do `timestamp` para UTC, a coluna de captura destacada na tabela ordenada e a cobertura de nuvens acompanhada de uma barra proporcional.
- **Dados consumidos:** JSON da rota `/api/cenario`.

### 4.4 Mapa 3D (`mapa3d.js`)

**Origem dos dados.** Os pontos são registros reais, gerados pelo programa em C no cenário selecionado: o servidor lê o arquivo salvo pela opção 7 e envia uma amostra de até 2.500 registros (um a cada ⌊total/2.500⌋). Os valores vêm de `gerar_imagem()`: latitude uniforme entre −16° e +4°, longitude uniforme entre −74° e −44°, `timestamp` entre 01/01/2025 00:00 UTC e 30 dias depois e cobertura de nuvens inteira de 0 a 100. Como a distribuição é uniforme, as posições não representam locais reais de captura; o mapa mostra a distribuição espacial dos dados sintéticos sobre a região.

**Sistema de coordenadas.** Cada grau corresponde a uma unidade do espaço 3D: x = longitude + 59 (de −15 a 15, oeste para leste), z = −6 − latitude (de −10, ao norte, a 10, ao sul) e y é a altura.

**Técnica de desenho.** Canvas 2D, sem WebGL e sem bibliotecas. A projeção em perspectiva é calculada no próprio arquivo: rotação em torno do eixo vertical (giro), rotação de inclinação, translação pela distância da câmera e divisão pela profundidade. Os elementos são desenhados de trás para frente, após ordenação por profundidade (algoritmo do pintor). As faces voltadas para trás são descartadas pelo sinal da área projetada, o sombreamento das laterais usa o produto escalar entre a normal da face e uma direção de luz fixa, e os elementos mais distantes são escurecidos (neblina).

**Elementos desenhados.**

- Bloco de terreno retangular que cobre exatamente a região dos dados (−16° a 4° de latitude, −74° a −44° de longitude), com espessura e textura decorativa.
- Grade a cada 5°, com rótulos em graus, e linha do Equador.
- Sete rios principais (Solimões/Amazonas, Negro, Madeira, Purus, Tapajós, Xingu e Tocantins), desenhados por polilinhas de coordenadas aproximadas, apenas como referência visual.
- Nove cidades (Manaus, Belém, Porto Velho, Rio Branco, Boa Vista, Macapá, Santarém, Palmas e Cuiabá), com coordenadas aproximadas, e indicação do norte.
- Satélite decorativo em trajetória retilínea contínua, com feixe e área de cobertura no solo.

**Modo Colunas (padrão).** As imagens são agrupadas em uma grade hexagonal de raio 0,95°. Altura de cada coluna = 0,25 + 2,6 × (imagens na coluna ÷ maior contagem). A cor representa a média de nuvens da coluna, numa escala do verde ao branco entre a menor e a maior média observada (consideradas as colunas com pelo menos 3 imagens); os valores-limite aparecem na legenda.

**Modo Pontos.** Cada imagem é um ponto sobre uma haste. Altura e cor são proporcionais à cobertura de nuvens: de 0% a 100%, até 3,4 unidades de altura, do verde (céu limpo) ao branco (nublado).

**Linha do tempo.** O botão "Ver capturas em ordem" exibe as imagens em ordem crescente de `timestamp` ao longo de 14 segundos. A data e a hora (UTC) da última imagem exibida e a contagem acompanham a reprodução; colunas que acabaram de receber uma imagem ficam laranja e pontos recentes ganham um anel. O controle deslizante permite avançar ou voltar, e o botão alterna entre pausar e continuar. A ordenação desses pontos é feita no navegador (`Array.prototype.sort`) e serve apenas à visualização.

**Interações.**

- Arrastar: gira e inclina o mapa.
- Duplo clique: volta à vista inicial.
- Botões + e −, ou Ctrl + rolagem: aproximam e afastam.
- "Ver de cima": vista quase vertical, que desliga o giro automático.
- Giro automático: pausa com o ponteiro sobre o mapa.
- Colunas/Pontos: alterna o modo de exibição.
- Dica ao passar o ponteiro. Coluna: posição aproximada, número de imagens e média de nuvens. Ponto: id, data e hora, latitude, longitude e nuvens. Cidade: coordenadas.

**Desempenho.** A animação só roda enquanto o mapa está visível na tela e a aba está ativa. Com a preferência por movimento reduzido, não há giro automático nem animação de entrada, e o satélite fica parado.

**Limitações.** Em perspectiva, as alturas de colunas distantes não podem ser comparadas com precisão; por isso o mapa oferece a dica com valores exatos e a vista de cima. A região é um retângulo de coordenadas, não o contorno real do bioma. Com dados uniformes, as diferenças entre colunas refletem apenas a variação aleatória da amostra.

### 4.5 Benchmark (`app.js`)

- **Fontes de dados:** `resultados.csv` do servidor (carregado automaticamente), botão "Abrir CSV" ou arrastar e soltar um arquivo. Validação: cabeçalho exatamente igual a `cenario,n,algoritmo,tempo_ms` e cada linha com quatro campos e números válidos. Mensagens: `Cabeçalho inválido. Esperado: cenario,n,algoritmo,tempo_ms`, `Linha X com formato inválido.` e `O arquivo não tem medições.`.
- **Filtros:** cenário e escala do eixo Y (logarítmica ou linear); tamanho n no ranking e no mapa de calor.
- **Cartões de resumo:** algoritmo mais rápido e mais lento no maior n do cenário, razão entre os dois ("Diferença entre extremos") e cenário selecionado.
- **Gráfico "Tempo × tamanho da entrada":**
  - uma linha por algoritmo;
  - eixo X em escala logarítmica com os cinco tamanhos;
  - eixo Y logarítmico (padrão) ou linear; na escala logarítmica, valores abaixo de 0,001 ms são desenhados em 0,001 ms;
  - legenda clicável para ocultar ou mostrar séries;
  - ao passar o ponteiro, linha vertical de referência e dica com os seis tempos em ordem crescente.
- **Ranking:** barras horizontais em escala linear, ordenadas do mais rápido ao mais lento, com o valor ao lado. A dica mostra a posição e a razão em relação ao primeiro.
- **Mapa de calor:** algoritmo × cenário para o n escolhido, com cor em escala logarítmica entre o menor e o maior tempo e o valor escrito na célula.
- **Tabela completa:** algoritmo × tamanho para o cenário selecionado, com o selo "melhor" no menor tempo de cada coluna.
- **Formatação:** vírgula decimal; até três casas abaixo de 1 ms; valores a partir de 1.000 ms em segundos.
- **Execução pelo painel:**
  1. O botão "Rodar benchmark" abre uma janela de confirmação, e o painel então envia `POST /api/benchmark`.
  2. Um painel flutuante mostra a barra de progresso, as medições concluídas, o tempo decorrido, a última medição e um atalho para os gráficos.
  3. Os gráficos são atualizados a cada evento, com o CSV parcial.
  4. "Cancelar" interrompe a execução.
  5. Ao concluir, o painel mostra "Benchmark concluído" e se fecha após 12 segundos; em caso de erro, exibe a mensagem.
- **Sem servidor:** aberta diretamente do arquivo, a seção funciona com CSV aberto pelo usuário.

---

## 5. Como compilar e executar

### 5.1 Pré-requisitos

| Ferramenta | Versão usada | Observação |
|---|---|---|
| GCC | 15.2.0 | Qualquer compilador com suporte a C99 |
| Node.js | v22.22.1 | Mínimo 18 (campo `engines` do `package.json`) |
| Yarn | 1.22.22 | Apenas para os scripts; pode ser substituído pelos comandos equivalentes |
| Navegador | Brave e Firefox | Qualquer navegador atual |

Instalação no Ubuntu (a mesma usada neste levantamento, no Ubuntu 26.04 LTS):

```bash
sudo apt update
sudo apt install -y build-essential nodejs npm
sudo npm install -g yarn
gcc --version && node -v && yarn -v
```

### 5.2 Comandos

```bash
# compilar somente o programa em C
gcc -O2 -Wall -Wextra -std=c99 -o geosort geosort.c     # ou: yarn build

# instalar dependências: opcional, pois o projeto não tem dependências
# (o comando apenas cria yarn.lock e node_modules)
yarn install

# sistema completo: compila e inicia o servidor em http://localhost:3000
yarn dev                      # equivalente a: yarn start
PORT=8080 yarn dev            # em outra porta

# menu de terminal
./geosort                     # ou: yarn menu (compila antes)

# benchmark sozinho
./geosort --benchmark resultados_benchmark.csv
yarn benchmark                # compila e grava em resultados.csv
```

O servidor é encerrado com Ctrl+C, que também encerra um processo do `geosort` em andamento. Para ver um CSV gerado pelo terminal no painel, use o botão "Abrir CSV" ou arraste o arquivo para a página; o carregamento automático procura apenas `resultados.csv`.

Os comandos foram testados em Ubuntu 26.04 LTS. O servidor prevê o nome `geosort.exe` no Windows, mas os scripts do `package.json` usam a sintaxe do shell Unix (`./geosort`) e não foram testados nesse sistema.

### 5.3 Significado de `[cenario] aleatorio n=10000 em 0.3 s`

Essa linha é escrita pelo `server.js` no terminal em que o servidor está rodando, sempre que uma geração de cenário pedida pelo Laboratório termina com sucesso:

- `aleatorio` — cenário pedido (`aleatorio`, `ordenado`, `inverso` ou `semi`);
- `n=10000` — quantidade de registros;
- `em 0.3 s` — tempo total, em segundos com uma casa decimal, medido pelo servidor com `Date.now()` desde o início até o fim do processo `geosort`. Inclui iniciar o processo, gerar os registros, salvar o arquivo (opção 7), executar e verificar os seis algoritmos, imprimir as listagens e ler a saída. **Não é o tempo de ordenação medido com `clock()`**, que aparece nos cartões do Laboratório e no campo `tempos` da resposta.

Outras linhas do mesmo log: `[benchmark] iniciado`, `[benchmark] concluido em X s -> resultados.csv` e `[benchmark] interrompido (SIGTERM)`, quando a execução é cancelada.

Exemplo real, com o servidor iniciado com `PORT=3125` porque a porta 3000 estava ocupada por outra instância do servidor (sem a variável, o endereço exibido é `http://localhost:3000`). As quatro linhas `[cenario]` foram produzidas por quatro requisições `POST /api/cenario` com n = 10.000, as mesmas que o Laboratório faz ao abrir:

```
$ PORT=3125 yarn dev
yarn run v1.22.22
$ yarn start
$ yarn build && node server.js
$ gcc -O2 -Wall -Wextra -std=c99 -o geosort geosort.c

  GeoSort rodando em  http://localhost:3125
  Ainda sem resultados.csv: use o botao "Rodar benchmark" no painel.
  Ctrl+C para encerrar.

[cenario] aleatorio n=10000 em 0.2 s
[cenario] ordenado n=10000 em 0.0 s
[cenario] inverso n=10000 em 0.3 s
[cenario] semi n=10000 em 0.1 s
```

O cenário ordenado aparece como `0.0 s` porque o processo inteiro durou menos de 0,05 s.

---

## 6. Tratamento de erros e testes

### 6.1 Erros tratados no programa em C

| Situação | Tratamento | Mensagem |
|---|---|---|
| Opção do menu não numérica ou fora de 0–9 | Pede novamente | `Valor invalido (entre 0 e 9).` |
| Quantidade fora de 1–1.000.000 (opções 1–4) | Pede novamente | `Valor invalido (entre 1 e 1000000).` |
| Quantidade fora de 1–1.000.000 (opção 6) | Volta ao menu | `Quantidade invalida (entre 1 e 1000000).` |
| Registro digitado em formato inválido (opção 6) | Libera a memória e volta ao menu | `Entrada invalida. Abortando.` |
| Fim da entrada (EOF) em qualquer leitura | Encerra normalmente, liberando a memória | `Encerrado.` |
| Arquivo inexistente ou sem permissão (opção 5) | Mantém os dados atuais | `Erro: nao foi possivel abrir '<caminho>'.` |
| Linha em formato inválido no arquivo | Ignora a linha e continua | `Aviso: linha N ignorada (formato invalido).` |
| Arquivo sem nenhum registro válido | Mantém os dados atuais | `Nenhum registro valido no arquivo.` |
| Caminho vazio ou com mais de 198 caracteres | Volta ao menu | `Caminho vazio.` / `Caminho muito longo (max 198 caracteres).` |
| Arquivo de saída não pode ser criado (opção 7) | Volta ao menu | `Erro: nao foi possivel criar '<caminho>'.` |
| Opções 7, 8 ou 9 sem dados carregados | Volta ao menu | `Nenhum dado carregado.` |
| Falta de memória em `ler_arquivo()` ou `ler_usuario()` | Retorna `NULL`; mantém os dados atuais | `Erro: memoria insuficiente.` |
| Falta de memória em `gerar_dados()`, `copiar_vetor()` ou `merge_sort()` | Encerra com código 1 | `Erro: memoria insuficiente...` |
| Algoritmo que não ordena corretamente (verificação após cada ordenação) | Informa e continua | `ERRO: <algoritmo> nao ordenou corretamente!` |
| Arquivo do benchmark não pode ser criado | Encerra o modo benchmark | `Erro ao criar <arquivo>` |

### 6.2 Erros tratados no servidor

| Situação | Resposta |
|---|---|
| Corpo que não é JSON válido em `/api/cenario` | 400 `{"erro":"JSON invalido."}` |
| Cenário desconhecido | 400 `{"erro":"Cenario invalido."}` |
| `n` não inteiro, menor que 1 ou acima do limite do cenário | 400 `{"erro":"Quantidade invalida: use de 1 a 100.000 neste cenario."}` (ou 1.000.000 no ordenado) |
| Corpo maior que 10.000 caracteres | A requisição é interrompida |
| Outro processo do `geosort` em execução | 409 `{"erro":"O programa ja esta em execucao. Aguarde terminar."}` |
| Executável `geosort` ausente | 500 `{"erro":"Binario nao encontrado. Rode \"yarn build\"."}` |
| Programa encerrado com erro ou saída sem a tabela de resultados | 500 com a mensagem de erro do programa ou `Nao foi possivel ler os resultados do programa.` |
| Cenário com mais de 10 minutos | Processo encerrado com SIGTERM |
| Navegador cancela a requisição (cenário ou benchmark) | Processo encerrado com SIGTERM; temporário apagado |
| Benchmark interrompido | Evento `erro` e remoção de `resultados.tmp.csv`; o `resultados.csv` anterior é mantido |
| Caminho fora de `dashboard/` ou `public/` | 403 |
| Arquivo inexistente | 404 |
| Método não permitido | 405 |
| URL com codificação inválida | 400 |
| Ctrl+C no servidor | Encerra o processo filho e apaga o temporário |

### 6.3 Erros tratados no painel

- CSV com cabeçalho diferente, linha com formato inválido ou sem medições: o arquivo é recusado, os dados já exibidos são mantidos e a mensagem aparece na área de abertura de arquivo (visível enquanto nenhum CSV foi carregado; ver 6.5).
- Painel aberto sem servidor: o Laboratório mostra um aviso e o botão "Rodar benchmark" não aparece.
- Erros das rotas (400, 409, 500 ou falha de rede): exibidos no cartão do cenário, no aviso do Laboratório ou no painel flutuante do benchmark.
- Navegador sem `localStorage` (por exemplo, em modo privado): as preferências apenas deixam de ser lembradas.

### 6.4 Testes realizados e saídas

Ambiente: Intel Core i7-4600U (2 núcleos, 4 threads, 2,1 GHz, até 3,3 GHz), 7,1 GiB de RAM, Ubuntu 26.04 LTS (kernel 7.0.0-38), gcc 15.2.0, Node.js v22.22.1. Os testes do programa foram executados com a entrada redirecionada (`printf ... | ./geosort`). Por brevidade, as linhas do menu repetidas foram omitidas das saídas, exceto no caso (a). Mensagens de erro (`stderr`) aparecem no início de cada saída, porque o terminal recebeu as duas saídas pelo mesmo canal.

**Compilação**

```
$ gcc -O2 -Wall -Wextra -std=c99 -o geosort geosort.c
(nenhuma mensagem; código de saída 0)

$ gcc -O2 -Wall -Wextra -Wpedantic -std=c99 -o geosort geosort.c
(nenhuma mensagem; código de saída 0)
```

**(a) Gerar 20 registros aleatórios e executar a comparação (opção 9)** — `printf '1\n20\n9\n0\n' | ./geosort`

```
===== GeoSort - Catalogo de Imagens de Satelite =====
1) Gerar dados aleatorios
2) Gerar dados ordenados
3) Gerar dados inversamente ordenados
4) Gerar dados semi-ordenados
5) Carregar de arquivo texto
6) Digitar dados manualmente
7) Salvar dados atuais em arquivo
8) Listar dados atuais
9) Executar comparacao de ordenacao
0) Sair
Opcao: Quantidade de registros (1 a 1000000): 20 registros gerados.
[menu]
Opcao: 
--- ANTES DA ORDENACAO ---
ID       TIMESTAMP    LAT        LON        NUV%  
100000   1737601247   -15.3419   -65.6022   16    
100001   1737303291   -1.0377    -63.3703   90    
100002   1736605582   -2.0020    -46.5170   1     
100003   1736501562   -3.1818    -46.0450   42    
100004   1737300342   0.0441     -44.3927   64    
100005   1737510172   -0.5762    -46.5776   9     
100006   1736704495   1.9775     -51.7545   56    
100007   1737590220   -12.5615   -59.7551   15    
100008   1736220526   -0.9049    -50.7887   39    
100009   1736993046   -13.4393   -49.8570   39    
... (10 registros omitidos)

--- DEPOIS DA ORDENACAO (Heap Sort) ---
ID       TIMESTAMP    LAT        LON        NUV%  
100017   1735881626   3.5825     -72.0506   6     
100015   1736057993   3.0218     -68.8298   30    
100008   1736220526   -0.9049    -50.7887   39    
100003   1736501562   -3.1818    -46.0450   42    
100019   1736599268   -12.7218   -72.6507   49    
100002   1736605582   -2.0020    -46.5170   1     
100011   1736627325   -3.8219    -70.3791   72    
100006   1736704495   1.9775     -51.7545   56    
100012   1736755193   -13.8479   -69.3398   66    
100009   1736993046   -13.4393   -49.8570   39    
... (10 registros omitidos)

=== RESULTADOS COMPARATIVOS (n = 20) ===
Algoritmo            Tempo (ms)
Bubble Sort               0.002
Insertion Sort            0.001
Shell Sort                0.001
Merge Sort                0.003
Quick Sort                0.001
Heap Sort                 0.001
Mais rapido: Insertion Sort
[menu]
Opcao: Encerrado.
```

**(b) Salvar em `teste.txt`, carregar o mesmo arquivo e comparar** — `printf '1\n20\n7\nteste.txt\n5\nteste.txt\n9\n0\n' | ./geosort`

```
Opcao: Quantidade de registros (1 a 1000000): 20 registros gerados.
Opcao: Nome do arquivo de saida: Arquivo salvo.
Opcao: Caminho do arquivo: 20 registros carregados.
Opcao: 
--- ANTES DA ORDENACAO ---
(mesmos 10 registros do caso (a))
--- DEPOIS DA ORDENACAO (Heap Sort) ---
(mesmos 10 registros do caso (a))
=== RESULTADOS COMPARATIVOS (n = 20) ===
Algoritmo            Tempo (ms)
Bubble Sort               0.002
Insertion Sort            0.001
Shell Sort                0.001
Merge Sort                0.002
Quick Sort                0.001
Heap Sort                 0.001
Mais rapido: Insertion Sort
Opcao: Encerrado.
```

Primeiras linhas do arquivo gravado (`teste.txt`, 21 linhas: cabeçalho e 20 registros):

```
# id;timestamp;latitude;longitude;nuvens
100000;1737601247;-15.3419;-65.6022;16
100001;1737303291;-1.0377;-63.3703;90
100002;1736605582;-2.0020;-46.5170;1
```

**(c) Arquivo inexistente, com 5 registros já carregados** — `printf '1\n5\n5\nnao_existe.txt\n8\n0\n' | ./geosort`

```
Erro: nao foi possivel abrir 'nao_existe.txt'.
Opcao: Quantidade de registros (1 a 1000000): 5 registros gerados.
Opcao: Caminho do arquivo: 
Opcao: ID       TIMESTAMP    LAT        LON        NUV%  
100000   1737601247   -15.3419   -65.6022   16    
100001   1737303291   -1.0377    -63.3703   90    
100002   1736605582   -2.0020    -46.5170   1     
100003   1736501562   -3.1818    -46.0450   42    
100004   1737300342   0.0441     -44.3927   64    
Opcao: Encerrado.
```

**(d) Arquivo só com cabeçalho, com 3 registros já carregados** — `printf '1\n3\n5\nso_cabecalho.txt\n8\n0\n' | ./geosort`

```
Nenhum registro valido no arquivo.
Opcao: Quantidade de registros (1 a 1000000): 3 registros gerados.
Opcao: Caminho do arquivo: 
Opcao: ID       TIMESTAMP    LAT        LON        NUV%  
100000   1737601247   -15.3419   -65.6022   16    
100001   1737303291   -1.0377    -63.3703   90    
100002   1736605582   -2.0020    -46.5170   1     
Opcao: Encerrado.
```

**(e) Arquivo com uma linha malformada no meio** — conteúdo: cabeçalho, `1;1735700000;-3.1;-60.0;10`, `2;17357xx;lixo`, `3;1735690000;-5.2;-55.5;40`

```
Aviso: linha 3 ignorada (formato invalido).
Opcao: Caminho do arquivo: 2 registros carregados.
Opcao: ID       TIMESTAMP    LAT        LON        NUV%  
1        1735700000   -3.1000    -60.0000   10    
3        1735690000   -5.2000    -55.5000   40    
Opcao: Encerrado.
```

**(f) Entradas inválidas no menu** — `printf 'abc\n99\n8\n0\n' | ./geosort`

```
Opcao: Valor invalido (entre 0 e 9).
Opcao: Valor invalido (entre 0 e 9).
Opcao: Nenhum dado carregado.
Opcao: Encerrado.
```

**(g) 1.000.000 de registros ordenados e comparação, sem estouro de pilha** — `printf '2\n1000000\n9\n0\n' | ./geosort`

```
Opcao: Quantidade de registros (1 a 1000000): 1000000 registros gerados.
Opcao: 
--- ANTES DA ORDENACAO ---
ID       TIMESTAMP    LAT        LON        NUV%  
707920   1735689607   -1.4349    -63.5792   33    
901256   1735689610   1.1112     -47.2639   20    
684683   1735689610   -11.9136   -50.5278   90    
606168   1735689610   -14.5751   -68.8411   49    
268961   1735689611   -8.3187    -58.6687   38    
622510   1735689618   -9.2846    -56.0418   52    
581529   1735689618   -7.6494    -56.6712   51    
914008   1735689620   -7.4083    -54.1260   58    
709120   1735689621   -1.5778    -47.6508   69    
915879   1735689624   -9.4382    -45.0531   30    
... (999990 registros omitidos)
--- DEPOIS DA ORDENACAO (Heap Sort) ---
ID       TIMESTAMP    LAT        LON        NUV%  
707920   1735689607   -1.4349    -63.5792   33    
606168   1735689610   -14.5751   -68.8411   49    
901256   1735689610   1.1112     -47.2639   20    
684683   1735689610   -11.9136   -50.5278   90    
268961   1735689611   -8.3187    -58.6687   38    
622510   1735689618   -9.2846    -56.0418   52    
581529   1735689618   -7.6494    -56.6712   51    
914008   1735689620   -7.4083    -54.1260   58    
709120   1735689621   -1.5778    -47.6508   69    
915879   1735689624   -9.4382    -45.0531   30    
... (999990 registros omitidos)
=== RESULTADOS COMPARATIVOS (n = 1000000) ===
Algoritmo            Tempo (ms)
Bubble Sort               3.069
Insertion Sort            6.861
Shell Sort              122.931
Merge Sort              188.802
Quick Sort               40.142
Heap Sort               127.463
Mais rapido: Bubble Sort
Opcao: Encerrado.

real	0m0,818s
```

Observação: nos registros com o mesmo `timestamp` (1735689610), a ordem relativa mudou após a ordenação, porque a listagem "depois" é o resultado do Heap Sort, que não é um algoritmo estável. A verificação `esta_ordenado()` considera apenas a chave e não acusou erro em nenhum algoritmo.

**(h) Benchmark completo** — `./geosort --benchmark resultados_benchmark.csv`: ver a seção 7.

**Casos adicionais da versão atual**

Caminho vazio seguido de caminho com espaço — `printf '5\n\n5\nmeus dados.txt\n0\n' | ./geosort`:

```
Caminho vazio.
Opcao: Caminho do arquivo: 
Opcao: Caminho do arquivo: 20 registros carregados.
Opcao: Encerrado.
```

Opção 6 com quantidade acima do limite e depois dois registros válidos — `printf '6\n2000000\n6\n2\n7 1735700000 -3.1 -60.0 10\n8 1735600000 -2.0 -55.0 90\n8\n0\n' | ./geosort`:

```
Quantidade invalida (entre 1 e 1000000).
Opcao: Quantidade de registros a digitar: 
Opcao: Quantidade de registros a digitar: Registro 1 - id timestamp latitude longitude nuvens: Registro 2 - id timestamp latitude longitude nuvens: 
Opcao: ID       TIMESTAMP    LAT        LON        NUV%  
7        1735700000   -3.1000    -60.0000   10    
8        1735600000   -2.0000    -55.0000   90    
Opcao: Encerrado.
```

Fim da entrada logo após gerar dados — `printf '1\n5' | ./geosort`:

```
Opcao: Quantidade de registros (1 a 1000000): 5 registros gerados.
Opcao: Encerrado.
```

**Memória: valgrind** (`valgrind --leak-check=full --show-leak-kinds=all --errors-for-leak-kinds=all ./geosort`)

| Caso | Memória em uso ao sair | Erros |
|---|---|---|
| (a) gerar 20 registros e opção 9 | 0 bytes em 0 blocos | 0 erros em 0 contextos |
| (b) salvar, carregar e opção 9 | 0 bytes em 0 blocos | 0 erros em 0 contextos |
| (c) arquivo inexistente | 0 bytes em 0 blocos | 0 erros em 0 contextos |
| (d) arquivo só com cabeçalho | 0 bytes em 0 blocos | 0 erros em 0 contextos |
| (e) linha malformada | 0 bytes em 0 blocos | 0 erros em 0 contextos |
| (f) entradas inválidas no menu | 0 bytes em 0 blocos | 0 erros em 0 contextos |
| Caminho vazio e com espaço, opção 6 inválida e válida, EOF | 0 bytes em 0 blocos | 0 erros em 0 contextos |

**AddressSanitizer e UndefinedBehaviorSanitizer** (`gcc -O1 -g -std=c99 -fsanitize=address,undefined`): os casos (a) a (f) terminaram com código 0 e nenhum erro relatado.

**Comparação com a versão original** (mesmos comandos nas duas versões):

```
### arquivo só com cabeçalho, com 3 registros já carregados
--- original:
Opcao: Quantidade de registros (1 a 1000000): 3 registros gerados.
Opcao: Caminho do arquivo: 0 registros carregados.
Opcao: ID       TIMESTAMP    LAT        LON        NUV%  
Opcao: Encerrado.
--- atual:
Nenhum registro valido no arquivo.
Opcao: Quantidade de registros (1 a 1000000): 3 registros gerados.
Opcao: Caminho do arquivo: 
Opcao: ID       TIMESTAMP    LAT        LON        NUV%  
100000   1736999854   -1.8288    -71.1502   84    
100001   1737556450   -6.7435    -51.8638   73    
100002   1736450435   -7.5247    -49.0012   26    
Opcao: Encerrado.

### caminho com espaço: 'meus dados.txt'
--- original:
Erro: nao foi possivel abrir 'meus'.
Opcao: Caminho do arquivo: 
Opcao: Encerrado.
--- atual:
Opcao: Caminho do arquivo: 20 registros carregados.
Opcao: Encerrado.

### fim da entrada (EOF) no meio da opção 6
--- original: código de saída 124 (travou e foi encerrado pelo timeout de 5 s)
--- atual:    código de saída 0

### caminho sem quebra de linha final (EOF) na opção 5
--- original: código de saída 124
--- atual:    código de saída 0

### memória ao encerrar por EOF com 5 registros carregados (valgrind)
--- original: in use at exit: 200 bytes in 1 blocks
--- atual:    in use at exit: 0 bytes in 0 blocks
```

**Servidor** (cópia do projeto executada na porta 3124):

```
$ curl -s localhost:3124/api/status
{"binario":true,"resultados":false,"rodando":false,"tarefa":null,"total":120,"limites":{"n":100000,"ordenado":1000000}}

$ curl -s -X POST -d '{"cenario":"aleatorio","n":10000}' localhost:3124/api/cenario   (resumo dos campos)
cenario: "aleatorio", n: 10000, segundos: 0.277
tempos: Bubble Sort 191.116 | Insertion Sort 43.384 | Shell Sort 1.059 | Merge Sort 1.306 | Quick Sort 0.757 | Heap Sort 1.117
mais_rapido: "Quick Sort", erros_ordenacao: [], algoritmo_listado: "Heap Sort"
antes: 10 registros, depois: 10 registros, pontos: 2500 (ex.: [100000,1737681592,-8.4426,-61.8448,31])
resumo: total 10000, nuvens_media 49.7014, limpas 2103, inicio 1735689705, fim 1738281383,
        faixas_nuvens [999, 979, 1013, 992, 1042, 962, 988, 972, 950, 1103]

$ POST /api/cenario  {"cenario":"inverso","n":200000}
{"erro":"Quantidade invalida: use de 1 a 100.000 neste cenario."}  [HTTP 400]
$ POST /api/cenario  {"cenario":"ordenado","n":0}
{"erro":"Quantidade invalida: use de 1 a 1.000.000 neste cenario."}  [HTTP 400]
$ POST /api/cenario  {"cenario":"xyz","n":10}
{"erro":"Cenario invalido."}  [HTTP 400]
$ POST /api/cenario  nao-e-json
{"erro":"JSON invalido."}  [HTTP 400]

$ GET /public/marca-claro.png                     [HTTP 200] image/png
$ GET /public/..%2fserver.js (sair da pasta)       [HTTP 403]
$ GET /resultados.csv (ainda inexistente)          [HTTP 404]
$ POST /qualquer                                   [HTTP 405]

$ POST /api/benchmark (cancelado pelo cliente após 2 s) e, durante a execução, POST /api/cenario
{"erro":"O programa ja esta em execucao. Aguarde terminar."}  [HTTP 409]
primeira linha do fluxo NDJSON (campo csv encurtado):
{"tipo":"progresso","feitas":12,"total":120,"ultima":"aleatorio,5000,Heap Sort,0.464","segundos":0.405,"csv":"cenario,n,algoritmo,tempo_ms\naleatorio,1000,Bubble Sort,0.985\n...
status após o cancelamento: {"binario":true,"resultados":false,"rodando":false,...}
arquivos temporários restantes: 0

log do servidor:
  GeoSort rodando em  http://localhost:3124
  Ainda sem resultados.csv: use o botao "Rodar benchmark" no painel.
  Ctrl+C para encerrar.
[cenario] aleatorio n=10000 em 0.3 s
[benchmark] iniciado
[benchmark] interrompido (SIGTERM)
```

**Painel:** verificado por capturas de tela automatizadas no Firefox 151 em modo *headless*, nas larguras de 1280 px e 400 px e nos temas claro e escuro, sem erros de JavaScript durante o carregamento. As capturas estão na pasta `prints/` (seção 8). O projeto não possui testes automatizados de unidade para o JavaScript.

### 6.5 Limitações conhecidas

- **Linha em branco com quebra de linha do Windows (CRLF):** registros terminados em `\r\n` são lidos normalmente, mas uma linha em branco com `\r\n` não é reconhecida como vazia e gera aviso. Arquivo com cabeçalho, um registro, uma linha em branco e outro registro, todos com CRLF:
  ```
  $ printf '5\ncrlf.txt\n8\n0\n' | ./geosort
  Aviso: linha 3 ignorada (formato invalido).
  Opcao: Caminho do arquivo: 2 registros carregados.
  Opcao: ID       TIMESTAMP    LAT        LON        NUV%  
  1        1735700000   -3.1000    -60.0000   10    
  2        1735690000   -5.2000    -55.5000   40    
  Opcao: Encerrado.
  ```
- **Linhas com mais de 255 caracteres no arquivo:** `fgets` lê a linha em partes de até 255 caracteres. O registro do início da linha é lido, mas o restante conta como mais uma linha, e o número informado nos avisos deixa de corresponder ao número real da linha. Arquivo com 3 linhas (cabeçalho, um registro seguido de 300 espaços e outro registro):
  ```
  $ printf '5\nlinha_longa.txt\n8\n0\n' | ./geosort
  Aviso: linha 3 ignorada (formato invalido).
  Opcao: Caminho do arquivo: 2 registros carregados.
  Opcao: ID       TIMESTAMP    LAT        LON        NUV%  
  1        1735700000   -3.1000    -60.0000   10    
  2        1735690000   -5.2000    -55.5000   40    
  Opcao: Encerrado.
  ```
  O aviso cita a "linha 3", mas a terceira linha do arquivo (o segundo registro) foi carregada; a linha ignorada é o restante da segunda.
- **Porta ocupada:** se a porta já estiver em uso, o Node.js encerra o servidor com erro (código de saída 1): `Error: listen EADDRINUSE: address already in use :::3124`. Nesse caso, use outra porta (`PORT=8080 yarn dev`).
- **Acesso pela rede:** o servidor escuta em todas as interfaces de rede (o endereço `:::3124` da mensagem acima indica isso) e não tem autenticação. Destina-se a uso local, em rede confiável.
- **Ordem de registros com chaves iguais:** a listagem "depois" da opção 9 é o resultado do Heap Sort, que não é estável; registros com o mesmo `timestamp` podem mudar de ordem relativa, como no caso (g). A verificação `esta_ordenado()` compara apenas as chaves, portanto isso não é tratado como erro.
- **CSV inválido com resultados já na tela:** a mensagem de erro do painel fica na área de abertura de arquivo, que só é exibida enquanto nenhum CSV foi carregado. Com resultados na tela, um arquivo inválido é recusado sem mensagem visível e os dados exibidos são mantidos.
- **Limites do Laboratório:** acima de 100.000 registros, o servidor só aceita o cenário ordenado; no menu do programa, o limite continua sendo 1.000.000 para todos os cenários.
- **Duração do benchmark:** cerca de 5 minutos nesta máquina (seção 7). Enquanto ele roda, o Laboratório recebe a resposta 409.

### 6.6 Testes que podem ser acrescentados

- Compilar e executar com outro compilador (por exemplo, `clang -std=c99 -Wall -Wextra`) e em outro sistema operacional.
- Simular falta de memória limitando a memória do processo (por exemplo, `ulimit -v`) para exercitar os caminhos de `Erro: memoria insuficiente.`.
- Carregar arquivos grandes (1.000.000 de linhas) gerados pela opção 7 e comparar com os mesmos dados gerados em memória.
- Repetir o benchmark várias vezes com o computador sem outros programas abertos e calcular média e desvio padrão entre as execuções.

---

## 7. Resultados

### 7.1 Condições da execução

| Item | Valor |
|---|---|
| Comando | `./geosort --benchmark resultados_benchmark.csv` |
| Compilação | `gcc -O2 -Wall -Wextra -std=c99` (gcc 15.2.0) |
| Processador | Intel Core i7-4600U, 2 núcleos e 4 threads, 2,1 GHz (até 3,3 GHz) |
| Memória e sistema | 7,1 GiB de RAM; Ubuntu 26.04 LTS, kernel 7.0.0-38 |
| Data e horário | 30/10/2026, das 23:35:35 às 23:40:29 |
| Duração total | 293,65 s (290,86 s de CPU em modo usuário) |
| Carga do sistema | Navegador e editor de código abertos; média de carga de 1 minuto entre 3,56 e 3,79 (4 threads) |
| Arquivo gerado | `resultados_benchmark.csv`: cabeçalho e 120 linhas (30 por cenário) |

### 7.2 Tempos medidos

Tempo em milissegundos, média de 3 execuções (valores do CSV com vírgula decimal):

| Cenário | Algoritmo | n = 1.000 | n = 5.000 | n = 10.000 | n = 50.000 | n = 100.000 |
|---|---|---:|---:|---:|---:|---:|
| Aleatório | Bubble Sort | 1,298 | 40,106 | 179,333 | 5.197,993 | 25.008,689 |
| Aleatório | Insertion Sort | 0,466 | 11,079 | 41,906 | 1.421,640 | 6.842,837 |
| Aleatório | Shell Sort | 0,092 | 0,484 | 1,121 | 7,653 | 19,275 |
| Aleatório | Merge Sort | 0,105 | 0,566 | 1,446 | 7,587 | 17,204 |
| Aleatório | Quick Sort | 0,057 | 0,283 | 0,571 | 3,720 | 8,595 |
| Aleatório | Heap Sort | 0,096 | 0,467 | 1,036 | 8,037 | 18,742 |
| Ordenado | Bubble Sort | 0,002 | 0,007 | 0,013 | 0,148 | 0,307 |
| Ordenado | Insertion Sort | 0,004 | 0,016 | 0,035 | 0,222 | 0,367 |
| Ordenado | Shell Sort | 0,034 | 0,128 | 0,318 | 1,964 | 8,474 |
| Ordenado | Merge Sort | 0,049 | 0,252 | 0,535 | 4,370 | 11,531 |
| Ordenado | Quick Sort | 0,015 | 0,083 | 0,171 | 1,009 | 2,318 |
| Ordenado | Heap Sort | 0,074 | 0,364 | 0,748 | 4,856 | 10,362 |
| Inverso | Bubble Sort | 1,406 | 37,488 | 155,263 | 4.338,715 | 22.618,229 |
| Inverso | Insertion Sort | 0,754 | 20,700 | 97,475 | 3.015,696 | 13.664,766 |
| Inverso | Shell Sort | 0,036 | 0,172 | 0,395 | 3,632 | 6,157 |
| Inverso | Merge Sort | 0,056 | 0,272 | 0,625 | 5,225 | 10,095 |
| Inverso | Quick Sort | 0,021 | 0,108 | 0,198 | 1,713 | 2,929 |
| Inverso | Heap Sort | 0,081 | 0,354 | 0,728 | 5,515 | 10,824 |
| Semi-ordenado | Bubble Sort | 0,733 | 19,867 | 85,357 | 2.356,301 | 10.176,421 |
| Semi-ordenado | Insertion Sort | 0,094 | 1,958 | 8,274 | 262,020 | 1.089,671 |
| Semi-ordenado | Shell Sort | 0,070 | 0,397 | 0,857 | 6,630 | 15,140 |
| Semi-ordenado | Merge Sort | 0,050 | 0,402 | 0,672 | 4,502 | 11,281 |
| Semi-ordenado | Quick Sort | 0,026 | 0,139 | 0,261 | 1,668 | 3,480 |
| Semi-ordenado | Heap Sort | 0,076 | 0,373 | 0,784 | 4,806 | 10,070 |

### 7.3 Leitura dos resultados

- **Algoritmo mais rápido:** Quick Sort em todos os tamanhos dos cenários aleatório, inverso e semi-ordenado. No cenário ordenado, Bubble Sort em todos os tamanhos (0,307 ms com 100.000 registros), porque a parada antecipada encerra a ordenação após uma passada sem trocas; Insertion Sort fica logo atrás (0,367 ms).
- **Cenário aleatório, n = 100.000:** Bubble Sort levou 25.008,689 ms e Quick Sort 8,595 ms, uma razão de cerca de 2.910 vezes.
- **Cenário inverso, n = 100.000:** é o pior caso de Bubble Sort (22.618,229 ms) e de Insertion Sort (13.664,766 ms).
- **Cenário semi-ordenado, n = 100.000:** Insertion Sort levou 1.089,671 ms, cerca de 16% do tempo no cenário aleatório (6.842,837 ms), pois há menos elementos fora de posição.
- **Crescimento de 10.000 para 100.000 registros (10 vezes mais dados) no cenário aleatório:**
  - Bubble Sort: ×139,5; Insertion Sort: ×163,3 (o crescimento quadrático prevê ×100);
  - Merge Sort: ×11,9; Quick Sort: ×15,1; Heap Sort: ×18,1 (n log n prevê ×12,5);
  - Shell Sort: ×17,2.

  Fatores acima do previsto são compatíveis com efeitos de memória cache: cada registro ocupa 40 bytes (`sizeof(Imagem)`), e 100.000 registros ocupam cerca de 4 MB.

### 7.4 Comparação com a versão original

**Como foi feita.** A versão original (`geosort.c` de 367 linhas) foi compilada com o mesmo compilador e as mesmas opções e executada com `--benchmark` logo em seguida, na mesma máquina: das 23:40:29 às 23:44:47, em 258,08 s, com carga entre 3,56 e 3,14. Também foi usada uma execução anterior da versão atual, feita no mesmo dia, das 22:23 às 22:28.

**O código medido é o mesmo.** O código-fonte das funções de ordenação, de `medir()`, de `gerar_dados()` e de `benchmark()` não mudou. A comparação do código de máquina das duas versões (`objdump -d`, desconsiderando endereços) confirmou:

| Função | Instruções | Resultado |
|---|---:|---|
| `bubble_sort` | 42 | Mesmas instruções |
| `insertion_sort` | 39 | Mesmas instruções |
| `shell_sort` | 77 | Mesmas instruções |
| `merge_sort` / `merge_rec` | 32 / 160 | Mesmas instruções |
| `quick_sort` / `quick_rec` | 9 / 217 | Mesmas instruções |
| `heap_sort` / `heapify` | 47 / 52 | Mesmas instruções |
| `medir` | 28 | Mesmas instruções |
| `gerar_dados` | 171 | Mesmas instruções |
| `benchmark` | 173 | Mesmas instruções |
| `comparar` | 171 | Difere apenas em instruções de preenchimento (NOP) para alinhamento; não é usada pelo benchmark |

Como a semente (42) e a função `gerar_dados()` são as mesmas, os vetores ordenados nas duas versões também são idênticos.

**Os números mudaram dentro da variação normal da medição.**

| Comparação | Medições ≥ 1 ms | Razão mediana | Faixa da razão | Dentro de ±10% | Mesmo mais rápido | Mesma ordem completa |
|---|---:|---:|---:|---:|---:|---:|
| Atual ÷ original | 58 | 1,09 | 0,71 a 1,34 | 25 | 20 de 20 | 14 de 20 |
| Atual ÷ execução anterior da versão atual | 62 | 0,95 | 0,57 a 1,56 | 24 | 20 de 20 | 14 de 20 |

- Nas medições abaixo de 1 ms, a maior diferença absoluta foi de 0,162 ms entre a versão atual e a original, e de 0,288 ms entre as duas execuções da versão atual.
- Nas 6 combinações em que a ordem completa mudou, as trocas ocorreram entre algoritmos cujos tempos diferiam em no máximo 14%. Por exemplo, Merge Sort e Heap Sort no cenário inverso com 100.000 registros mediram 11,463 e 10,927 ms na original e 10,095 e 10,824 ms na atual.

Valores com 100.000 registros nas duas versões:

| Cenário | Algoritmo | Original (ms) | Atual (ms) | Atual / original |
|---|---|---:|---:|---:|
| Aleatório | Bubble Sort | 20.821,181 | 25.008,689 | 1,20 |
| Aleatório | Insertion Sort | 5.739,497 | 6.842,837 | 1,19 |
| Aleatório | Shell Sort | 19,203 | 19,275 | 1,00 |
| Aleatório | Merge Sort | 15,963 | 17,204 | 1,08 |
| Aleatório | Quick Sort | 7,440 | 8,595 | 1,16 |
| Aleatório | Heap Sort | 16,652 | 18,742 | 1,13 |
| Ordenado | Bubble Sort | 0,296 | 0,307 | 1,04 |
| Ordenado | Insertion Sort | 0,364 | 0,367 | 1,01 |
| Ordenado | Shell Sort | 6,447 | 8,474 | 1,31 |
| Ordenado | Merge Sort | 10,467 | 11,531 | 1,10 |
| Ordenado | Quick Sort | 2,001 | 2,318 | 1,16 |
| Ordenado | Heap Sort | 8,666 | 10,362 | 1,20 |
| Inverso | Bubble Sort | 17.336,521 | 22.618,229 | 1,30 |
| Inverso | Insertion Sort | 12.943,251 | 13.664,766 | 1,06 |
| Inverso | Shell Sort | 8,716 | 6,157 | 0,71 |
| Inverso | Merge Sort | 11,463 | 10,095 | 0,88 |
| Inverso | Quick Sort | 3,101 | 2,929 | 0,94 |
| Inverso | Heap Sort | 10,927 | 10,824 | 0,99 |
| Semi-ordenado | Bubble Sort | 11.185,372 | 10.176,421 | 0,91 |
| Semi-ordenado | Insertion Sort | 1.174,357 | 1.089,671 | 0,93 |
| Semi-ordenado | Shell Sort | 15,239 | 15,140 | 0,99 |
| Semi-ordenado | Merge Sort | 11,876 | 11,281 | 0,95 |
| Semi-ordenado | Quick Sort | 4,081 | 3,480 | 0,85 |
| Semi-ordenado | Heap Sort | 12,334 | 10,070 | 0,82 |

**Por que os números variam.** O código e os dados são os mesmos, e duas execuções da própria versão atual variam tanto quanto a versão atual em relação à original. A diferença, portanto, vem das condições de execução:

- `clock()` mede o tempo de processador do processo (resolução nominal de 1 µs nesta máquina, `CLOCKS_PER_SEC` = 1.000.000). Esse tempo ainda depende da frequência do processador, que varia entre 0,8 e 3,3 GHz nesta máquina conforme a carga e a temperatura, e da disputa por cache e memória com outros programas: navegador e editor estavam abertos, com carga média entre 3,1 e 3,8 em 4 threads.
- A versão atual foi executada primeiro, com carga um pouco maior; a original rodou logo em seguida.
- Nos tempos de milésimos de milissegundo, a resolução da medição pesa sobre o resultado.

**Conclusão.** Os valores absolutos mudaram entre as execuções: de −29% a +34% nas medições acima de 1 ms, comparando a versão atual com a original. Já o algoritmo mais rápido em cada cenário e tamanho e as ordens de grandeza são os mesmos nas três execuções. Para a monografia, recomenda-se informar a máquina utilizada e, se possível, repetir o benchmark com os demais programas fechados.

---

## 8. Prints sugeridos para a monografia

As capturas abaixo estão na pasta `prints/`. Foram feitas automaticamente com o Firefox 151 em modo *headless*, em janela de 1280 px de largura (400 px na figura de celular). Algumas condições da captura:

- As animações foram desligadas para registrar o estado final das telas animadas.
- O mapa foi capturado com o giro automático desligado e a linha do tempo em 42% da reprodução.
- A corrida da apresentação foi capturada após 60 passos.
- Os dados do Laboratório foram gerados pelo programa no momento da captura (n = 10.000, semente pelo relógio), por isso os números diferem dos testes da seção 6.
- As figuras da seção Benchmark usam o `resultados_benchmark.csv` da seção 7, servido ao painel como `resultados.csv`.
- As três figuras de terminal foram montadas a partir do texto real capturado nos testes; não são fotografias da janela do terminal.

| Arquivo | Conteúdo | O que demonstra |
|---|---|---|
| `fig_painel_inicio.png` | Topo e banner inicial | Identidade visual e ponto de entrada do sistema web |
| `fig_intro_1_boas_vindas.png` | Etapa 1 da apresentação | Explicação do sistema na primeira visita |
| `fig_intro_3_corrida.png` | Etapa 3: corrida entre Bubble Sort e Quick Sort | Diferença no número de comparações entre O(n²) e O(n log n), de forma ilustrativa |
| `fig_intro_4_testes.png` | Etapa 4: roteiro do benchmark e formato dos cenários | Metodologia dos testes |
| `fig_intro_5_graficos.png` | Etapa 5: curvas de crescimento | Como interpretar os gráficos |
| `fig_laboratorio_cenarios.png` | Controles e cartões dos quatro cenários (n = 10.000) | Geração de cenários pelo programa em C a partir do navegador e ranking em cada cenário |
| `fig_mapa3d_colunas.png` | Mapa 3D no modo Colunas | Distribuição espacial das imagens geradas, agrupadas por região |
| `fig_mapa3d_pontos.png` | Mapa 3D no modo Pontos | Cada imagem com altura e cor proporcionais à cobertura de nuvens |
| `fig_mapa3d_linha_do_tempo.png` | Linha do tempo em andamento (42%) | Imagens exibidas em ordem cronológica, aplicação direta da ordenação |
| `fig_mapa3d_vista_de_cima.png` | Mapa visto de cima | Leitura plana da distribuição |
| `fig_laboratorio_antes_depois.png` | Tabelas "Antes" e "Depois" | Resultado da ordenação pelo instante de captura |
| `fig_benchmark_graficos.png` | Cartões de resumo e gráfico tempo × n em escala logarítmica | Crescimento do tempo com o tamanho da entrada |
| `fig_benchmark_ranking_mapa_calor.png` | Ranking (cenário aleatório, n = 100.000) e mapa de calor | Comparação entre algoritmos e entre cenários |
| `fig_benchmark_tabela.png` | Tabela completa do cenário aleatório | Valores numéricos e melhor algoritmo em cada tamanho |
| `fig_benchmark_confirmacao.png` | Janela de confirmação do benchmark | Execução da bateria completa pelo painel |
| `fig_tema_escuro.png` | Seção Benchmark no tema escuro | Tema alternativo do painel |
| `fig_responsivo_celular.png` | Laboratório em tela de 400 px | Layout responsivo |
| `fig_terminal_menu_comparacao.png` | Menu e opção 9 com 20 registros | Uso do programa em C pelo terminal |
| `fig_terminal_benchmark.png` | Início e fim da saída de `--benchmark` (linhas intermediárias omitidas, marcadas com "(...)") | Execução da bateria de medições |
| `fig_terminal_yarn_dev.png` | Compilação e inicialização do servidor, com quatro cenários gerados | Integração entre Yarn, GCC, servidor e programa |

Print recomendado que precisa ser feito manualmente:

- `fig_benchmark_progresso.png` — painel flutuante durante uma execução real do benchmark pelo painel (clicar em "Rodar benchmark", confirmar e capturar a tela durante a execução). Não foi gerado automaticamente porque depende de uma execução de cerca de 5 minutos em andamento.

---

## 9. Arquivos para enviar

Arquivos necessários para atualizar a monografia:

| Arquivo | Conteúdo |
|---|---|
| `RELATORIO_ALTERACOES.md` | Este relatório |
| `geosort.c` | Código-fonte atual do programa em C |
| `server.js` | Servidor local |
| `package.json` | Scripts de compilação e execução |
| `dashboard/index.html` | Estrutura do painel |
| `dashboard/style.css` | Estilos do painel |
| `dashboard/app.js` | Seção Benchmark |
| `dashboard/laboratorio.js` | Seção Laboratório |
| `dashboard/mapa3d.js` | Mapa 3D |
| `dashboard/intro.js` | Apresentação inicial |
| `resultados_benchmark.csv` | Resultado do benchmark completo (120 medições) |
| `prints/` | Capturas de tela da seção 8 |

Opcional: `public/logo-claro.png` e `public/logo-escuro.png`, para a capa ou para as figuras de identificação do sistema.
