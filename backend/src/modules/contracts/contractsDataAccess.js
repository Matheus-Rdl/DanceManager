import Contract from '../../models/Contract.js';

export default class ContractDataAccess {

  // Pega todos os contratos
  async getContracts() {
    return await Contract.find({}).lean();
  }


  // Pega contrato específico
  async getContract(id) {
    return await Contract.findOne({ id }).lean();
  }


  // Pega todos os contratos de um usuário
  async getContractsByUser(userId) {
    return await Contract.find({
      userId
    })
      .sort({ createdAt: -1 })
      .lean();
  }


  // Pega o contrato ativo de um usuário
  async getActiveContract(userId) {
    return await Contract.findOne({
      userId,
      active: true
    }).lean();
  }


  // Adiciona novo contrato
  async addContract(contractData) {

    const newContract =
      new Contract(contractData);

    return await newContract.save();
  }


  // Atualiza um contrato
  async updateContract(id, contractData) {

    return await Contract.findOneAndUpdate(
      { id },

      {
        $set: contractData
      },

      {
        new: true,
        runValidators: true
      }
    );
  }


  // Encerra um contrato
  async closeContract(id, closedAt) {

    return await Contract.findOneAndUpdate(
      {
        id,
        active: true
      },

      {
        $set: {
          active: false,
          closedAt
        }
      },

      {
        new: true,
        runValidators: true
      }
    );
  }


  // Deleta um contrato
  async deleteContract(id) {

    return await Contract.findOneAndDelete({
      id
    });
  }

}