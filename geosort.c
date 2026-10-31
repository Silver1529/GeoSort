/*
 * GeoSort - Sistema para Analise de Performance de Algoritmos de Ordenacao
 * Cenario: catalogo de imagens de satelite da Floresta Amazonica
 * UNIP - Ciencia da Computacao - APS 2026/2 - Estrutura de Dados
 */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>

#define MAX_LINHA 256
#define MAX_CAMINHO 200
#define MAX_REGISTROS 1000000L
#define NUM_ALGORITMOS 6

/* Registro catalogado de uma imagem de satelite */
typedef struct {
    long id;            /* identificador unico da imagem */
    long timestamp;     /* instante da captura (epoch, segundos) - CHAVE DE ORDENACAO */
    double latitude;
    double longitude;
    int nuvens;         /* cobertura de nuvens em % */
} Imagem;

/* Resultado de uma execucao de ordenacao */
typedef struct {
    char nome[32];
    double tempo_ms;
} Resultado;

/* ---------- Utilitarios ---------- */
static void trocar(Imagem *a, Imagem *b) {
    Imagem t = *a; *a = *b; *b = t;
}

static int esta_ordenado(const Imagem *v, long n) {
    for (long i = 1; i < n; i++)
        if (v[i-1].timestamp > v[i].timestamp) return 0;
    return 1;
}

static Imagem *copiar_vetor(const Imagem *origem, long n) {
    Imagem *c = (Imagem *) malloc(n * sizeof(Imagem));
    if (!c) { fprintf(stderr, "Erro: memoria insuficiente.\n"); exit(1); }
    memcpy(c, origem, n * sizeof(Imagem));
    return c;
}

/* ---------- Algoritmos de ordenacao (chave: timestamp) ---------- */
void bubble_sort(Imagem *v, long n) {
    int trocou;
    for (long i = 0; i < n - 1; i++) {
        trocou = 0;
        for (long j = 0; j < n - 1 - i; j++) {
            if (v[j].timestamp > v[j+1].timestamp) { trocar(&v[j], &v[j+1]); trocou = 1; }
        }
        if (!trocou) break; /* otimizacao: vetor ja ordenado */
    }
}

void insertion_sort(Imagem *v, long n) {
    for (long i = 1; i < n; i++) {
        Imagem chave = v[i];
        long j = i - 1;
        while (j >= 0 && v[j].timestamp > chave.timestamp) { v[j+1] = v[j]; j--; }
        v[j+1] = chave;
    }
}

void shell_sort(Imagem *v, long n) {
    for (long gap = n / 2; gap > 0; gap /= 2) {
        for (long i = gap; i < n; i++) {
            Imagem temp = v[i];
            long j = i;
            while (j >= gap && v[j-gap].timestamp > temp.timestamp) { v[j] = v[j-gap]; j -= gap; }
            v[j] = temp;
        }
    }
}

static void merge(Imagem *v, Imagem *aux, long ini, long meio, long fim) {
    long i = ini, j = meio + 1, k = ini;
    while (i <= meio && j <= fim)
        aux[k++] = (v[i].timestamp <= v[j].timestamp) ? v[i++] : v[j++];
    while (i <= meio) aux[k++] = v[i++];
    while (j <= fim)  aux[k++] = v[j++];
    for (k = ini; k <= fim; k++) v[k] = aux[k];
}
static void merge_rec(Imagem *v, Imagem *aux, long ini, long fim) {
    if (ini >= fim) return;
    long meio = ini + (fim - ini) / 2;
    merge_rec(v, aux, ini, meio);
    merge_rec(v, aux, meio + 1, fim);
    merge(v, aux, ini, meio, fim);
}
void merge_sort(Imagem *v, long n) {
    if (n < 2) return;
    Imagem *aux = (Imagem *) malloc(n * sizeof(Imagem));
    if (!aux) { fprintf(stderr, "Erro: memoria insuficiente (merge).\n"); exit(1); }
    merge_rec(v, aux, 0, n - 1);
    free(aux);
}

