import mongoose from 'mongoose';

export const Mongo = {
  db: null, // <-- Criamos a propriedade
  async connect({ mongoConnectionString, mongoDbName }) {
    try {
      await mongoose.connect(mongoConnectionString, {
        dbName: mongoDbName
      });
      
      // O Mongoose guarda a conexão nativa aqui. 
      // Ao repassá-la para o this.db, todos os DataAccess antigos voltam a funcionar instantaneamente!
      this.db = mongoose.connection.db; 
      
      return "Connected to mongo!";
    } catch (error) {
      console.error("Erro durante a conexão com o banco de dados!", error);
      throw error;
    }
  }
};