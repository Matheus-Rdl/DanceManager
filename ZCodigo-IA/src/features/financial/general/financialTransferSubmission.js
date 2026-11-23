import { validateTransferDraft } from "./financialTransferDraft.js";

/* EN: Use the browser's cryptographic UUID to identify one financial operation.
       A failed or uncertain request will reuse the same key on retry.
   PT: Usa UUID criptográfico do navegador para identificar uma única operação.
       Uma tentativa com falha ou resposta incerta reutiliza a mesma chave. */
export function newTransferOperationKey() {
  const uuid = globalThis.crypto?.randomUUID?.();
  if (typeof uuid !== "string" || !uuid) {
    throw new Error("Não foi possível gerar o identificador seguro da transferência.");
  }
  return `transfer_${uuid}`;
}

/* EN: Keep submission state separate from React so double-click and retry behavior
       can be tested without depending on a browser or a live database.
   PT: Separa o estado de envio do React para testar cliques duplicados e novas
       tentativas sem depender do navegador ou de um banco de dados real. */
export function createTransferSubmission({ send, makeKey = newTransferOperationKey } = {}) {
  if (typeof send !== "function" || typeof makeKey !== "function") {
    throw new TypeError("O envio da transferência exige funções válidas.");
  }
  let key = null;
  let pending = null;
  let completed = false;

  return {
    isPending: () => pending !== null,
    wasSubmitted: () => completed,
    /* EN: Reset the operation only when the user changes the draft or closes a settled dialog.
       PT: Reinicia a operação somente após editar o formulário ou fechar um envio concluído. */
    invalidate() {
      if (pending) return false;
      key = null;
      completed = false;
      return true;
    },
    submit(draft, accounts) {
      if (pending) return pending;
      if (completed) return Promise.reject(new Error("Esta transferência já foi registrada."));

      const validation = validateTransferDraft(draft, accounts);
      if (!validation.valid) {
        return Promise.reject(new Error("Confira os dados da transferência antes de confirmar."));
      }
      try {
        if (!key) key = makeKey();
      } catch (error) {
        return Promise.reject(error);
      }

      /* EN: Match the exact POST /financial-transfers contract; never send derived
             balances, school IDs, timestamps or client-defined status fields.
         PT: Envia somente os campos aceitos pelo POST /financial-transfers; nunca
             envia saldos, escola, datas ou status definidos pelo cliente. */
      const payload = {
        fromAccountId: validation.from.id,
        toAccountId: validation.to.id,
        amount: validation.amount,
        initiatorKey: draft.initiatorKey,
        note: draft.note.trim(),
        idempotencyKey: key
      };
      pending = Promise.resolve().then(() => send(payload)).then(result => {
        if (!result || typeof result.id !== "string" || !result.id) {
          throw new Error("O servidor não confirmou a transferência. Confira o histórico antes de tentar novamente.");
        }
        completed = true;
        return result;
      }).finally(() => { pending = null; });
      return pending;
    }
  };
}