/* Quick Sort com mediana de tres (evita pior caso em dados ordenados) */
static long particionar(Imagem *v, long ini, long fim) {
    long meio = ini + (fim - ini) / 2;
    if (v[meio].timestamp < v[ini].timestamp) trocar(&v[meio], &v[ini]);
    if (v[fim].timestamp  < v[ini].timestamp) trocar(&v[fim],  &v[ini]);
    if (v[fim].timestamp  < v[meio].timestamp) trocar(&v[fim], &v[meio]);
    trocar(&v[meio], &v[fim - 1]);
    long pivo = v[fim - 1].timestamp;
    long i = ini, j = fim - 1;
    for (;;) {
        while (v[++i].timestamp < pivo);
        while (v[--j].timestamp > pivo);
        if (i >= j) break;
        trocar(&v[i], &v[j]);
    }
    trocar(&v[i], &v[fim - 1]);
    return i;
}
static void quick_rec(Imagem *v, long ini, long fim) {
    while (fim - ini > 2) {
        long p = particionar(v, ini, fim);
        /* recursao no menor lado, laco no maior: pilha O(log n) */
        if (p - ini < fim - p) { quick_rec(v, ini, p - 1); ini = p + 1; }
        else                   { quick_rec(v, p + 1, fim); fim = p - 1; }
    }
    /* trechos de ate 3 elementos: insercao direta */
    for (long i = ini + 1; i <= fim; i++) {
        Imagem chave = v[i]; long j = i - 1;
        while (j >= ini && v[j].timestamp > chave.timestamp) { v[j+1] = v[j]; j--; }
        v[j+1] = chave;
    }
}
void quick_sort(Imagem *v, long n) { if (n > 1) quick_rec(v, 0, n - 1); }

static void heapify(Imagem *v, long n, long i) {
    for (;;) {
        long maior = i, e = 2*i + 1, d = 2*i + 2;
        if (e < n && v[e].timestamp > v[maior].timestamp) maior = e;
        if (d < n && v[d].timestamp > v[maior].timestamp) maior = d;
        if (maior == i) break;
        trocar(&v[i], &v[maior]);
        i = maior;
    }
}
void heap_sort(Imagem *v, long n) {
    for (long i = n/2 - 1; i >= 0; i--) heapify(v, n, i);
    for (long i = n - 1; i > 0; i--) { trocar(&v[0], &v[i]); heapify(v, i, 0); }
}

typedef void (*FuncaoOrdenacao)(Imagem *, long);
static const char *NOMES[NUM_ALGORITMOS] = {"Bubble Sort","Insertion Sort","Shell Sort","Merge Sort","Quick Sort","Heap Sort"};
static FuncaoOrdenacao FUNCOES[NUM_ALGORITMOS] = {bubble_sort,insertion_sort,shell_sort,merge_sort,quick_sort,heap_sort};

/* ---------- Geracao / aquisicao de dados ---------- */
#define T_BASE 1735689600L /* 01/01/2025 00:00:00 UTC */

static Imagem gerar_imagem(long i) {
    Imagem im;
    im.id = 100000 + i;
    im.timestamp = T_BASE + (long)(((double)rand() / RAND_MAX) * 86400.0 * 30.0);
    im.latitude  = -16.0 + ((double)rand() / RAND_MAX) * 20.0;   /* -16 a +4 */
    im.longitude = -74.0 + ((double)rand() / RAND_MAX) * 30.0;   /* -74 a -44 */
    im.nuvens    = rand() % 101;
    return im;
}

