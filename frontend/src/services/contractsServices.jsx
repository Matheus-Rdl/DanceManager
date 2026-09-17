import { useState } from "react";

export default function contractsServices() {

  const [contractsList, setContractsList] = useState([]);
  const [contractsLoading, setContractsLoading] = useState(false);
  const [refetchContracts, setRefetchContracts] = useState(true);

  const url = `${import.meta.env.VITE_API_URL}/contracts`;


  // ============================================================
  // BUSCAR CONTRATOS DO USUÁRIO
  // ============================================================

  const getContractsByUser = async (userId) => {

    setContractsLoading(true);

    try {

      const response = await fetch(
        `${url}/user/${userId}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );


      const result = await response.json();


      if (response.ok) {

        setContractsList(result);

        return result;

      }


      console.log(result);

      return [];

    } catch (error) {

      console.log(error);

      throw error;

    } finally {

      setContractsLoading(false);

      setRefetchContracts(false);

    }

  };


  // ============================================================
  // CRIAR CONTRATO
  // ============================================================

  const addContract = async (contractData) => {

    try {

      const response = await fetch(
        `${url}`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify(
            contractData
          ),
        }
      );


      const result =
        await response.json();


      if (!response.ok) {

        console.log(result);

        return result;

      }


      // Adiciona o contrato criado
      // na lista local do service

      setContractsList((prev) => [
        result.contract,
        ...prev,
      ]);


      return result;

    } catch (error) {

      console.log(error);

      throw error;

    }

  };


  // ============================================================
  // EDITAR CONTRATO
  // ============================================================

  const updateContract = async (
    contractId,
    contractData
  ) => {

    try {

      const response = await fetch(
        `${url}/${contractId}`,
        {
          method: "PATCH",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify(
            contractData
          ),
        }
      );


      const result =
        await response.json();


      if (!response.ok) {

        console.log(result);

        return result;

      }


      // Atualiza o contrato na lista

      setContractsList((prev) =>
        prev.map((contract) =>
          contract.id === contractId
            ? result.contract
            : contract
        )
      );


      return result;

    } catch (error) {

      console.log(error);

      throw error;

    }

  };


  // ============================================================
  // ENCERRAR CONTRATO
  // ============================================================

  const closeContract = async (
    contractId
  ) => {

    try {

      const response = await fetch(
        `${url}/${contractId}/close`,
        {
          method: "PATCH",

          headers: {
            "Content-Type": "application/json",
          },
        }
      );


      const result =
        await response.json();


      if (!response.ok) {

        console.log(result);

        return result;

      }


      // Atualiza o contrato encerrado

      setContractsList((prev) =>
        prev.map((contract) =>
          contract.id === contractId
            ? result.contract
            : contract
        )
      );


      return result;

    } catch (error) {

      console.log(error);

      throw error;

    }

  };


  return {

    getContractsByUser,

    addContract,

    updateContract,

    closeContract,

    contractsList,

    contractsLoading,

    refetchContracts,

  };

}