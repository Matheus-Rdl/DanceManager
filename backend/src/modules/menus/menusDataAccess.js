import Menu from "../../models/Menu.js";

export default class MenusDataAccess {

  async getMenus() {
    // Busca ordenando pela propriedade 'order' e retorna como JSON puro
    return await Menu.find({}).sort({ order: 1 }).lean();
  }

  async addMenu(menuData) {
    const menu = new Menu(menuData);
    return await menu.save();
  }

  async deleteMenu(menuId) {
    return await Menu.findByIdAndDelete(menuId);
  }

  async updateMenu(menuId, menuData) {
    return await Menu.findByIdAndUpdate(
      menuId,
      { $set: menuData },
      { new: true } // Retorna o documento já com as alterações
    );
  }
}