/* cenario: 0 aleatorio, 1 ordenado, 2 inverso, 3 semi-ordenado (90% ordenado) */
Imagem *gerar_dados(long n, int cenario) {
    Imagem *v = (Imagem *) malloc(n * sizeof(Imagem));
    if (!v) { fprintf(stderr, "Erro: memoria insuficiente ao gerar %ld registros.\n", n); exit(1); }
    for (long i = 0; i < n; i++) v[i] = gerar_imagem(i);
    if (cenario == 1 || cenario == 3) {
        quick_sort(v, n);
        if (cenario == 3) { /* perturba 10% das posicoes */
            long k = n / 10;
            for (long t = 0; t < k; t++) {
                long a = rand() % n, b = rand() % n;
                trocar(&v[a], &v[b]);
            }
        }
    } else if (cenario == 2) {
        quick_sort(v, n);
        for (long i = 0; i < n/2; i++) trocar(&v[i], &v[n-1-i]);
    }
    return v;
}

Imagem *ler_arquivo(const char *caminho, long *n) {
    FILE *f = fopen(caminho, "r");
    if (!f) { fprintf(stderr, "Erro: nao foi possivel abrir '%s'.\n", caminho); return NULL; }
    long cap = 1024, cont = 0;
    Imagem *v = (Imagem *) malloc(cap * sizeof(Imagem));
    if (!v) { fprintf(stderr, "Erro: memoria insuficiente.\n"); fclose(f); return NULL; }
    char linha[MAX_LINHA];
    int num_linha = 0;
    while (fgets(linha, sizeof linha, f)) {
        num_linha++;
        if (linha[0] == '#' || linha[0] == '\n') continue; /* comentario/cabecalho */
        Imagem im;
        if (sscanf(linha, "%ld;%ld;%lf;%lf;%d", &im.id, &im.timestamp, &im.latitude, &im.longitude, &im.nuvens) != 5) {
            fprintf(stderr, "Aviso: linha %d ignorada (formato invalido).\n", num_linha);
            continue;
        }
        if (cont == cap) {
            cap *= 2;
            Imagem *novo = (Imagem *) realloc(v, cap * sizeof(Imagem));
            if (!novo) { fprintf(stderr, "Erro: memoria insuficiente.\n"); free(v); fclose(f); return NULL; }
            v = novo;
        }
        v[cont++] = im;
    }
    fclose(f);
    if (cont == 0) { /* nada aproveitavel: mantem os dados anteriores */
        fprintf(stderr, "Nenhum registro valido no arquivo.\n");
        free(v);
        return NULL;
    }
    *n = cont;
    return v;
}

int salvar_arquivo(const char *caminho, const Imagem *v, long n) {
    FILE *f = fopen(caminho, "w");
    if (!f) { fprintf(stderr, "Erro: nao foi possivel criar '%s'.\n", caminho); return 0; }
    fprintf(f, "# id;timestamp;latitude;longitude;nuvens\n");
    for (long i = 0; i < n; i++)
        fprintf(f, "%ld;%ld;%.4f;%.4f;%d\n", v[i].id, v[i].timestamp, v[i].latitude, v[i].longitude, v[i].nuvens);
    fclose(f);
    return 1;
}

Imagem *ler_usuario(long *n) {
    long qtd;
    printf("Quantidade de registros a digitar: ");
    if (scanf("%ld", &qtd) != 1 || qtd < 1 || qtd > MAX_REGISTROS) {
        fprintf(stderr, "Quantidade invalida (entre 1 e %ld).\n", MAX_REGISTROS);
        return NULL;
    }
    Imagem *v = (Imagem *) malloc(qtd * sizeof(Imagem));
    if (!v) { fprintf(stderr, "Erro: memoria insuficiente.\n"); return NULL; }
    for (long i = 0; i < qtd; i++) {
        printf("Registro %ld - id timestamp latitude longitude nuvens: ", i + 1);
        if (scanf("%ld %ld %lf %lf %d", &v[i].id, &v[i].timestamp, &v[i].latitude, &v[i].longitude, &v[i].nuvens) != 5) {
            fprintf(stderr, "Entrada invalida. Abortando.\n"); free(v); return NULL;
        }
    }
    *n = qtd;
    return v;
}

