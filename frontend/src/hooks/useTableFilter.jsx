/*
  Type: Hook
  Name: useTableFilter
  Description:
    Hook responsável por aplicar filtros dinâmicos em listas de dados
    com base na configuração de colunas e valores informados.

    Ele encapsula toda a lógica de filtragem da tabela, permitindo
    reutilização e separação de responsabilidades entre UI e regra de negócio.

  Params:
    data (Array) - lista de dados a ser filtrada
    filters (Object) - valores dos filtros aplicados
    columns (Array) - configuração das colunas (tipo, chave, etc)

  Return:
    Array - lista filtrada

  Author: Matheus Rodrigues
  Date: 20/03/2026
*/

import { useMemo } from "react";

export default function useTableFilter(data, filters, columns) {

  /*
    useMemo:
    Evita que o filtro seja recalculado a cada renderização desnecessária.
    Só recalcula quando:
      - data muda
      - filters muda
      - columns muda
  */
  const filteredData = useMemo(() => {

    /*
      Garante que data nunca seja undefined/null,
      evitando erro ao chamar .filter()
    */
    return (data || []).filter((item) => {

      /*
        every():
        Garante que TODOS os filtros sejam atendidos para o item permanecer na lista.
        Se algum filtro falhar, o item é removido.
      */
      return columns.every((col) => {

        /*
          Recupera:
          - valor do filtro aplicado
          - valor do item correspondente à coluna

          ?? "":
          Evita problemas com null/undefined
        */
        const filterValue = filters[col.dataKey];
        const itemValue = item[col.dataKey] ?? "";

        /*
          Se não há filtro aplicado:
          - retorna true
          - mantém o item na lista
        */
        if (!filterValue || filterValue.length === 0) return true;

        /*
          ========================
          🔽 FILTRO DO TIPO SELECT
          ========================

          Comparação direta (igualdade)

          Trata dois cenários:
          1. Valor simples (string/number)
          2. Array de valores (ex: múltiplos papéis)
        */
        if (col.type === "select") {

          // Se o valor do item for um array
          if (Array.isArray(itemValue)) {

            /*
              Converte todos os valores para string
              para evitar problema de comparação entre number e string
            */
            return itemValue.map(String).includes(String(filterValue));
          }

          // Comparação simples
          return String(itemValue) === String(filterValue);
        }

        /*
          ============================
          🔽 FILTRO DO TIPO MULTISELECT
          ============================

          Permite múltiplas opções selecionadas
        */
        if (col.type === "multiselect") {

          /*
            Garante que filterValue seja um array
            evitando erro ao usar .includes()
          */
          if (!Array.isArray(filterValue)) return true;

          /*
            Verifica se algum valor do item está dentro
            dos valores selecionados no filtro
          */
          return itemValue?.some(v =>
            filterValue.includes(String(v))
          );
        }

        /*
          =====================
          🔽 FILTRO DE DATA
          =====================

          Normaliza a data removendo horário (ISO format)
          Exemplo:
            "2026-03-20T10:00:00" → "2026-03-20"
        */
        if (col.type === "date") {

          const formatted = String(itemValue).split("T")[0];

          /*
            Verifica se a data contém o valor digitado no filtro
          */
          return formatted.includes(filterValue);
        }

        /*
          =========================
          🔽 FILTRO PADRÃO (TEXTO)
          =========================

          - Converte para minúsculo
          - Permite busca parcial (includes)
        */
        return String(itemValue)
          .toLowerCase()
          .includes(String(filterValue).toLowerCase());
      });

    });

  }, [data, filters, columns]);

  /*
    Retorna a lista já filtrada
  */
  return filteredData;
}