/* ---------- Listagem ---------- */
void listar(const Imagem *v, long n, long limite) {
    long m = (n < limite) ? n : limite;
    printf("%-8s %-12s %-10s %-10s %-6s\n", "ID", "TIMESTAMP", "LAT", "LON", "NUV%");
    for (long i = 0; i < m; i++)
        printf("%-8ld %-12ld %-10.4f %-10.4f %-6d\n", v[i].id, v[i].timestamp, v[i].latitude, v[i].longitude, v[i].nuvens);
    if (n > m) printf("... (%ld registros omitidos)\n", n - m);
}

/* ---------- Medicao ---------- */
double medir(FuncaoOrdenacao f, Imagem *v, long n) {
    clock_t ini = clock();           /* inicio: apenas a ordenacao e cronometrada */
    f(v, n);
    clock_t fim = clock();
    return 1000.0 * (double)(fim - ini) / CLOCKS_PER_SEC;
}

void comparar(const Imagem *base, long n, int mostrar_listas) {
    Resultado res[NUM_ALGORITMOS];
    if (mostrar_listas) { printf("\n--- ANTES DA ORDENACAO ---\n"); listar(base, n, 10); }
    for (int a = 0; a < NUM_ALGORITMOS; a++) {
        Imagem *c = copiar_vetor(base, n);
        strcpy(res[a].nome, NOMES[a]);
        res[a].tempo_ms = medir(FUNCOES[a], c, n);
        if (!esta_ordenado(c, n)) printf("ERRO: %s nao ordenou corretamente!\n", NOMES[a]);
        if (mostrar_listas && a == NUM_ALGORITMOS - 1) { printf("\n--- DEPOIS DA ORDENACAO (%s) ---\n", NOMES[a]); listar(c, n, 10); }
        free(c);
    }
    printf("\n=== RESULTADOS COMPARATIVOS (n = %ld) ===\n", n);
    printf("%-16s %14s\n", "Algoritmo", "Tempo (ms)");
    double melhor = res[0].tempo_ms; int imelhor = 0;
    for (int a = 0; a < NUM_ALGORITMOS; a++) {
        printf("%-16s %14.3f\n", res[a].nome, res[a].tempo_ms);
        if (res[a].tempo_ms < melhor) { melhor = res[a].tempo_ms; imelhor = a; }
    }
    printf("Mais rapido: %s\n", res[imelhor].nome);
}

/* Modo benchmark: gera CSV para a monografia */
void benchmark(const char *saida) {
    long tamanhos[] = {1000, 5000, 10000, 50000, 100000};
    const char *cen[] = {"aleatorio","ordenado","inverso","semi"};
    FILE *f = fopen(saida, "w");
    if (!f) { fprintf(stderr, "Erro ao criar %s\n", saida); return; }
    fprintf(f, "cenario,n,algoritmo,tempo_ms\n");
    for (int c = 0; c < 4; c++) {
        for (unsigned t = 0; t < sizeof tamanhos / sizeof tamanhos[0]; t++) {
            long n = tamanhos[t];
            Imagem *base = gerar_dados(n, c);
            for (int a = 0; a < NUM_ALGORITMOS; a++) {
                double soma = 0; int rep = 3;
                for (int r = 0; r < rep; r++) {
                    Imagem *cp = copiar_vetor(base, n);
                    soma += medir(FUNCOES[a], cp, n);
                    free(cp);
                }
                fprintf(f, "%s,%ld,%s,%.3f\n", cen[c], n, NOMES[a], soma / rep);
                fflush(f);
                printf("%-10s n=%-7ld %-15s %10.3f ms\n", cen[c], n, NOMES[a], soma / rep);
            }
            free(base);
        }
    }
    fclose(f);
    printf("Benchmark salvo em %s\n", saida);
}

/* ---------- Menu ---------- */
/* descarta o resto da linha atual do stdin (para em EOF) */
static void descartar_linha(void) {
    int c;
    while ((c = getchar()) != '\n' && c != EOF);
}

/* retorna -1 em fim de entrada (EOF) */
static long ler_long(const char *msg, long min, long max) {
    long x; char buf[64];
    for (;;) {
        printf("%s", msg);
        if (!fgets(buf, sizeof buf, stdin)) return -1;
        if (!strchr(buf, '\n')) descartar_linha(); /* linha maior que o buffer */
        if (sscanf(buf, "%ld", &x) == 1 && x >= min && x <= max) return x;
        printf("Valor invalido (entre %ld e %ld).\n", min, max);
    }
}

/* le um caminho com fgets (aceita espacos); retorna 0 se vazio, longo demais ou EOF */
static int ler_caminho(const char *msg, char *caminho, size_t tam) {
    printf("%s", msg);
    if (!fgets(caminho, (int) tam, stdin)) return 0;
    if (!strchr(caminho, '\n') && !feof(stdin)) {
        descartar_linha();
        fprintf(stderr, "Caminho muito longo (max %d caracteres).\n", (int) tam - 2);
        return 0;
    }
    caminho[strcspn(caminho, "\r\n")] = '\0';
    if (caminho[0] == '\0') { fprintf(stderr, "Caminho vazio.\n"); return 0; }
    return 1;
}

int main(int argc, char **argv) {
    srand((unsigned) time(NULL));
    if (argc >= 2 && strcmp(argv[1], "--benchmark") == 0) {
        srand(42);
        benchmark(argc >= 3 ? argv[2] : "resultados.csv");
        return 0;
    }
    Imagem *dados = NULL; long n = 0;
    for (;;) {
        printf("\n===== GeoSort - Catalogo de Imagens de Satelite =====\n");
        printf("1) Gerar dados aleatorios\n2) Gerar dados ordenados\n3) Gerar dados inversamente ordenados\n");
        printf("4) Gerar dados semi-ordenados\n5) Carregar de arquivo texto\n6) Digitar dados manualmente\n");
        printf("7) Salvar dados atuais em arquivo\n8) Listar dados atuais\n9) Executar comparacao de ordenacao\n0) Sair\n");
        long op = ler_long("Opcao: ", 0, 9);
        if (op <= 0) break; /* 0 ou EOF */
        /* novos dados so substituem os atuais apos sucesso (sem vazamento) */
        if (op >= 1 && op <= 4) {
            long q = ler_long("Quantidade de registros (1 a 1000000): ", 1, MAX_REGISTROS);
            if (q < 0) break;
            Imagem *v = gerar_dados(q, (int)(op - 1));
            free(dados); dados = v; n = q;
            printf("%ld registros gerados.\n", n);
        } else if (op == 5) {
            char caminho[MAX_CAMINHO];
            if (!ler_caminho("Caminho do arquivo: ", caminho, sizeof caminho)) continue;
            long m = 0; Imagem *v = ler_arquivo(caminho, &m);
            if (v) { free(dados); dados = v; n = m; printf("%ld registros carregados.\n", n); }
        } else if (op == 6) {
            long m = 0; Imagem *v = ler_usuario(&m);
            descartar_linha();
            if (v) { free(dados); dados = v; n = m; }
        } else if (op == 7) {
            if (!dados) { printf("Nenhum dado carregado.\n"); continue; }
            char caminho[MAX_CAMINHO];
            if (!ler_caminho("Nome do arquivo de saida: ", caminho, sizeof caminho)) continue;
            if (salvar_arquivo(caminho, dados, n)) printf("Arquivo salvo.\n");
        } else if (op == 8) {
            if (!dados) { printf("Nenhum dado carregado.\n"); continue; }
            listar(dados, n, 20);
        } else if (op == 9) {
            if (!dados) { printf("Nenhum dado carregado.\n"); continue; }
            comparar(dados, n, 1);
        }
    }
    free(dados);
    printf("Encerrado.\n");
    return 0;
}
